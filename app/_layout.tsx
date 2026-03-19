// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { C } from "../lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={C.black} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.black },
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="collection" options={{ headerShown: false }} />
        <Stack.Screen name="piece/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="checkout"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
