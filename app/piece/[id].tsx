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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ADMIN_WALLET,
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
    simulate("full_token_data", [Sdk.nativeToScVal(tokenId, { type: "u64" })]),
    simulate("owner_of", [Sdk.nativeToScVal(tokenId, { type: "u64" })]).catch(
      () => null,
    ),
  ]);

  // New contract returns fields flat — no traits wrapper
  // Old contract had traits nested — support both
  const t = raw.traits || raw || {};
  function f(key: string) {
    return t[key] || raw?.[key] || "";
  }
  return {
    data: {
      // Identity
      name: raw.name || `MBC Token #${tokenId}`,
      model: f("model"),
      designer: f("designer"),
      image: raw.image || "",
      price: raw.price ? Number(raw.price) : 0,
      listed: raw.listed !== false, // true = still with admin = available
      // Edition
      edition_run: f("edition_run"),
      edition_number: f("edition_number"),
      edition_total: f("edition_total"),
      serial_number: f("serial_number"),
      collection: f("collection"),
      collaboration: f("collaboration"),
      tailored_year: f("tailored_year"),
      design_year: f("design_year"),
      // Silhouette & structure
      silhouette: f("silhouette"),
      closure_type: f("closure_type"),
      strap_type: f("strap_type"),
      capacity: f("capacity"),
      dimensions: f("dimensions"),
      // Materials
      primary_color: f("primary_color"),
      secondary_color: f("secondary_color"),
      primary_texture: f("primary_texture"),
      secondary_texture: f("secondary_texture"),
      textured_pattern: f("textured_pattern"),
      hardware: f("hardware"),
      interior_lining: f("interior_lining"),
      finishing: f("finishing"),
      // Provenance
      origin_country: f("origin_country"),
      manufacture_country: f("manufacture_country"),
      authentication: f("authentication"),
      // Legacy / removed fields (kept for backwards compat with old tokens)
      edition_type: f("edition_type"),
      nfc_chip_id: f("nfc_chip_id"),
      // Status
      design_status: f("design_status"),
      archive_status: f("archive_status"),
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

// Grouped trait sections for display
const TRAIT_GROUPS: { label: string; traits: [string, string][] }[] = [
  {
    label: "Identity",
    traits: [
      ["model", "Model / Silhouette Line"],
      ["designer", "Designer"],
      ["serial_number", "Serial Number"],
      ["collection", "Collection"],
      ["collaboration", "Collaboration"],
      ["tailored_year", "Year Tailored"],
      ["design_year", "Year Designed"],
    ],
  },
  {
    label: "Edition",
    traits: [
      ["edition_run", "Production Run"],
      ["edition_number", "Edition Number"],
      ["edition_total", "Edition Total"],
    ],
  },
  {
    label: "Construction",
    traits: [
      ["silhouette", "Silhouette"],
      ["closure_type", "Closure"],
      ["strap_type", "Strap"],
      ["capacity", "Capacity"],
      ["dimensions", "Dimensions"],
      ["finishing", "Finishing"],
    ],
  },
  {
    label: "Materials",
    traits: [
      ["primary_texture", "Primary Texture"],
      ["secondary_texture", "Secondary Texture"],
      ["primary_color", "Primary Color"],
      ["secondary_color", "Secondary Color"],
      ["textured_pattern", "Pattern"],
      ["hardware", "Hardware"],
      ["interior_lining", "Interior Lining"],
    ],
  },
  {
    label: "Provenance",
    traits: [
      ["origin_country", "Designed In"],
      ["manufacture_country", "Made In"],
      ["authentication", "Authentication"],
      ["design_status", "Status"],
      ["archive_status", "Archive"],
    ],
  },
];

// Flat list for backwards compat
const TRAITS: [string, string][] = TRAIT_GROUPS.flatMap((g) => g.traits);

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
      // Cross-reference on-chain owner with listed flag
      // If owner is not admin wallet → token has been transferred = sold
      const onChainSold =
        res.owner && res.owner.toUpperCase() !== ADMIN_WALLET.toUpperCase();
      setData({
        ...res.data,
        listed: onChainSold ? false : res.data.listed,
      });
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
      const res = await fetch(
        IS_WEB ? `/api/create-checkout` : `${BACKEND}/api/create-checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId: String(tokenId),
            buyerWallet: "",
            successUrl: IS_WEB
              ? `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&token_id=${tokenId}`
              : `${BACKEND}/success?session_id={CHECKOUT_SESSION_ID}&token_id=${tokenId}`,
            cancelUrl: IS_WEB
              ? window.location.href
              : `${BACKEND}/piece/${tokenId}`,
          }),
        },
      );

      const data = await res.json();

      if (data.url) {
        setBuyStep("redirecting");
        if (IS_WEB) {
          window.location.href = data.url;
        } else {
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
  const price = data?.price ? `${Number(data.price).toFixed(0)}` : "—";
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

  // ── Loading / Error screens ───────────────────────────────
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
      {/* ── Top bar ── */}
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
              resizeMode="contain"
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
                {data.model ? `${data.model}  ·  ` : "MBC · "}
                {data.collection || "Collection 2026"}
              </Text>
              <Text style={s.pieceTitle}>{data.name}</Text>
              <Text style={s.pieceSub}>
                {[data.silhouette, data.tailored_year]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
              {data.edition_run || data.edition_number ? (
                <Text style={[s.pieceSub, { color: C.gold, marginTop: 3 }]}>
                  {data.edition_run ? `Edition ${data.edition_run}` : ""}
                  {data.edition_number && data.edition_total
                    ? `  ·  ${data.edition_number} of ${data.edition_total}`
                    : ""}
                </Text>
              ) : null}
              {data.serial_number ? (
                <Text
                  style={[
                    s.pieceSub,
                    { fontFamily: "monospace", marginTop: 3, fontSize: 9 },
                  ]}
                >
                  {data.serial_number}
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
              data.primary_texture,
              data.hardware,
              data.closure_type,
              data.strap_type,
              data.finishing,
              data.capacity && `${data.capacity} Capacity`,
              data.authentication && "NFC Embedded",
            ]
              .filter(Boolean)
              .map((v: string, i: number) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipTxt}>{v}</Text>
                </View>
              ))}
          </View>

          {/* ── BUY BUTTON ── */}
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

          {/* ── Traits & Details — grouped ── */}
          <Text style={s.sectionLbl}>Traits & Details</Text>
          {TRAIT_GROUPS.map((group) => {
            const visibleTraits = group.traits.filter(([key]) => {
              const val = (data as any)[key];
              return val && String(val).trim() !== "" && val !== 0;
            });
            if (visibleTraits.length === 0) return null;
            return (
              <View key={group.label} style={{ marginBottom: 16 }}>
                <Text style={s.traitGroupLbl}>{group.label}</Text>
                <View style={s.traitsBox}>
                  {visibleTraits.map(([key, label]) => (
                    <View key={key} style={s.traitRow}>
                      <Text style={s.traitKey}>{label}</Text>
                      <Text style={s.traitVal}>
                        {String((data as any)[key])}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          <View style={s.rule} />

          {/* ── On-Chain Proof ── */}
          <Text style={s.sectionLbl}>On-Chain Proof</Text>
          <View style={s.chainBox}>
            {[
              {
                k: "Contract",
                v: short(CONTRACT),
                mono: true,
                link: `${EXPLORER}/contract/${CONTRACT}`,
              },
              { k: "Token ID", v: `#${tokenId}`, gold: true, link: null },
              { k: "Standard", v: "Soroban NFT", mono: false, link: null },
              {
                k: "Network",
                v:
                  process.env.EXPO_PUBLIC_NETWORK === "MAINNET"
                    ? "Stellar · Mainnet"
                    : "Stellar · Testnet",
                gold: true,
                link: null,
              },
              {
                k: "Owner",
                v: owner ? short(owner) : "Checking…",
                mono: true,
                link: owner ? `${EXPLORER}/account/${owner}` : null,
              },
            ].map(({ k, v, gold, mono, link }) => (
              <TouchableOpacity
                key={k}
                style={s.chainRow}
                disabled={!link}
                onPress={() => {
                  if (!link) return;
                  if (IS_WEB) window.open(link, "_blank");
                  else Linking.openURL(link);
                }}
                activeOpacity={link ? 0.7 : 1}
              >
                <Text style={s.chainKey}>{k}</Text>
                <Text
                  style={[
                    s.chainVal,
                    gold && { color: C.goldLt },
                    mono && { fontFamily: "monospace" },
                    link && { color: C.gold, textDecorationLine: "underline" },
                  ]}
                >
                  {v}
                  {link ? " ↗" : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: data.listed ? 100 : 48 }} />
        </View>
      </Animated.ScrollView>

      {/* ── Sticky buy bar ── */}
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

  imgWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: C.warm,
    overflow: "hidden",
    maxHeight: IS_WEB ? 520 : width,
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

  traitGroupLbl: {
    fontSize: 7,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 6,
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
