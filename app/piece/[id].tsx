// app/piece/[id].tsx
// Reads bag data from Stellar + sale/claim state from KV
// States: listed (buy now) | sold_unclaimed (claim NFT) | sold_claimed (ownership view)

import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartIcon } from "../../components/CartIcon";
import { useAuth } from "../../context/AuthContext";
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

// ── Stellar read ──────────────────────────────────────────────
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

  const tokenArg = Sdk.nativeToScVal(tokenId, { type: "u64" });

  const [raw, ownerRaw] = await Promise.all([
    simulate("full_token_data", [tokenArg]),
    simulate("owner_of", [tokenArg]).catch(() => null),
  ]);

  // Support both old contract (nested traits) and new contract (flat fields)
  const t = raw.traits || raw || {};
  function f(key: string) {
    return t[key] || raw?.[key] || "";
  }

  const owner = ownerRaw ? String(ownerRaw).trim() : null;
  const ownedByAdmin =
    !owner || owner.toUpperCase() === ADMIN_WALLET.toUpperCase();

  return {
    data: {
      name: raw.name || `MBC Token #${tokenId}`,
      model: f("model"),
      designer: f("designer"),
      image: raw.image || "",
      price: raw.price ? Number(raw.price) : 0,
      listed: raw.listed !== false,
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
      nfc_chip_id: f("nfc_chip_id"),
      // Status
      design_status: f("design_status"),
      archive_status: f("archive_status"),
      // Legacy
      edition_type: f("edition_type"),
    },
    owner: owner || null,
    ownedByAdmin,
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
      ["name", "Name"],
      ["model", "Model"],
      ["designer", "Designer"],
      ["silhouette", "Silhouette"],
      ["collection", "Collection"],
      ["collaboration", "Collaboration"],
      ["edition_type", "Edition Type"],
    ],
  },
  {
    label: "Edition",
    traits: [
      ["edition_run", "Edition Run"],
      ["edition_number", "Edition No."],
      ["edition_total", "Edition Total"],
      ["serial_number", "Serial Number"],
      ["tailored_year", "Tailored Year"],
      ["design_year", "Design Year"],
    ],
  },
  {
    label: "Construction",
    traits: [
      ["closure_type", "Closure"],
      ["strap_type", "Strap"],
      ["capacity", "Capacity"],
      ["dimensions", "Dimensions"],
    ],
  },
  {
    label: "Materials",
    traits: [
      ["primary_color", "Primary Color"],
      ["secondary_color", "Secondary Color"],
      ["primary_texture", "Primary Texture"],
      ["secondary_texture", "Secondary Texture"],
      ["textured_pattern", "Pattern"],
      ["hardware", "Hardware"],
      ["interior_lining", "Interior Lining"],
      ["finishing", "Finishing"],
    ],
  },
  {
    label: "Provenance",
    traits: [
      ["origin_country", "Origin Country"],
      ["manufacture_country", "Made In"],
      ["authentication", "Authentication"],
      ["nfc_chip_id", "NFC Chip ID"],
      ["design_status", "Design Status"],
      ["archive_status", "Archive Status"],
    ],
  },
];

type BuyStep = "idle" | "checking" | "redirecting" | "unavailable" | "error";
type ClaimStep = "idle" | "submitting" | "success" | "error";
type PageState =
  | "loading"
  | "listed"
  | "sold_unclaimed"
  | "sold_claimed"
  | "error";

