// app/success.tsx — Stripe redirects here after payment
// Verifies payment + clears cart

import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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
type Status = "loading" | "success" | "error";

export default function SuccessScreen() {
  const { session_id, token_id, token_ids } = useLocalSearchParams<{
    session_id: string;
    token_id: string;
    token_ids: string;
  }>();
  const { clearCart } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (session_id) verify();
    else setStatus("error");
  }, [session_id]);

  async function verify() {
    try {
      const verifyUrl = IS_WEB
        ? `/api/verify-payment?session_id=${session_id}`
        : `${BACKEND}/api/verify-payment?session_id=${session_id}`;
      const res = await fetch(verifyUrl);
      const json = await res.json();
      if (!json.paid) {
        setErrorMsg("Payment could not be verified.");
        setStatus("error");
        return;
      }
      setData(json);
      setStatus("success");
      // ── Clear cart after successful payment ──
      await clearCart();
    } catch (e: any) {
      setErrorMsg(e.message || "Connection error.");
      setStatus("error");
    }
  }

  const short = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

  if (status === "loading")
    return (
      <View style={s.screen}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.loadTxt}>Confirming your order...</Text>
      </View>
    );

  if (status === "error")
    return (
      <View style={s.screen}>
        <Text style={s.eyebrow}>Michael By Christian</Text>
        <Text style={s.title}>Could Not Verify Order</Text>
        <Text style={s.bodyTxt}>
          {errorMsg ||
            "If you completed a purchase, your payment is safe. Please contact support."}
        </Text>
        <TouchableOpacity
          style={s.btnPrimary}
          onPress={() => Linking.openURL("mailto:youngcompltd@gmail.com")}
        >
          <Text style={s.btnPrimaryTxt}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnSecondary}
          onPress={() => router.replace("/")}
        >
          <Text style={s.btnSecondaryTxt}>← Back to MBC</Text>
        </TouchableOpacity>
      </View>
    );

  // Multiple tokens purchased
  const tokenList = token_ids
    ? decodeURIComponent(token_ids).split(",")
    : token_id
      ? [token_id]
      : [];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={s.iconSuccess}>
            <Text style={s.iconTxt}>✓</Text>
          </View>
          <Text style={s.eyebrow}>Michael By Christian</Text>
          <Text style={s.title}>
            {tokenList.length > 1
              ? `${tokenList.length} Pieces Secured`
              : `You now own\n`}
            {tokenList.length === 1 && (
              <Text style={s.titleEm}>{data?.pieceName || "an MBC piece"}</Text>
            )}
          </Text>
          <Text style={s.bodyTxt}>
            {tokenList.length > 1
              ? `Your ${tokenList.length} NFTs have been queued for delivery. A confirmation email is on its way.`
              : "Your NFT has been transferred to your Stellar wallet. A confirmation email is on its way."}
          </Text>

          <View style={s.detailBox}>
            {tokenList.length > 1 ? (
              <>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Pieces</Text>
                  <Text style={[s.detailVal, { color: C.goldLt }]}>
                    {tokenList.length} items
                  </Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Token IDs</Text>
                  <Text style={[s.detailVal, { color: C.goldLt }]}>
                    #{tokenList.join(", #")}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Piece</Text>
                  <Text style={[s.detailVal, { color: C.goldLt }]}>
                    {data?.pieceName || "—"}
                  </Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Token ID</Text>
                  <Text style={[s.detailVal, { color: C.goldLt }]}>
                    #{data?.tokenId || token_id}
                  </Text>
                </View>
              </>
            )}
            <View style={s.detailRow}>
              <Text style={s.detailKey}>Amount Paid</Text>
              <Text style={[s.detailVal, { color: C.goldLt }]}>
                {data?.amount ? `$${(data.amount / 100).toFixed(0)} USD` : "—"}
              </Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailKey}>Blockchain</Text>
              <Text style={[s.detailVal, { color: C.goldLt }]}>
                Stellar · Soroban
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => router.replace("/collection" as any)}
          >
            <Text style={s.btnPrimaryTxt}>Continue Browsing →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btnSecondary}
            onPress={() => router.replace("/profile" as any)}
          >
            <Text style={s.btnSecondaryTxt}>View My Pieces</Text>
          </TouchableOpacity>
          <Text style={s.supportNote}>
            Your physical bag will be shipped once we receive your address.
            {"\n"}
            Questions?{" "}
            <Text
              style={{ color: C.gold }}
              onPress={() => Linking.openURL("mailto:youngcompltd@gmail.com")}
            >
              youngcompltd@gmail.com
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  screen: {
    flex: 1,
    backgroundColor: C.black,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 40,
    alignItems: "center",
  },
  iconSuccess: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(91,175,133,0.15)",
    borderWidth: 1,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconTxt: { fontSize: 26, color: C.cream },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 12,
  },
  title: {
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "900",
    color: C.cream,
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 16,
  },
  titleEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  bodyTxt: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  loadTxt: {
    marginTop: 16,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.muted,
  },
  detailBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.warm,
  },
  detailKey: { fontSize: 10, color: C.muted, letterSpacing: 0.5 },
  detailVal: {
    fontSize: 11,
    color: C.cream,
    fontFamily: "monospace",
    maxWidth: "60%",
    textAlign: "right",
  },
  btnPrimary: {
    width: "100%",
    backgroundColor: C.gold,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  btnPrimaryTxt: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.black,
  },
  btnSecondary: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  btnSecondaryTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  supportNote: {
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
