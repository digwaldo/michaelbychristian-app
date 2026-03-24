// app/auth/callback.tsx
// Supabase redirects here after Google OAuth on web
// Exchanges the code for a session then redirects to profile

import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { C } from "../../lib/theme";

export default function AuthCallback() {
  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("OAuth callback error:", error.message);
        router.replace("/auth" as any);
        return;
      }

      if (session) {
        router.replace("/profile" as any);
      } else {
        // Give Supabase a moment to process URL params
        setTimeout(async () => {
          const {
            data: { session: s },
          } = await supabase.auth.getSession();
          router.replace(s ? "/profile" : ("/auth" as any));
        }, 1500);
      }
    } catch (e) {
      console.error("Callback error:", e);
      router.replace("/auth" as any);
    }
  }

  return (
    <View style={s.root}>
      <ActivityIndicator color={C.gold} size="large" />
      <Text style={s.txt}>Signing you in...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.black,
    alignItems: "center",
    justifyContent: "center",
  },
  txt: {
    marginTop: 16,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.muted,
  },
});
