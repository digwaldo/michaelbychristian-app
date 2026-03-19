// app/checkout.tsx — MBC Checkout
// Web: redirects to Stripe hosted page
// Native: opens Stripe in WebView
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createCheckout, formatPrice } from "../lib/api";
import { BACKEND, C } from "../lib/theme";

// WebView only imported on native — web uses window.location
let WebView: any = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

type Step = "form" | "loading" | "stripe" | "success" | "error";

export default function CheckoutScreen() {
  const { id, name, price } = useLocalSearchParams<{
    id: string;
    name: string;
    price: string;
  }>();
  const tokenId = Number(id);
  const priceStr = formatPrice(Number(price));

  const [step, setStep] = useState<Step>("form");
  const [wallet, setWallet] = useState("");
  const [walletErr, setWalletErr] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [webLoading, setWebLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  function validateWallet(w: string): string {
    if (!w) return "";
    if (!w.startsWith("G")) return "Stellar addresses start with G";
    if (w.length !== 56) return `Must be 56 characters (${w.length} entered)`;
    return "";
  }

  async function proceed() {
    const err = validateWallet(wallet);
    if (err) {
      setWalletErr(err);
      return;
    }
    setStep("loading");
    try {
      const result = await createCheckout(tokenId, wallet || undefined);
      if (result.url) {
        if (Platform.OS === "web") {
          // Web — navigate directly to Stripe
          window.location.href = result.url;
          return;
        }
        // Native — open in WebView
        setCheckoutUrl(result.url);
        setStep("stripe");
      } else if (result.unavailable) {
        setErrorMsg(
          "This piece is no longer available. No charge has been made to your card.",
        );
        setStep("error");
      } else {
        setErrorMsg(
          result.error || "Could not start checkout. Please try again.",
        );
        setStep("error");
      }
    } catch (e: any) {
      setErrorMsg(
        e.message ||
          "Network error. Please check your connection and try again.",
      );
      setStep("error");
    }
  }

  function onWebNav(nav: { url: string }) {
    const url = nav.url;
    if (url.includes("success.html") || url.includes("session_id=")) {
      setStep("success");
      return;
    }
    if (url.includes(BACKEND) && !url.includes("success")) {
      router.back();
    }
  }

  // ── FORM ──────────────────────────────────────────────
  if (step === "form")
    return (
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.cancelTxt}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Purchase</Text>
            <View style={{ width: 64 }} />
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Piece summary card */}
            <View style={s.summaryCard}>
              <Text style={s.summaryEye}>You are buying</Text>
              <Text style={s.summaryName} numberOfLines={3}>
                {name}
              </Text>
              <View style={s.divider} />
              {[
                { k: "Token ID", v: `#${tokenId}` },
                { k: "Price", v: `${priceStr} USD`, gold: true },
                { k: "Blockchain", v: "Stellar · Soroban" },
                { k: "Delivery", v: "Instant on-chain" },
              ].map(({ k, v, gold }) => (
                <View key={k} style={s.summaryRow}>
                  <Text style={s.summaryKey}>{k}</Text>
                  <Text style={[s.summaryVal, gold && { color: C.goldLt }]}>
                    {v}
                  </Text>
                </View>
              ))}
            </View>

            {/* Wallet input */}
            <View style={s.fieldSection}>
              <Text style={s.fieldLabel}>
                Your Stellar Wallet{" "}
                <Text style={s.fieldOptional}>(optional)</Text>
              </Text>
              <Text style={s.fieldHint}>
                Enter your wallet address to receive the NFT directly. Leave
                blank and we'll create a wallet for you — keys sent by email.
              </Text>
              <TextInput
                style={[s.textInput, walletErr ? s.textInputErr : null]}
                value={wallet}
                onChangeText={(w) => {
                  setWallet(w);
                  setWalletErr("");
                }}
                placeholder="G... Stellar address (56 characters)"
                placeholderTextColor={C.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onBlur={() => {
                  if (wallet) setWalletErr(validateWallet(wallet));
                }}
              />
              {walletErr ? (
                <Text style={s.fieldErrTxt}>{walletErr}</Text>
              ) : null}
            </View>

            {/* What happens next */}
            <View style={s.infoCard}>
              <Text style={s.infoEye}>What happens next</Text>
              {[
                "Availability verified on Stellar — no charge if already sold",
                "Secure payment processed by Stripe",
                "NFT transferred to your wallet instantly on-chain",
                "Confirmation email with blockchain proof and wallet keys",
                "Physical bag shipped to your address",
              ].map((item, i) => (
                <View key={i} style={s.infoRow}>
                  <Text style={s.infoDot}>✦</Text>
                  <Text style={s.infoTxt}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Pay button */}
            <TouchableOpacity
              style={[s.payBtn, !!walletErr && s.payBtnOff]}
              onPress={proceed}
              disabled={!!walletErr}
              activeOpacity={0.85}
            >
              <Text style={s.payBtnTxt}>Continue to Payment — {priceStr}</Text>
            </TouchableOpacity>

            {/* Payment methods */}
            <View style={s.payMethodsRow}>
              {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map(
                (p) => (
                  <View key={p} style={s.payMethodChip}>
                    <Text style={s.payMethodTxt}>{p}</Text>
                  </View>
                ),
              )}
            </View>

            <Text style={s.secureNote}>
              🔒 Secured by Stripe · We never see or store your card details
            </Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );

  // ── LOADING ──────────────────────────────────────────
  if (step === "loading")
    return (
      <View style={s.centerScreen}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.loadTitle}>Checking availability...</Text>
        <Text style={s.loadSub}>Verifying on Stellar blockchain</Text>
      </View>
    );

  // ── STRIPE WEBVIEW (native only) ─────────────────────
  if (step === "stripe" && WebView)
    return (
      <View style={s.root}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: C.charcoal }}>
          <View style={s.webHeader}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.cancelTxt}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Secure Checkout</Text>
            {webLoading ? (
              <ActivityIndicator
                color={C.gold}
                size="small"
                style={{ width: 64 }}
              />
            ) : (
              <View style={{ width: 64 }} />
            )}
          </View>
          <View style={s.lockBar}>
            <Text style={s.lockTxt}>🔒 Secured by Stripe</Text>
          </View>
        </SafeAreaView>
        <WebView
          source={{ uri: checkoutUrl }}
          onLoadEnd={() => setWebLoading(false)}
          onNavigationStateChange={onWebNav}
          javaScriptEnabled
          domStorageEnabled
          style={s.webview}
        />
      </View>
    );

  // ── SUCCESS ──────────────────────────────────────────
  if (step === "success")
    return (
      <SafeAreaView style={s.centerScreen} edges={["top", "bottom"]}>
        <View
          style={[
            s.statusIcon,
            { backgroundColor: "rgba(91,175,133,0.12)", borderColor: C.green },
          ]}
        >
          <Text style={[s.statusIconTxt, { color: C.green }]}>✓</Text>
        </View>
        <Text style={s.statusEye}>Michael By Christian</Text>
        <Text style={s.statusH1}>You now own</Text>
        <Text style={s.statusPiece}>{name}</Text>
        <Text style={s.statusBody}>
          Your NFT has been transferred to your Stellar wallet. A confirmation
          email is on its way with your blockchain proof.
        </Text>
        <TouchableOpacity
          style={s.btnGold}
          onPress={() => router.replace("/profile")}
        >
          <Text style={s.btnGoldTxt}>View My Collection →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnBorder}
          onPress={() => router.replace("/")}
        >
          <Text style={s.btnBorderTxt}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  // ── ERROR ─────────────────────────────────────────────
  return (
    <SafeAreaView style={s.centerScreen} edges={["top", "bottom"]}>
      <View
        style={[
          s.statusIcon,
          { backgroundColor: "rgba(192,97,74,0.12)", borderColor: C.red },
        ]}
      >
        <Text style={[s.statusIconTxt, { color: C.red }]}>✕</Text>
      </View>
      <Text style={s.statusH1}>Purchase Unavailable</Text>
      <Text style={s.statusBody}>{errorMsg}</Text>
      <Text style={s.noCharge}>No charge has been made to your card.</Text>
      <TouchableOpacity style={s.btnGold} onPress={() => router.back()}>
        <Text style={s.btnGoldTxt}>← Back to Piece</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={s.btnBorder}
        onPress={() => router.replace("/collection")}
      >
        <Text style={s.btnBorderTxt}>Browse Collection</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const MAX = Platform.OS === "web" ? 560 : undefined;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    ...(MAX
      ? { maxWidth: MAX, alignSelf: "center" as const, width: "100%" }
      : {}),
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: C.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cancelTxt: { fontSize: 12, color: C.muted, width: 64 },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.cream,
    letterSpacing: 0.5,
  },

  // Summary card
  summaryCard: {
    margin: 20,
    padding: 20,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryEye: {
    fontSize: 7,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 8,
  },
  summaryName: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "900",
    color: C.cream,
    lineHeight: 26,
    marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 4 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryKey: { fontSize: 11, color: C.muted },
  summaryVal: { fontSize: 12, color: C.cream, fontWeight: "500" },

  // Wallet field
  fieldSection: { marginHorizontal: 20, marginBottom: 20 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.cream,
    marginBottom: 6,
  },
  fieldOptional: { fontWeight: "300", color: C.muted, fontSize: 12 },
  fieldHint: { fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 12 },
  textInput: {
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    color: C.cream,
    padding: 14,
    fontSize: 12,
    fontFamily: "monospace",
  },
  textInputErr: { borderColor: C.red },
  fieldErrTxt: { fontSize: 11, color: C.red, marginTop: 6 },

  // Info card
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 18,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoEye: {
    fontSize: 7,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  infoDot: { fontSize: 9, color: C.gold, marginTop: 2 },
  infoTxt: { fontSize: 12, color: C.muted, flex: 1, lineHeight: 18 },

  // Pay button
  payBtn: {
    marginHorizontal: 20,
    backgroundColor: C.gold,
    padding: 18,
    alignItems: "center",
  },
  payBtnOff: { opacity: 0.4 },
  payBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },

  payMethodsRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    marginHorizontal: 20,
  },
  payMethodChip: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  payMethodTxt: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  secureNote: {
    fontSize: 10,
    color: C.muted,
    textAlign: "center",
    marginTop: 12,
    marginHorizontal: 20,
  },

  // Center screen (loading / success / error)
  centerScreen: {
    flex: 1,
    backgroundColor: C.black,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadTitle: {
    marginTop: 16,
    fontSize: 15,
    color: C.cream,
    fontWeight: "500",
    textAlign: "center",
  },
  loadSub: { marginTop: 8, fontSize: 11, color: C.muted, textAlign: "center" },

  // WebView (native)
  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  lockBar: {
    paddingVertical: 7,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  lockTxt: { fontSize: 10, color: C.green, letterSpacing: 1 },
  webview: { flex: 1 },

  // Status screens
  statusIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 24,
  },
  statusIconTxt: { fontSize: 30 },
  statusEye: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 10,
  },
  statusH1: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "900",
    color: C.cream,
    textAlign: "center",
  },
  statusPiece: {
    fontFamily: "serif",
    fontSize: 22,
    fontStyle: "italic",
    fontWeight: "400",
    color: C.goldLt,
    textAlign: "center",
    marginBottom: 18,
  },
  statusBody: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
    maxWidth: 300,
  },
  noCharge: {
    fontSize: 12,
    color: C.green,
    textAlign: "center",
    marginBottom: 28,
    fontWeight: "600",
  },
  btnGold: {
    backgroundColor: C.gold,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  btnGoldTxt: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.black,
  },
  btnBorder: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  btnBorderTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
});
