// app/cart.tsx — Shopping cart screen

import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { BACKEND, C } from "../lib/theme";

const IS_WEB = Platform.OS === "web";

export default function CartScreen() {
  const { cart, removeFromCart, clearCart, cartTotal, session, profile } =
    useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const formatPrice = (p: number) => (p ? `$${Number(p).toFixed(0)}` : "—");

  async function checkout() {
    if (!cart.length) return;
    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      // Create checkout session with multiple items
      const res = await fetch(`${BACKEND}/api/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            tokenId: String(i.token_id),
            name: i.bag_name,
            price: i.price,
            image: i.image,
          })),
          buyerWallet: profile?.stellar_wallet_public || null,
          successUrl: IS_WEB
            ? `${window.location.origin}/success`
            : `${BACKEND}/success`,
          cancelUrl: IS_WEB
            ? `${window.location.origin}/cart`
            : `${BACKEND}/cart`,
        }),
      });

      const json = await res.json();

      if (json.url) {
        if (IS_WEB) window.location.href = json.url;
        else {
          const { Linking } = await import("react-native");
          await Linking.openURL(json.url);
        }
      } else {
        setCheckoutError(
          json.error || "Could not start checkout. Please try again.",
        );
      }
    } catch (e: any) {
      setCheckoutError(e.message || "Network error.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.topBar}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.topEye}>Your Cart</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={s.clearTxt}>Clear</Text>
            </TouchableOpacity>
          )}
          {cart.length === 0 && <View style={{ width: 40 }} />}
        </View>
      </SafeAreaView>

      {cart.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>👜</Text>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySub}>
            Browse the collection and add pieces you love.
          </Text>
          <TouchableOpacity
            style={s.browseBtn}
            onPress={() => router.push("/collection" as any)}
          >
            <Text style={s.browseBtnTxt}>Browse Collection →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.items}>
              {cart.map((item) => (
                <View key={item.token_id} style={s.item}>
                  <View style={s.itemImg}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={s.itemImgPlaceholder}>👜</Text>
                    )}
                  </View>
                  <View style={s.itemInfo}>
                    <Text style={s.itemName} numberOfLines={2}>
                      {item.bag_name}
                    </Text>
                    <Text style={s.itemToken}>Token #{item.token_id}</Text>
                    <Text style={s.itemPrice}>
                      {formatPrice(item.price)} USD
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => removeFromCart(item.token_id)}
                  >
                    <Text style={s.removeTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Order summary */}
            <View style={s.summary}>
              <Text style={s.summaryLbl}>Order Summary</Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>
                  {cart.length} {cart.length === 1 ? "piece" : "pieces"}
                </Text>
                <Text style={s.summaryVal}>{formatPrice(cartTotal)} USD</Text>
              </View>
              <View style={[s.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={s.summaryKey}>Shipping</Text>
                <Text style={s.summaryVal}>Collected at checkout</Text>
              </View>
            </View>

            {!session && (
              <View style={s.loginNudge}>
                <Text style={s.loginNudgeTxt}>
                  <Text style={{ color: C.cream, fontWeight: "600" }}>
                    Sign in
                  </Text>{" "}
                  to save your cart and wallet across devices.
                </Text>
                <TouchableOpacity onPress={() => router.push("/auth" as any)}>
                  <Text style={s.loginNudgeLink}>
                    Sign In / Create Account →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Sticky checkout bar */}
          <SafeAreaView edges={["bottom"]} style={s.checkoutBar}>
            <View style={s.checkoutInner}>
              <View>
                <Text style={s.checkoutTotal}>{formatPrice(cartTotal)}</Text>
                <Text style={s.checkoutTotalLbl}>
                  USD · {cart.length} {cart.length === 1 ? "piece" : "pieces"}
                </Text>
              </View>
              {checkoutError ? (
                <Text style={s.checkoutError}>{checkoutError}</Text>
              ) : null}
              <TouchableOpacity
                style={[s.checkoutBtn, checkoutLoading && { opacity: 0.7 }]}
                onPress={checkout}
                disabled={checkoutLoading}
                activeOpacity={0.85}
              >
                {checkoutLoading ? (
                  <ActivityIndicator color={C.black} size="small" />
                ) : (
                  <Text style={s.checkoutBtnTxt}>Checkout →</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  topBar: {
    backgroundColor: C.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backTxt: { fontSize: 11, color: C.muted },
  topEye: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    fontWeight: "600",
  },
  clearTxt: { fontSize: 11, color: C.red },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  browseBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
  items: { padding: 16, gap: 12 },
  item: {
    flexDirection: "row",
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  itemImg: {
    width: 80,
    height: 80,
    backgroundColor: C.warm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImgPlaceholder: { fontSize: 28 },
  itemInfo: { flex: 1, padding: 12 },
  itemName: {
    fontFamily: "serif",
    fontSize: 13,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 4,
  },
  itemToken: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 4,
  },
  itemPrice: { fontSize: 14, fontWeight: "700", color: C.goldLt },
  removeBtn: { padding: 12, justifyContent: "center" },
  removeTxt: { fontSize: 14, color: C.muted },
  summary: {
    margin: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.charcoal,
    overflow: "hidden",
  },
  summaryLbl: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryKey: { fontSize: 12, color: C.muted },
  summaryVal: { fontSize: 12, color: C.cream },
  loginNudge: {
    margin: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.charcoal,
  },
  loginNudgeTxt: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 8,
    lineHeight: 18,
  },
  loginNudgeLink: { fontSize: 11, color: C.gold, letterSpacing: 0.5 },
  checkoutBar: {
    backgroundColor: C.charcoal,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  checkoutInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  checkoutTotal: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
    color: C.goldLt,
  },
  checkoutTotalLbl: { fontSize: 9, color: C.muted, letterSpacing: 1 },
  checkoutError: { fontSize: 11, color: C.red, flex: 1, marginHorizontal: 12 },
  checkoutBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  checkoutBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
});
