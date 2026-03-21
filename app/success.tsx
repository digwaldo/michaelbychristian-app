// app/success.tsx
// Stripe redirects here after payment — verifies payment via /api/verify-payment

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
import { BACKEND, C } from "../lib/theme";

const IS_WEB = Platform.OS === "web";

type Status = "loading" | "success" | "transfer_failed" | "error";

export default function SuccessScreen() {
  const { session_id, token_id } = useLocalSearchParams<{
    session_id: string;
    token_id: string;
  }>();

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (session_id) verify();
    else setStatus("error");
  }, [session_id]);

  async function verify() {
    try {
      const res = await fetch(
        `${BACKEND}/api/verify-payment?session_id=${session_id}`,
      );
      const json = await res.json();

      if (!json.paid) {
        setErrorMsg("Payment could not be verified.");
        setStatus("error");
        return;
      }

      setData(json);
      setStatus(json.transferFailed ? "transfer_failed" : "success");
    } catch (e: any) {
      setErrorMsg(e.message || "Connection error.");
      setStatus("error");
    }
  }

  const short = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

  const openExplorer = () => {
    const url =
      "https://stellar.expert/explorer/testnet/contract/CB7GCGWAHWCF3SAJTYCR7JEFINLJBKA3LV7BZNAI46OXYPYZSTFZ6EMB";
    if (IS_WEB) window.open(url, "_blank");
    else Linking.openURL(url);
  };

  // ── Loading ──
  if (status === "loading")
    return (
      <View style={s.screen}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.loadTxt}>Confirming your order...</Text>
      </View>
    );

  // ── Error ──
  if (status === "error")
    return (
      <View style={s.screen}>
        <View style={s.iconError}>
          <Text style={s.iconTxt}>✕</Text>
        </View>
        <Text style={s.eyebrow}>Michael By Christian</Text>
        <Text style={s.title}>Could Not{"\n"}Verify Order</Text>
        <Text style={s.bodyTxt}>
          {errorMsg ||
            "Could not verify your order. If you completed a purchase your payment is safe — please contact support."}
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

  // ── Transfer failed — paid but NFT not transferred yet ──
  if (status === "transfer_failed")
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.card}>
            <View style={s.iconError}>
              <Text style={s.iconTxt}>⚠</Text>
            </View>
            <Text style={s.eyebrow}>Michael By Christian</Text>
            <Text style={s.title}>Payment Received —{"\n"}Transfer Issue</Text>
            <Text style={s.bodyTxt}>
              Your card was charged successfully, but we encountered an issue
              transferring your NFT.{" "}
              <Text style={{ color: C.cream, fontWeight: "600" }}>
                You have not lost your money.
              </Text>{" "}
              We will resolve this and contact you within 24 hours.
            </Text>
            <View style={s.errorBox}>
              <Text style={s.errorBoxTitle}>What happened</Text>
              <Text style={s.errorBoxMsg}>
                {data?.transferError ||
                  "The NFT transfer could not be completed at this time."}
              </Text>
            </View>
            <View style={s.detailBox}>
              {[
                ["Piece", data?.pieceName || `MBC Token #${token_id}`],
                [
                  "Amount Charged",
                  data?.amount ? `$${(data.amount / 100).toFixed(0)} USD` : "—",
                ],
                ["Email", data?.buyerEmail || "—"],
                ["Status", "Transfer Pending"],
              ].map(([k, v]) => (
                <View key={k} style={s.detailRow}>
                  <Text style={s.detailKey}>{k}</Text>
                  <Text
                    style={[s.detailVal, k === "Status" && { color: C.red }]}
                  >
                    {v}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() =>
                Linking.openURL(
                  `mailto:youngcompltd@gmail.com?subject=MBC Order Issue - Token ${token_id}`,
                )
              }
            >
              <Text style={s.btnPrimaryTxt}>Contact Support Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => router.replace("/")}
            >
              <Text style={s.btnSecondaryTxt}>← Back to MBC</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );

  // ── Success ──
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={s.iconSuccess}>
            <Text style={s.iconTxt}>✓</Text>
          </View>
          <Text style={s.eyebrow}>Michael By Christian</Text>
          <Text style={s.title}>
            You now own{"\n"}
            <Text style={s.titleEm}>{data?.pieceName || "an MBC piece"}</Text>
          </Text>
          <Text style={s.bodyTxt}>
            Your NFT has been transferred to your Stellar wallet. A confirmation
            email is on its way.
          </Text>

          <View style={s.detailBox}>
            {[
              ["Piece", data?.pieceName || "—"],
              ["Token ID", `#${data?.tokenId || token_id}`],
              ["Wallet", short(data?.buyerWallet)],
              ["Blockchain", "Stellar · Soroban"],
              [
                "Amount Paid",
                data?.amount ? `$${(data.amount / 100).toFixed(0)} USD` : "—",
              ],
            ].map(([k, v]) => (
              <View key={k} style={s.detailRow}>
                <Text style={s.detailKey}>{k}</Text>
                <Text style={[s.detailVal, { color: C.goldLt }]}>{v}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.btnPrimary} onPress={openExplorer}>
            <Text style={s.btnPrimaryTxt}>View on Stellar Explorer ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btnSecondary}
            onPress={() => router.replace("/")}
          >
            <Text style={s.btnSecondaryTxt}>← Back to MBC</Text>
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
  iconError: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(192,97,74,0.15)",
    borderWidth: 1,
    borderColor: C.red,
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

  errorBox: {
    width: "100%",
    backgroundColor: "rgba(192,97,74,0.08)",
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.3)",
    padding: 16,
    marginBottom: 20,
  },
  errorBoxTitle: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.red,
    marginBottom: 8,
  },
  errorBoxMsg: { fontSize: 12, color: C.muted, lineHeight: 18 },

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
