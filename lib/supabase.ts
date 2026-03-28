// lib/supabase.ts — Supabase client for Expo app

import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Use localStorage on web, AsyncStorage on native
// AsyncStorage crashes during SSR/static export on web
function getStorage() {
  if (Platform.OS === "web") {
    return {
      getItem: (key: string) => {
        try {
          return Promise.resolve(localStorage.getItem(key));
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {}
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {}
        return Promise.resolve();
      },
    };
  }
  // Native — lazy import AsyncStorage to avoid SSR issues
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;
  return AsyncStorage;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  stellar_wallet_public: string | null;
  stellar_wallet_secret: string | null;
  created_at: string;
};

export type CartItem = {
  id: string;
  session_id: string | null;
  user_id: string | null;
  token_id: number;
  bag_name: string;
  price: number;
  image: string | null;
  added_at: string;
};