export default function PieceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tokenId = Number(id);
  const { session, addToCart, isInCart, profile, cart } = useAuth();

  const [data, setData] = useState<any | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [saleData, setSaleData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);

  // Buy state
  const [buyStep, setBuyStep] = useState<BuyStep>("idle");
  const [buyError, setBuyError] = useState("");

  // Claim state
  const [claimStep, setClaimStep] = useState<ClaimStep>("idle");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimWallet, setClaimWallet] = useState("");
  const [claimResult, setClaimResult] = useState<any | null>(null);
  const [claimError, setClaimError] = useState("");

  // Offer modal
  const [offerVisible, setOfferVisible] = useState(false);

  // XLM gain + rarity
  const [gainPercent, setGainPercent] = useState<number | null>(null);
  const [rarityData, setRarityData] = useState<any | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, [tokenId]);

  // Auto-fill email + wallet if logged in
  useEffect(() => {
    if (session?.user?.email && !claimEmail) setClaimEmail(session.user.email);
    if (profile?.stellar_wallet_public && !claimWallet)
      setClaimWallet(profile.stellar_wallet_public);
  }, [session, profile]);

  async function load() {
    setPageState("loading");
    setError(null);
    try {
      const apiBase = IS_WEB ? "" : BACKEND;
      const [tokenRes, soldRes, gainsRes, rarityRes] = await Promise.all([
        loadTokenFromStellar(tokenId),
        fetch(`${apiBase}/api/sold?type=check&token_id=${tokenId}`)
          .then((r) => r.json())
          .catch(() => ({ sold: false })),
        fetch(`${apiBase}/api/sold?type=gains`)
          .then((r) => r.json())
          .catch(() => null),
        fetch(`${apiBase}/api/rarity?type=token&token_id=${tokenId}`)
          .then((r) => r.json())
          .catch(() => null),
      ]);

      if (gainsRes?.gains?.[tokenId]) setGainPercent(gainsRes.gains[tokenId]);
      if (rarityRes?.found) setRarityData(rarityRes);

      // Cross-reference on-chain owner with ADMIN_WALLET for sold detection
      const onChainSold =
        tokenRes.owner &&
        tokenRes.owner.toUpperCase() !== ADMIN_WALLET.toUpperCase();
      const tokenData = {
        ...tokenRes.data,
        listed: onChainSold ? false : tokenRes.data.listed,
      };

      setData(tokenData);
      setOwner(tokenRes.owner);
      setSaleData(soldRes);

      if (!soldRes.sold && !onChainSold) {
        setPageState("listed");
      } else {
        const onChainClaimed =
          !!tokenRes.owner &&
          tokenRes.owner.toUpperCase() !== ADMIN_WALLET.toUpperCase();
        if (soldRes.claimed || onChainClaimed) {
          if (!soldRes.claimed && onChainClaimed) {
            setSaleData((prev: any) => ({
              ...prev,
              claimed: true,
              buyerWallet: tokenRes.owner,
            }));
          }
          setPageState("sold_claimed");
        } else {
          setPageState("sold_unclaimed");
        }
      }

      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (e: any) {
      setError(e.message);
      setPageState("error");
    }
  }

  // ── Buy ───────────────────────────────────────────────────────
  async function buyNFT() {
    setBuyStep("checking");
    setBuyError("");
    try {
      const checkoutUrl = IS_WEB
        ? `/api/create-checkout`
        : `${BACKEND}/api/create-checkout`;
      const res = await fetch(checkoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: String(tokenId),
          successUrl: IS_WEB
            ? `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&token_id=${tokenId}`
            : `${BACKEND}/success?session_id={CHECKOUT_SESSION_ID}&token_id=${tokenId}`,
          cancelUrl: IS_WEB
            ? window.location.href
            : `${BACKEND}/piece/${tokenId}`,
        }),
      });
      const json = await res.json();
      if (json.url) {
        setBuyStep("redirecting");
        if (IS_WEB) window.location.href = json.url;
        else {
          await Linking.openURL(json.url);
          setBuyStep("idle");
        }
      } else if (json.unavailable) {
        setBuyStep("unavailable");
        setBuyError(
          "This piece is no longer available. No charge has been made.",
        );
      } else {
        setBuyStep("error");
        setBuyError(json.error || "Could not open checkout. Please try again.");
      }
    } catch (e: any) {
      setBuyStep("error");
      setBuyError(e.message || "Network error. Please try again.");
    }
  }

  // ── Claim ─────────────────────────────────────────────────────
  async function submitClaim() {
    if (!claimEmail.trim()) {
      setClaimError("Please enter your email");
      return;
    }
    setClaimStep("submitting");
    setClaimError("");
    try {
      const claimUrl = IS_WEB ? `/api/claim` : `${BACKEND}/api/claim`;
      const res = await fetch(claimUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: String(tokenId),
          buyerEmail: claimEmail.trim(),
          walletAddress: claimWallet.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setClaimResult(json);
        setClaimStep("success");
        setSaleData({
          ...saleData,
          claimed: true,
          buyerWallet: json.buyerWallet,
        });
        setPageState("sold_claimed");
      } else {
        setClaimStep("error");
        setClaimError(json.error || "Claim failed. Please try again.");
      }
    } catch (e: any) {
      setClaimStep("error");
      setClaimError(e.message || "Network error.");
    }
  }

  const imgUrl = data ? resolveImg(data.image) : "";
  const price = data?.price ? `$${Number(data.price).toFixed(0)}` : "—";
  const init = (data?.name || "MB")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const short = (a: string) => (a ? `${a.slice(0, 8)}...${a.slice(-6)}` : "—");
  const buyDisabled =
    buyStep === "checking" ||
    buyStep === "redirecting" ||
    buyStep === "unavailable";

  // ── Loading / Error ───────────────────────────────────────────
  if (pageState === "loading")
    return (
      <View style={s.screen}>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={s.loadTxt}>Loading piece...</Text>
      </View>
    );

  if (pageState === "error" || !data)
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <TouchableOpacity
              onPress={() => router.push("/rarity" as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.navLink}>✦ Rarity</Text>
            </TouchableOpacity>
            <CartIcon />
            <TouchableOpacity
              onPress={() =>
                router.push(session ? "/profile" : ("/auth" as any))
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.navLink}>{session ? "👤" : "Sign In"}</Text>
            </TouchableOpacity>
          </View>
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
          {pageState === "listed" && (
            <View style={s.listedBadge}>
              <Text style={s.listedBadgeTxt}>Listed</Text>
            </View>
          )}
          {pageState === "sold_unclaimed" && (
            <View style={s.soldBadge}>
              <Text style={s.soldBadgeTxt}>Sold · Unclaimed</Text>
            </View>
          )}
          {pageState === "sold_claimed" && (
            <View style={s.claimedBadge}>
              <Text style={s.claimedBadgeTxt}>✦ NFT Claimed</Text>
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
              {pageState !== "listed" && (
                <Text style={s.lastSaleLbl}>Last Sale</Text>
              )}
              <Text style={s.priceVal}>{price}</Text>
              <Text style={s.priceLbl}>USD</Text>
            </View>
          </View>

          {/* Trait chips */}
          <View style={s.chips}>
            {[
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

          {/* Rarity row */}
          {rarityData && (
            <View style={s.rarityRow}>
              <View style={s.rarityItem}>
                <Text style={s.rarityLabel}>Rank</Text>
                <Text style={s.rarityVal}>
                  #{rarityData.rank}{" "}
                  <Text style={s.rarityOf}>of {rarityData.total}</Text>
                </Text>
              </View>
              <View style={s.rarityItem}>
                <Text style={s.rarityLabel}>Tier</Text>
                <Text style={s.rarityVal}>{rarityData.label}</Text>
              </View>
              <View style={s.rarityItem}>
                <Text style={s.rarityLabel}>Top</Text>
                <Text style={s.rarityVal}>
                  {rarityData.percentile?.toFixed(1)}%
                </Text>
              </View>
              <View style={[s.rarityItem, { borderRightWidth: 0 }]}>
                <Text style={s.rarityLabel}>Traits</Text>
                <Text style={s.rarityVal}>{rarityData.traitCount}</Text>
              </View>
            </View>
          )}

          {/* Add to Cart + Keep Shopping (listed only) */}
          {pageState === "listed" && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <TouchableOpacity
                style={[s.cartAddBtn, isInCart(tokenId) && s.cartAddBtnActive]}
                onPress={() =>
                  isInCart(tokenId)
                    ? router.push("/cart" as any)
                    : addToCart({
                        token_id: tokenId,
                        bag_name: data.name,
                        price: data.price,
                        image: imgUrl || null,
                      })
                }
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    s.cartAddBtnTxt,
                    isInCart(tokenId) && { color: C.black },
                  ]}
                >
                  {isInCart(tokenId) ? "✓ View Cart" : "+ Add to Cart"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.keepShoppingBtn}
                onPress={() => router.push("/collection" as any)}
                activeOpacity={0.85}
              >
                <Text style={s.keepShoppingBtnTxt}>← Keep Shopping</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── LISTED: Buy button ── */}
          {pageState === "listed" && (
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
                    <Text style={s.buyBtnTxt}>
                      {buyStep === "checking"
                        ? "Checking availability..."
                        : "Redirecting to Stripe..."}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.buyBtnTxt}>
                    {buyStep === "unavailable"
                      ? "No Longer Available"
                      : buyStep === "error"
                        ? "Try Again"
                        : `Purchase This Piece  —  ${price}`}
                  </Text>
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
                💳 Card · 🍎 Apple Pay · G Google Pay{"\n"}Secure checkout
                powered by Stripe
              </Text>
            </>
          )}

          {/* ── SOLD + UNCLAIMED: Claim section ── */}
          {pageState === "sold_unclaimed" && (
            <View style={s.claimBox}>
              <Text style={s.claimTitle}>
                Claim Your Authentication Contract
              </Text>
              {gainPercent ? (
                <View style={s.gainRow}>
                  <Text style={s.gainLabel}>Contract Gain</Text>
                  <Text style={s.gainVal}>↑ {gainPercent}%</Text>
                </View>
              ) : null}
              <Text style={s.claimSub}>
                This piece has been purchased. If you are the buyer, enter your
                email to claim your NFT.
              </Text>
              {claimStep === "success" ? (
                <View style={s.claimSuccess}>
                  <Text style={s.claimSuccessTitle}>
                    ✓ NFT Claimed Successfully
                  </Text>
                  <Text style={s.claimSuccessSub}>
                    Token #{tokenId} has been transferred to your Stellar
                    wallet.
                    {claimResult?.isCustodial
                      ? " Wallet details sent to your email."
                      : ""}
                  </Text>
                  {claimResult?.txHash && (
                    <TouchableOpacity
                      onPress={() => {
                        const url = `${EXPLORER}/tx/${claimResult.txHash}`;
                        if (IS_WEB) window.open(url, "_blank");
                        else Linking.openURL(url);
                      }}
                    >
                      <Text style={s.txLink}>View Transaction ↗</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {session?.user?.email ? (
                    <View style={s.claimAutoFill}>
                      <Text style={s.claimAutoFillLabel}>Claiming as</Text>
                      <Text style={s.claimAutoFillVal}>
                        {session.user.email}
                      </Text>
                      {profile?.stellar_wallet_public && (
                        <Text style={s.claimAutoFillWallet} numberOfLines={1}>
                          {profile.stellar_wallet_public.slice(0, 12)}...
                          {profile.stellar_wallet_public.slice(-6)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={s.claimInput}
                        placeholder="Your email address"
                        placeholderTextColor={C.muted}
                        value={claimEmail}
                        onChangeText={setClaimEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={s.claimInput}
                        placeholder="Stellar wallet address (optional)"
                        placeholderTextColor={C.muted}
                        value={claimWallet}
                        onChangeText={setClaimWallet}
                        autoCapitalize="none"
                      />
                    </>
                  )}
                  {claimError ? (
                    <Text style={s.claimError}>{claimError}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      s.claimBtn,
                      claimStep === "submitting" && s.buyBtnDisabled,
                    ]}
                    onPress={submitClaim}
                    disabled={claimStep === "submitting"}
                    activeOpacity={0.85}
                  >
                    {claimStep === "submitting" ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <ActivityIndicator color={C.black} size="small" />
                        <Text style={s.buyBtnTxt}>Claiming...</Text>
                      </View>
                    ) : (
                      <Text style={s.buyBtnTxt}>Claim NFT →</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={s.offerBtnRow}
                onPress={() => setOfferVisible(true)}
              >
                <Text style={s.offerBtnTxt}>Make an Offer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SOLD + CLAIMED: Ownership view ── */}
          {pageState === "sold_claimed" && (
            <View style={s.ownerBox}>
              <View style={s.ownerRow}>
                <Text style={s.ownerLabel}>Owner</Text>
                <Text style={s.ownerVal}>
                  {saleData?.buyerWallet
                    ? short(saleData.buyerWallet)
                    : "Verified Owner"}
                </Text>
              </View>
              {saleData?.soldAt && (
                <View style={s.ownerRow}>
                  <Text style={s.ownerLabel}>Acquired</Text>
                  <Text style={s.ownerVal}>
                    {new Date(saleData.soldAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
              <View style={s.ownerRow}>
                <Text style={s.ownerLabel}>Last Sale</Text>
                <Text style={[s.ownerVal, { color: C.goldLt }]}>
                  {price} USD
                </Text>
              </View>
              <View style={s.ownerRow}>
                <Text style={s.ownerLabel}>NFT Status</Text>
                <Text style={[s.ownerVal, { color: C.green }]}>
                  ✦ Claimed On-Chain
                </Text>
              </View>
              {gainPercent ? (
                <View style={s.ownerRow}>
                  <Text style={s.ownerLabel}>Contract Gain</Text>
                  <Text
                    style={[s.ownerVal, { color: C.green, fontWeight: "700" }]}
                  >
                    ↑ {gainPercent}%
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={s.offerBtnRow}
                onPress={() => setOfferVisible(true)}
              >
                <Text style={s.offerBtnTxt}>Make an Offer</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.rule} />

          {/* ── Activity (sold states only) ── */}
          {(pageState === "sold_unclaimed" || pageState === "sold_claimed") && (
            <>
              <Text style={s.sectionLbl}>Activity</Text>
              <View style={s.activityBox}>
                <View style={s.activityRow}>
                  <View style={s.activityDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityType}>Minted</Text>
                    <Text style={s.activityDetail}>
                      Token created on Stellar · Contract {short(CONTRACT)}
                    </Text>
                  </View>
                  <Text style={s.activityDate}>
                    {data.tailored_year || data.design_year || "2026"}
                  </Text>
                </View>
                {saleData?.soldAt && (
                  <View style={s.activityRow}>
                    <View
                      style={[s.activityDot, { backgroundColor: C.gold }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityType}>Sold</Text>
                      <Text style={s.activityDetail}>
                        Purchased via MBC · {price} USD
                      </Text>
                    </View>
                    <Text style={s.activityDate}>
                      {new Date(saleData.soldAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {saleData?.claimed && saleData?.claimedAt && (
                  <View style={s.activityRow}>
                    <View
                      style={[s.activityDot, { backgroundColor: C.green }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityType}>NFT Claimed</Text>
                      <Text style={s.activityDetail}>
                        Transferred to{" "}
                        {saleData.buyerWallet
                          ? short(saleData.buyerWallet)
                          : "owner wallet"}
                      </Text>
                    </View>
                    <Text style={s.activityDate}>
                      {new Date(saleData.claimedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {!saleData?.claimed && (
                  <View style={s.activityRow}>
                    <View
                      style={[s.activityDot, { backgroundColor: C.muted }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.activityType, { color: C.muted }]}>
                        NFT Transfer Pending
                      </Text>
                      <Text style={s.activityDetail}>Awaiting buyer claim</Text>
                    </View>
                  </View>
                )}
              </View>
              <View style={s.rule} />
            </>
          )}

          {/* ── Traits & Details (grouped) ── */}
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

          {/* ── On-Chain Proof ── */}
          <View style={s.rule} />
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

          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {/* ── Sticky bar — LISTED ── */}
      {pageState === "listed" && (
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
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={s.stickyName} numberOfLines={1}>
                  {data.name}
                </Text>
                <Text style={s.stickyPrice}>{price} USD</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={s.viewCartBtn}
                  onPress={() => router.push("/cart" as any)}
                  activeOpacity={0.85}
                >
                  <Text style={s.viewCartBtnTxt}>🛒</Text>
                </TouchableOpacity>
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
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* ── Sticky bar — SOLD UNCLAIMED ── */}
      {pageState === "sold_unclaimed" && (
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
                <Text style={[s.stickyPrice, { color: C.muted }]}>
                  NFT Unclaimed
                </Text>
              </View>
              <TouchableOpacity
                style={s.stickyBtnOffer}
                onPress={() => setOfferVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={s.stickyBtnOfferTxt}>Make Offer</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* ── Sticky bar — SOLD CLAIMED ── */}
      {pageState === "sold_claimed" && (
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
                <Text style={[s.stickyPrice, { color: C.green }]}>
                  ✦ NFT Claimed
                </Text>
              </View>
              <TouchableOpacity
                style={s.stickyBtnOffer}
                onPress={() => setOfferVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={s.stickyBtnOfferTxt}>Make Offer</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* ── Make Offer Modal ── */}
      <Modal
        visible={offerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOfferVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Make an Offer</Text>
            <Text style={s.modalSub}>
              Offers are coming soon.{"\n"}Contact us to express interest in
              this piece.
            </Text>
            <TouchableOpacity
              style={s.modalBtn}
              onPress={() => {
                setOfferVisible(false);
                Linking.openURL(
                  `mailto:youngcompltd@gmail.com?subject=Offer for ${data.name} — Token #${tokenId}`,
                );
              }}
            >
              <Text style={s.modalBtnTxt}>Contact Us →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setOfferVisible(false)}
              style={{ marginTop: 12 }}
            >
              <Text style={s.modalClose}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const IMG_H = IS_WEB ? Math.min(width * 0.6, 500) : width;

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
  navLink: { fontSize: 11, color: C.gold, letterSpacing: 0.5 },

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
  claimedBadge: {
    position: "absolute",
    top: 14,
    right: 16,
    backgroundColor: "rgba(91,175,133,0.2)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  claimedBadgeTxt: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.green,
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
  lastSaleLbl: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 2,
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

  rarityRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  rarityItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: C.border,
    backgroundColor: C.charcoal,
  },
  rarityLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 4,
  },
  rarityVal: { fontSize: 13, color: C.goldLt, fontWeight: "700" },
  rarityOf: { fontSize: 9, color: C.muted, fontWeight: "400" },

  gainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  gainLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  gainVal: { fontSize: 13, color: C.green, fontWeight: "700" },

  cartAddBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.gold,
    padding: 16,
    alignItems: "center",
  },
  cartAddBtnActive: { backgroundColor: C.gold },
  cartAddBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
  },
  keepShoppingBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    alignItems: "center",
  },
  keepShoppingBtnTxt: {
    fontSize: 10,
    letterSpacing: 1.5,
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

  claimBox: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 10,
    backgroundColor: C.charcoal,
  },
  claimTitle: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 8,
    fontWeight: "600",
  },
  claimSub: { fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 16 },
  claimInput: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.warm,
    color: C.cream,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  claimAutoFill: {
    backgroundColor: C.warm,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  claimAutoFillLabel: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 4,
  },
  claimAutoFillVal: { fontSize: 13, color: C.cream, marginBottom: 4 },
  claimAutoFillWallet: {
    fontSize: 10,
    color: C.muted,
    fontFamily: "monospace",
  },
  claimBtn: {
    backgroundColor: C.gold,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  claimError: { fontSize: 12, color: C.red, marginBottom: 10 },
  claimSuccess: {
    backgroundColor: "rgba(91,175,133,0.1)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.4)",
    padding: 16,
  },
  claimSuccessTitle: {
    fontSize: 13,
    color: C.green,
    fontWeight: "600",
    marginBottom: 6,
  },
  claimSuccessSub: { fontSize: 12, color: C.muted, lineHeight: 18 },
  txLink: { fontSize: 11, color: C.gold, marginTop: 8 },

  ownerBox: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.charcoal,
    marginBottom: 10,
    overflow: "hidden",
  },
  ownerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  ownerLabel: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
  },
  ownerVal: { fontSize: 12, color: C.cream, fontFamily: "monospace" },

  offerBtnRow: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
  },
  offerBtnTxt: {
    fontSize: 9,
    letterSpacing: 2,
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

  activityBox: {
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.charcoal,
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.cream,
    marginTop: 4,
  },
  activityType: {
    fontSize: 11,
    color: C.cream,
    fontWeight: "600",
    marginBottom: 2,
  },
  activityDetail: { fontSize: 10, color: C.muted, letterSpacing: 0.3 },
  activityDate: { fontSize: 10, color: C.muted },

  traitGroupLbl: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 8,
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
  stickyBtnOffer: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stickyBtnOfferTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  viewCartBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewCartBtnTxt: { fontSize: 14, color: C.cream },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(12,11,9,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 12,
  },
  modalSub: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  modalBtnTxt: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
  modalClose: { fontSize: 11, color: C.muted, letterSpacing: 1 },
});
