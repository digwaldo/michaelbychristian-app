// app/piece/[id].tsx — NFT Detail + Direct Stripe Checkout
// Reads token data directly from Stellar contract
// Calls /api/create-checkout directly — same as the HTML buyNFT() function

import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BACKEND,
  C,
  CONTRACT,
  EXPLORER,
  PASSPHRASE,
  RPC_URL,
} from "../../lib/theme";

const { width } = Dimensions.get("window");
const IS_WEB = Platform.OS === "web";
const MAX_W = IS_WEB ? 760 : undefined;

// ── Direct Stellar read ───────────────────────────────────────
async function loadTokenFromStellar(tokenId: number) {
  const Sdk = await import("@stellar/stellar-sdk" as any);
  const server = new Sdk.rpc.Server(RPC_URL);
  const contract = new Sdk.Contract(CONTRACT);
  const keypair = Sdk.Keypair.random();
  const account = new Sdk.Account(keypair.publicKey(), "0");

  async function simulate(fn: string, args: any[] = []) {
    const tx = new Sdk.TransactionBuilder(account, {
      fee: Sdk.BASE_FEE,
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(contract.call(fn, ...args))
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (!Sdk.rpc.Api.isSimulationSuccess(sim))
      throw new Error("Simulation failed");
    return Sdk.scValToNative(sim.result.retval);
  }

  const [raw, owner] = await Promise.all([
    simulate("token_data", [Sdk.nativeToScVal(tokenId, { type: "u64" })]),
    simulate("owner_of", [Sdk.nativeToScVal(tokenId, { type: "u64" })]).catch(
      () => null,
    ),
  ]);

  const t = raw.traits || {};
  return {
    data: {
      name: raw.name || `MBC Token #${tokenId}`,
      image: raw.image || "",
      price_usdc: raw.price_usdc ? Number(raw.price_usdc) : 0,
      listed: raw.listed !== false,
      silhouette: t.silhouette || raw.silhouette || "",
      model: t.model || raw.model || "",
      edition_type: t.edition_type || raw.edition_type || "",
      primary_color: t.primary_color || raw.primary_color || "",
      secondary_color: t.secondary_color || raw.secondary_color || "",
      primary_texture: t.primary_texture || raw.primary_texture || "",
      secondary_texture: t.secondary_texture || raw.secondary_texture || "",
      textured_pattern: t.textured_pattern || raw.textured_pattern || "",
      hardware: t.hardware || raw.hardware || "",
      interior_lining: t.interior_lining || raw.interior_lining || "",
      dimensions: t.dimensions || raw.dimensions || "",
      authentication: t.authentication || raw.authentication || "",
      serial_number: t.serial_number || raw.serial_number || "",
      nfc_chip_id: t.nfc_chip_id || raw.nfc_chip_id || "",
      collection: t.collection || raw.collection || "",
      collaboration: t.collaboration || raw.collaboration || "",
      trait_rarity: t.trait_rarity || raw.trait_rarity || "",
      design_status: t.design_status || raw.design_status || "",
      archive_status: t.archive_status || raw.archive_status || "",
      tailored_year: Number(t.tailored_year || raw.tailored_year || 0),
      design_year: Number(t.design_year || raw.design_year || 0),
    },
    owner: owner || null,
  };
}

function resolveImg(img: string): string {
  if (!img) return "";
  if (img.startsWith("ipfs://"))
    return img.replace("ipfs://", "https://ipfs.io/ipfs/");
  return img;
}

const TRAITS: [string, string][] = [
  ["silhouette", "Silhouette"],
  ["model", "Model"],
  ["edition_type", "Edition"],
  ["primary_color", "Primary Color"],
  ["secondary_color", "Secondary Color"],
  ["primary_texture", "Primary Texture"],
  ["secondary_texture", "Secondary Texture"],
  ["textured_pattern", "Pattern"],
  ["hardware", "Hardware"],
  ["interior_lining", "Interior Lining"],
  ["dimensions", "Dimensions"],
  ["authentication", "Authentication"],
  ["serial_number", "Serial Number"],
  ["nfc_chip_id", "NFC Chip ID"],
  ["collection", "Collection"],
  ["collaboration", "Collaboration"],
  ["trait_rarity", "Rarity"],
  ["design_status", "Design Status"],
  ["archive_status", "Archive Status"],
  ["tailored_year", "Tailored Year"],
  ["design_year", "Design Year"],
];

type BuyStep = "idle" | "checking" | "redirecting" | "unavailable" | "error";

// ── Component ─────────────────────────────────────────────────
export default function PieceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tokenId = Number(id);

  const [data, setData] = useState<any | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);
  const [buyStep, setBuyStep] = useState<BuyStep>("idle");
  const [buyError, setBuyError] = useState("");

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, [tokenId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await loadTokenFromStellar(tokenId);
      setData(res.data);
      setOwner(res.owner);
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Buy — mirrors the HTML buyNFT() exactly ───────────────
  async function buyNFT() {
    setBuyStep("checking");
    setBuyError("");
    try {
      const res = await fetch(`${BACKEND}/api/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: String(tokenId),
          buyerWallet: "",
          successUrl: IS_WEB
            ? `${window.location.origin}/success.html`
            : `${BACKEND}/success.html`,
          cancelUrl: IS_WEB ? window.location.href : `${BACKEND}/`,
        }),
      });

      const data = await res.json();

      if (data.url) {
        setBuyStep("redirecting");
        if (IS_WEB) {
          // Web — redirect directly like the HTML version
          window.location.href = data.url;
        } else {
          // Native — open Stripe in browser
          await Linking.openURL(data.url);
          setBuyStep("idle");
        }
      } else if (data.unavailable) {
        setBuyStep("unavailable");
        setBuyError(
          "This piece is no longer available. No charge has been made.",
        );
      } else {
        setBuyStep("error");
        setBuyError(data.error || "Could not open checkout. Please try again.");
      }
    } catch (e: any) {
      setBuyStep("error");
      setBuyError(e.message || "Network error. Please try again.");
    }
  }

  const imgUrl = data ? resolveImg(data.image) : "";
  const price = data?.price_usdc
    ? `$${(data.price_usdc / 100).toFixed(0)}`
    : "—";
  const init = (data?.name || "MB")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const short = (a: string) => (a ? `${a.slice(0, 8)}...${a.slice(-6)}` : "—");

  const buyLabel = {
    idle: `Purchase This Piece  —  ${price}`,
    checking: "Checking availability...",
    redirecting: "Redirecting to Stripe...",
    unavailable: "No Longer Available",
    error: "Try Again",
  }[buyStep];

  const buyDisabled =
    buyStep === "checking" ||
    buyStep === "redirecting" ||
    buyStep === "unavailable";

  // ── Loading / Error screens ────────────────────────────────
  if (loading)
    return (
      <View style={s.screen}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.loadTxt}>Loading piece...</Text>
      </View>
    );

  if (error || !data)
    return (
      <View style={s.screen}>
        <Text style={s.errTitle}>Could not load piece</Text>
        <Text style={s.errSub}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={load}>
          <Text style={s.retryTxt}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        >
          <Text style={s.backLink}>← Back to Collection</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={s.root}>
      {/* ── Top bar — same as collection nav ── */}
      <SafeAreaView edges={["top"]} style={s.topBar}>
        <View
          style={[
            s.topBarInner,
            MAX_W
              ? { maxWidth: MAX_W, alignSelf: "center" as const, width: "100%" }
              : {},
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backTxt}>← Collection</Text>
          </TouchableOpacity>
          <View style={s.topBarCenter}>
            <Text style={s.topEye}>Michael By Christian</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>
      </SafeAreaView>

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero image ── */}
        <View
          style={[
            s.imgWrap,
            IS_WEB && {
              maxWidth: MAX_W,
              alignSelf: "center" as const,
              width: "100%",
            },
          ]}
        >
          {imgUrl && !imgErr ? (
            <Image
              source={{ uri: imgUrl }}
              style={s.img}
              resizeMode="cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <View style={s.imgPlaceholder}>
              <Text style={s.imgInit}>{init}</Text>
            </View>
          )}
          <View style={s.imgOverlay} />
          <View style={s.tokenBadge}>
            <Text style={s.tokenBadgeTxt}>Token #{tokenId}</Text>
          </View>
          {data.nfc_chip_id ? (
            <View style={s.nfcBadge}>
              <Text style={s.nfcBadgeTxt}>✦ NFC Verified</Text>
            </View>
          ) : null}
          {data.listed ? (
            <View style={s.listedBadge}>
              <Text style={s.listedBadgeTxt}>Listed</Text>
            </View>
          ) : (
            <View style={s.soldBadge}>
              <Text style={s.soldBadgeTxt}>Sold</Text>
            </View>
          )}
        </View>

        {/* ── Main content ── */}
        <View
          style={[
            s.content,
            IS_WEB && {
              maxWidth: MAX_W,
              alignSelf: "center" as const,
              width: "100%",
            },
          ]}
        >
          {/* Title + price */}
          <View style={s.titleRow}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={s.eyebrow}>
                MBC · {data.collection || "Collection 2026"}
              </Text>
              <Text style={s.pieceTitle}>{data.name}</Text>
              {data.silhouette ? (
                <Text style={s.pieceSub}>
                  {data.silhouette}
                  {data.edition_type ? `  ·  ${data.edition_type}` : ""}
                </Text>
              ) : null}
            </View>
            <View style={s.priceBox}>
              <Text style={s.priceVal}>{price}</Text>
              <Text style={s.priceLbl}>USD</Text>
            </View>
          </View>

          {/* Trait chips */}
          <View style={s.chips}>
            {[
              data.trait_rarity,
              data.primary_texture,
              data.hardware,
              data.nfc_chip_id && "NFC Embedded",
            ]
              .filter(Boolean)
              .map((v: string, i: number) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipTxt}>{v}</Text>
                </View>
              ))}
          </View>

          {/* ── BUY BUTTON — main CTA ── */}
          {data.listed ? (
            <>
              <TouchableOpacity
                style={[s.buyBtn, buyDisabled && s.buyBtnDisabled]}
                onPress={buyNFT}
                disabled={buyDisabled}
                activeOpacity={0.85}
              >
                {buyStep === "checking" || buyStep === "redirecting" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <ActivityIndicator color={C.black} size="small" />
                    <Text style={s.buyBtnTxt}>{buyLabel}</Text>
                  </View>
                ) : (
                  <Text style={s.buyBtnTxt}>{buyLabel}</Text>
                )}
              </TouchableOpacity>

              {/* Error / unavailable message */}
              {(buyStep === "error" || buyStep === "unavailable") && (
                <View
                  style={[
                    s.buyErrorBox,
                    buyStep === "unavailable" && s.buyErrorBoxWarn,
                  ]}
                >
                  <Text
                    style={[
                      s.buyErrorTxt,
                      buyStep === "unavailable" && { color: C.gold },
                    ]}
                  >
                    {buyError}
                  </Text>
                  {buyStep === "error" && (
                    <TouchableOpacity onPress={() => setBuyStep("idle")}>
                      <Text style={s.buyErrorReset}>Dismiss</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text style={s.buyNote}>
                💳 Card · 🍎 Apple Pay · G Google Pay{"\n"}
                No wallet needed · NFT delivered instantly on-chain
              </Text>
            </>
          ) : (
            <View style={s.soldBtn}>
              <Text style={s.soldBtnTxt}>This Piece Has Been Sold</Text>
            </View>
          )}

          <View style={s.rule} />

          {/* ── Traits & Details ── */}
          <Text style={s.sectionLbl}>Traits & Details</Text>
          <View style={s.traitsBox}>
            {TRAITS.map(([key, label]) => {
              const val = data[key];
              if (!val || val === "" || val === 0) return null;
              return (
                <View key={key} style={s.traitRow}>
                  <Text style={s.traitKey}>{label}</Text>
                  <Text style={s.traitVal}>{String(val)}</Text>
                </View>
              );
            })}
          </View>

          <View style={s.rule} />

          {/* ── Blockchain proof ── */}
          <Text style={s.sectionLbl}>On-Chain Proof</Text>
          <View style={s.chainBox}>
            {[
              { k: "Contract", v: short(CONTRACT), mono: true },
              { k: "Token ID", v: `#${tokenId}`, gold: true },
              { k: "Standard", v: "Soroban NFT", mono: false },
              { k: "Network", v: "Stellar · Testnet", gold: true },
              { k: "Owner", v: owner ? short(owner) : "Checking…", mono: true },
            ].map(({ k, v, gold, mono }) => (
              <View key={k} style={s.chainRow}>
                <Text style={s.chainKey}>{k}</Text>
                <Text
                  style={[
                    s.chainVal,
                    gold && { color: C.goldLt },
                    mono && { fontFamily: "monospace" },
                  ]}
                >
                  {v}
                </Text>
              </View>
            ))}
          </View>

          {/* Explorer link */}
          <TouchableOpacity
            style={s.explorerBtn}
            activeOpacity={0.8}
            onPress={() => {
              const url = `${EXPLORER}/contract/${CONTRACT}`;
              if (IS_WEB) window.open(url, "_blank");
              else Linking.openURL(url);
            }}
          >
            <Text style={s.explorerBtnTxt}>View on Stellar Explorer ↗</Text>
          </TouchableOpacity>

          <View style={{ height: data.listed ? 100 : 48 }} />
        </View>
      </Animated.ScrollView>

      {/* ── Sticky buy bar — always visible ── */}
      {data.listed && (
        <View style={s.stickyBar}>
          <SafeAreaView edges={["bottom"]}>
            <View
              style={[
                s.stickyInner,
                IS_WEB && {
                  maxWidth: MAX_W,
                  alignSelf: "center" as const,
                  width: "100%",
                },
              ]}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={s.stickyName} numberOfLines={1}>
                  {data.name}
                </Text>
                <Text style={s.stickyPrice}>{price} USD</Text>
              </View>
              <TouchableOpacity
                style={[s.stickyBtn, buyDisabled && s.stickyBtnDisabled]}
                onPress={buyNFT}
                disabled={buyDisabled}
                activeOpacity={0.85}
              >
                {buyStep === "checking" || buyStep === "redirecting" ? (
                  <ActivityIndicator color={C.black} size="small" />
                ) : (
                  <Text style={s.stickyBtnTxt}>
                    {buyStep === "unavailable" ? "Unavailable" : "Buy Now"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const IMG_H = IS_WEB ? 480 : width;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  screen: {
    flex: 1,
    backgroundColor: C.black,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadTxt: {
    marginTop: 14,
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.muted,
  },
  errTitle: {
    fontSize: 16,
    color: C.cream,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errSub: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
  },
  backLink: { fontSize: 12, color: C.muted },

  // Top bar
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
  backBtn: { width: 80 },
  backTxt: { fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  topBarCenter: { flex: 1, alignItems: "center" },
  topEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
  },

  // Image
  imgWrap: {
    width: "100%",
    height: IMG_H,
    backgroundColor: C.warm,
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  imgInit: {
    fontFamily: "serif",
    fontSize: 80,
    fontWeight: "900",
    color: "rgba(184,150,62,0.1)",
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12,11,9,0.15)",
  },
  tokenBadge: {
    position: "absolute",
    bottom: 14,
    left: 16,
    backgroundColor: "rgba(12,11,9,0.88)",
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tokenBadgeTxt: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
  },
  nfcBadge: {
    position: "absolute",
    bottom: 14,
    right: 16,
    backgroundColor: "rgba(91,175,133,0.15)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nfcBadgeTxt: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.green,
  },
  listedBadge: {
    position: "absolute",
    top: 14,
    right: 16,
    backgroundColor: "rgba(91,175,133,0.2)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listedBadgeTxt: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.green,
  },
  soldBadge: {
    position: "absolute",
    top: 14,
    right: 16,
    backgroundColor: "rgba(192,97,74,0.2)",
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  soldBadgeTxt: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.red,
  },

  // Content
  content: { backgroundColor: C.black, paddingHorizontal: 24, paddingTop: 28 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 8,
  },
  pieceTitle: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "900",
    color: C.cream,
    lineHeight: 30,
    marginBottom: 6,
  },
  pieceSub: { fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  priceBox: { alignItems: "flex-end" },
  priceVal: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    color: C.goldLt,
  },
  priceLbl: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 2,
  },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 24 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTxt: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },

  // Buy button
  buyBtn: {
    backgroundColor: C.gold,
    padding: 18,
    alignItems: "center",
    marginBottom: 10,
  },
  buyBtnDisabled: { backgroundColor: C.muted, opacity: 0.7 },
  buyBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.black,
  },

  buyErrorBox: {
    backgroundColor: "rgba(192,97,74,0.1)",
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.35)",
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buyErrorBoxWarn: {
    backgroundColor: "rgba(184,150,62,0.08)",
    borderColor: C.border,
  },
  buyErrorTxt: { fontSize: 12, color: C.red, flex: 1, lineHeight: 18 },
  buyErrorReset: { fontSize: 10, color: C.muted, marginLeft: 12 },

  buyNote: {
    fontSize: 10,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  soldBtn: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    alignItems: "center",
    marginBottom: 10,
  },
  soldBtnTxt: {
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.muted,
  },

  rule: { height: 1, backgroundColor: C.border, marginVertical: 28 },
  sectionLbl: {
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 16,
    fontWeight: "600",
  },

  traitsBox: {
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  traitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.charcoal,
  },
  traitKey: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
    flex: 1,
  },
  traitVal: {
    fontSize: 12,
    color: C.cream,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },

  chainBox: {
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    backgroundColor: C.charcoal,
    marginBottom: 16,
  },
  chainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  chainKey: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
  },
  chainVal: { fontSize: 11, color: C.cream },

  explorerBtn: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  explorerBtnTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },

  stickyBar: {
    backgroundColor: C.charcoal,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  stickyInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stickyName: { fontSize: 13, fontWeight: "600", color: C.cream },
  stickyPrice: { fontSize: 11, color: C.goldLt, marginTop: 2 },
  stickyBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  stickyBtnDisabled: { backgroundColor: C.muted },
  stickyBtnTxt: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
});
