// app/_layout.tsx — Staging layout
// All routes enabled for testing

import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="rarity" />
        <Stack.Screen name="collection" />
        <Stack.Screen name="piece/[id]" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="success" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}
