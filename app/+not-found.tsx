// app/+not-found.tsx
// Redirects all unmatched routes back to home for production

import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { C } from "../lib/theme";

export default function NotFound() {
  useEffect(() => {
    router.replace("/");
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.black,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={C.gold} />
    </View>
  );
}
