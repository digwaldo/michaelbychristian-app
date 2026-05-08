// context/AuthContext.tsx — Auth provider (main branch)
// Supabase auth: email/password + Google OAuth

import { Session, User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface Profile {
  id: string;
  email: string;
  name: string | null;
  stellar_wallet_public: string | null;
  created_at: string;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await loadProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.log("Profile load error:", error.message);
      }
      setProfile(data ?? null);
    } catch (e) {
      console.log("Profile load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Sign in failed" };
    }
  }

  async function signUpWithEmail(
    email: string,
    password: string,
    name: string,
  ) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { error: error.message };

      // Create profile row
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email: email.toLowerCase(),
          name: name.trim(),
          stellar_wallet_public: null,
          created_at: new Date().toISOString(),
        });
        if (profileError)
          console.log("Profile create error:", profileError.message);
      }

      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Sign up failed" };
    }
  }

  async function signInWithGoogle() {
    try {
      const isWeb = Platform.OS === "web";

      if (isWeb) {
        // Web: use full page redirect — Supabase handles the callback
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/profile`,
          },
        });
        if (error) return { error: error.message };
        return { error: null };
      }

      // Native: use WebBrowser flow
      const redirectTo = makeRedirectUri({ scheme: "michaelbychristian" });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) return { error: error.message };
      if (!data.url) return { error: "No OAuth URL returned" };

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type === "success" && result.url) {
        const params = new URL(result.url);
        const accessToken =
          params.searchParams.get("access_token") ??
          result.url.match(/access_token=([^&]+)/)?.[1];
        const refreshToken =
          params.searchParams.get("refresh_token") ??
          result.url.match(/refresh_token=([^&]+)/)?.[1];
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }

      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Google sign in failed" };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    router.replace("/" as any);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
