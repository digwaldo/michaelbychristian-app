// components/CartIcon.tsx
// Cart icon with badge count — used in all nav bars

import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { C } from "../lib/theme";

export function CartIcon() {
  const { cart } = useAuth();
  const count = cart.length;

  return (
    <TouchableOpacity
      style={s.wrap}
      onPress={() => router.push("/cart" as any)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={s.icon}>👜</Text>
      {count > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { position: "relative", padding: 2 },
  icon: { fontSize: 18 },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: C.gold,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeTxt: { fontSize: 9, fontWeight: "700", color: C.black },
});
