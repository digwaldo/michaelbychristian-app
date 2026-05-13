// app/_layout.tsx — Root layout (main branch)

import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="rarity" />
        <Stack.Screen name="fragrance" />
        <Stack.Screen name="fragrance/[id]" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="atelier" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
  );
}
