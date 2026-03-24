// context/AuthContext.tsx
// Global auth + cart state — wrap your app with this

import { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { CartItem, Profile, supabase } from "../lib/supabase";
import { BACKEND } from "../lib/theme";

const GUEST_SESSION_KEY = "mbc_guest_session";

// Platform-safe storage — localStorage on web, AsyncStorage on native
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  const AS = require("@react-native-async-storage/async-storage").default;
  return AS.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  const AS = require("@react-native-async-storage/async-storage").default;
  return AS.setItem(key, value);
}

// Generate or retrieve guest session ID
async function getGuestSessionId(): Promise<string> {
  let id = await storageGet(GUEST_SESSION_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await storageSet(GUEST_SESSION_KEY, id);
  }
  return id;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  cart: CartItem[];
  loading: boolean;
  guestSessionId: string | null;
  // Auth
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  // Cart
  addToCart: (
    item: Omit<CartItem, "id" | "session_id" | "user_id" | "added_at">,
  ) => Promise<void>;
  removeFromCart: (tokenId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (tokenId: number) => boolean;
  cartTotal: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  useEffect(() => {
    init();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (guestSessionId || session) loadCart();
  }, [guestSessionId, session]);

  async function init() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
    if (session?.user) await loadProfile(session.user.id);
    const gid = await getGuestSessionId();
    setGuestSessionId(gid);
    setLoading(false);
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data);
      // Auto-create wallet if user doesn't have one yet
      if (!data.stellar_wallet_public) {
        try {
          await fetch(`${BACKEND}/api/wallet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          });
          // Reload profile to get wallet
          const { data: updated } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          if (updated) setProfile(updated);
        } catch (e) {
          console.log("Wallet auto-create failed:", e);
        }
      }
    }
  }

  async function loadCart() {
    let query = supabase.from("cart_items").select("*").order("added_at");
    if (session?.user) {
      query = query.eq("user_id", session.user.id);
    } else if (guestSessionId) {
      query = query.eq("session_id", guestSessionId);
    }
    const { data } = await query;
    if (data) setCart(data);
  }

  // ── Auth ──────────────────────────────────────────────────────
  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  async function signUpWithEmail(
    email: string,
    password: string,
    name: string,
  ) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (!error) {
      // Migrate guest cart to user after signup
      if (guestSessionId) await migrateGuestCart();
      // Auto-create Stellar wallet for new user
      // We do this after a short delay to let the profile trigger run first
      setTimeout(async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await fetch(`${BACKEND}/api/wallet`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: user.id }),
            });
            await loadProfile(user.id);
          }
        } catch (e) {
          console.log("Wallet create failed:", e);
        }
      }, 1500);
    }
    return { error };
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          Platform.OS === "web"
            ? `${window.location.origin}/auth/callback`
            : "michaelbychristian://auth/callback",
      },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setCart([]);
  }

  // ── Cart ──────────────────────────────────────────────────────
  async function addToCart(
    item: Omit<CartItem, "id" | "session_id" | "user_id" | "added_at">,
  ) {
    // Check not already in cart
    if (isInCart(item.token_id)) return;

    const row = {
      ...item,
      user_id: session?.user?.id || null,
      session_id: session?.user ? null : guestSessionId,
    };

    const { data } = await supabase
      .from("cart_items")
      .insert(row)
      .select()
      .single();
    if (data) setCart((prev) => [...prev, data]);
  }

  async function removeFromCart(tokenId: number) {
    let query = supabase.from("cart_items").delete().eq("token_id", tokenId);
    if (session?.user) query = query.eq("user_id", session.user.id);
    else if (guestSessionId) query = query.eq("session_id", guestSessionId);
    await query;
    setCart((prev) => prev.filter((i) => i.token_id !== tokenId));
  }

  async function clearCart() {
    let query = supabase.from("cart_items").delete();
    if (session?.user) query = query.eq("user_id", session.user.id);
    else if (guestSessionId) query = query.eq("session_id", guestSessionId);
    await query;
    setCart([]);
  }

  async function migrateGuestCart() {
    if (!guestSessionId || !session?.user) return;
    await supabase
      .from("cart_items")
      .update({ user_id: session.user.id, session_id: null })
      .eq("session_id", guestSessionId);
    await loadCart();
  }

  function isInCart(tokenId: number) {
    return cart.some((i) => i.token_id === tokenId);
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price_usdc, 0);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        cart,
        loading,
        guestSessionId,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        cartTotal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
