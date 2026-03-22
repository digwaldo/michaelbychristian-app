// app/piece/[id].tsx
// Reads bag data from Stellar + sale/claim state from KV
// States: listed (buy now) | sold+unclaimed (claim NFT) | sold+claimed (ownership view)

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
  View
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

  const t = raw.traits || {};
  const owner = ownerRaw ? String(ownerRaw).trim() : null;
  const ownedByAdmin =
    !owner || owner.toUpperCase() === ADMIN_WALLET.toUpperCase();

  // Build activity from on-chain data
  const activity = [];
  if (raw.minted_at || raw.tailored_year) {
    activity.push({
      type: "Minted",
      date:
        raw.minted_at || `${raw.tailored_year || raw.design_year || "2026"}`,
      detail: "Token created on Stellar",
    });
  }
  if (!ownedByAdmin && owner) {
    activity.push({
      type: "Transferred",
      date: raw.transferred_at || "Recent",
      detail: `To ${owner.slice(0, 8)}...${owner.slice(-6)}`,
    });
  }

  return {
    name: raw.name || `MBC Token #${tokenId}`,
    image: raw.image || "",
    price_usdc: raw.price_usdc ? Number(raw.price_usdc) : 0,
    listed: raw.listed !== false,
    owner,
    ownedByAdmin,
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
    activity,
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

  const [data, setData] = useState<any | null>(null);
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

  // XLM price
  const [xlmPrice, setXlmPrice] = useState<number | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, [tokenId]);

  async function load() {
    setPageState("loading");
    setError(null);
    try {
      const [tokenData, soldRes, xlmRes] = await Promise.all([
        loadTokenFromStellar(tokenId),
        fetch(`${BACKEND}/api/check-sold?token_id=${tokenId}`)
          .then((r) => r.json())
          .catch(() => ({ sold: false })),
        fetch(`${BACKEND}/api/xlm-price`)
          .then((r) => r.json())
          .catch(() => null),
      ]);
      if (xlmRes?.price) setXlmPrice(xlmRes.price);

      setData(tokenData);
      setSaleData(soldRes);

      if (soldRes.sold && soldRes.claimed) {
        setPageState("sold_claimed");
      } else if (soldRes.sold && !soldRes.claimed) {
        setPageState("sold_unclaimed");
      } else {
        setPageState("listed");
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
      const res = await fetch(`${BACKEND}/api/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: String(tokenId),
          successUrl: IS_WEB
            ? `${window.location.origin}/success`
            : `${BACKEND}/success`,
          cancelUrl: IS_WEB ? window.location.href : `${BACKEND}/`,
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
      const res = await fetch(`${BACKEND}/api/claim`, {
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
  const price = data?.price_usdc
    ? `${(data.price_usdc / 100).toFixed(0)}`
    : "—";
  const xlmEquiv =
    data?.price_usdc && xlmPrice
      ? `${(data.price_usdc / 100 / xlmPrice).toFixed(0)} XLM`
      : null;
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

  // ── Loading ───────────────────────────────────────────────────
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

          {/* ── Status badge ── */}
          {pageState === "listed" && (
            <View style={s.listedBadge}>
              <Text style={s.listedBadgeTxt}>Listed</Text>
            </View>
          )}
          {pageState === "sold_unclaimed" && (
            <View style={s.soldBadge}>
              <Text style={s.soldBadgeTxt}>Sold · NFT Unclaimed</Text>
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
              {pageState === "listed" ? (
                <>
                  <Text style={s.priceVal}>{price}</Text>
                  <Text style={s.priceLbl}>USD</Text>
                  {xlmEquiv ? <Text style={s.xlmPrice}>{xlmEquiv}</Text> : null}
                </>
              ) : (
                <>
                  <Text style={s.lastSaleLbl}>Last Sale</Text>
                  <Text style={s.priceVal}>{price}</Text>
                  <Text style={s.priceLbl}>USD</Text>
                </>
              )}
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

          {/* ── PAGE STATE: LISTED — Buy button ── */}
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

          {/* ── PAGE STATE: SOLD + UNCLAIMED — Claim section ── */}
          {pageState === "sold_unclaimed" && (
            <View style={s.claimBox}>
              <Text style={s.claimTitle}>
                Claim Your Authentication Contract
              </Text>
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
                    placeholder="Stellar wallet address (optional — we'll create one for you)"
                    placeholderTextColor={C.muted}
                    value={claimWallet}
                    onChangeText={setClaimWallet}
                    autoCapitalize="none"
                  />
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

          {/* ── PAGE STATE: SOLD + CLAIMED — Ownership view ── */}
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
              <TouchableOpacity
                style={s.offerBtnRow}
                onPress={() => setOfferVisible(true)}
              >
                <Text style={s.offerBtnTxt}>Make an Offer</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.rule} />

          {/* ── Activity section (shown when sold) ── */}
          {(pageState === "sold_unclaimed" || pageState === "sold_claimed") && (
            <>
              <Text style={s.sectionLbl}>Activity</Text>
              <View style={s.activityBox}>
                {/* Mint event */}
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
                {/* Sale event */}
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
                {/* Claim event */}
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
                {/* Unclaimed note */}
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

          {/* ── On-Chain Proof ── */}
          <View style={s.rule} />
          <Text style={s.sectionLbl}>On-Chain Proof</Text>
          <View style={s.chainBox}>
            {[
              { k: "Contract", v: short(CONTRACT), mono: true },
              { k: "Token ID", v: `#${tokenId}`, gold: true },
              { k: "Standard", v: "Soroban NFT", mono: false },
              { k: "Network", v: "Stellar · Testnet", gold: true },
              {
                k: "Owner",
                v: data.owner ? short(data.owner) : "Admin",
                mono: true,
              },
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

          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {/* ── Sticky bar ── */}
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

// ── Styles ─────────────────────────────────────────────────────
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
  xlmPrice: { fontSize: 9, color: C.gold, letterSpacing: 1, marginTop: 4 },

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
