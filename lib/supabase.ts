// lib/supabase.ts — Supabase client for Expo app

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
  price_usdc: number;
  image: string | null;
  added_at: string;
};
