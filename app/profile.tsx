// app/profile.tsx — My Pieces / Profile screen
// Card grid layout matching collection page

import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartIcon } from "../components/CartIcon";
import { useAuth } from "../context/AuthContext";
import {
  BACKEND,
  C,
  CONTRACT,
  EXPLORER,
  PASSPHRASE,
  RPC_URL,
} from "../lib/theme";

const IS_WEB = Platform.OS === "web";
const { width } = Dimensions.get("window");
const COLS = IS_WEB ? 3 : 2;
const GAP = 2;

// Resolve IPFS images
function resolveImg(img?: string): string | null {
  if (!img) return null;
  if (img.startsWith("ipfs://"))
    return img.replace("ipfs://", "https://ipfs.io/ipfs/");
  return img;
}

interface OwnedPiece {
  tokenId: number;
  name: string;
  image: string | null;
  soldAt: string;
  claimed: boolean;
  buyerWallet: string | null;
  amount: number;
  // On-chain traits (loaded lazily)
  silhouette?: string;
  edition_type?: string;
  primary_texture?: string;
  primary_color?: string;
  nfc_chip_id?: string;
  rarity_rank?: number;
  rarity_label?: string;
}

async function loadTokenImage(
  tokenId: number,
): Promise<{
  image: string | null;
  silhouette: string;
  edition_type: string;
  primary_texture: string;
  primary_color: string;
  nfc_chip_id: string;
}> {
  try {
    const Sdk = await import("@stellar/stellar-sdk" as any);
    const server = new Sdk.rpc.Server(RPC_URL);
    const contract = new Sdk.Contract(CONTRACT);
    const keypair = Sdk.Keypair.random();
    const account = new Sdk.Account(keypair.publicKey(), "0");
    const tx = new Sdk.TransactionBuilder(account, {
      fee: Sdk.BASE_FEE,
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "full_token_data",
          Sdk.nativeToScVal(tokenId, { type: "u64" }),
        ),
      )
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (!Sdk.rpc.Api.isSimulationSuccess(sim))
      return {
        image: null,
        silhouette: "",
        edition_type: "",
        primary_texture: "",
        primary_color: "",
        nfc_chip_id: "",
      };
    const raw = Sdk.scValToNative(sim.result.retval);
    const t = raw?.traits || {};
    return {
      image: resolveImg(raw?.image),
      silhouette: t.silhouette || raw?.silhouette || "",
      edition_type: t.edition_type || raw?.edition_type || "",
      primary_texture: t.primary_texture || raw?.primary_texture || "",
      primary_color: t.primary_color || raw?.primary_color || "",
      nfc_chip_id: t.nfc_chip_id || raw?.nfc_chip_id || "",
    };
  } catch {
    return {
      image: null,
      silhouette: "",
      edition_type: "",
      primary_texture: "",
      primary_color: "",
      nfc_chip_id: "",
    };
  }
}

export default function ProfileScreen() {
  const { session, profile, signOut, loading } = useAuth();
  const [pieces, setPieces] = useState<OwnedPiece[]>([]);
  const [piecesLoading, setPiecesLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (session?.user) loadPieces();
  }, [session]);

  async function loadPieces() {
    if (!session?.user?.email) return;
    setPiecesLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/sold?type=list`);
      const { soldTokenIds } = await res.json();

      const owned: OwnedPiece[] = [];
      await Promise.all(
        soldTokenIds.map(async (tokenId: number) => {
          const [checkRes, myRes, rarityRes] = await Promise.all([
            fetch(`${BACKEND}/api/sold?type=check&token_id=${tokenId}`)
              .then((r) => r.json())
              .catch(() => null),
            fetch(
              `${BACKEND}/api/my-pieces?email=${encodeURIComponent(session.user!.email!)}&token_id=${tokenId}`,
            )
              .then((r) => r.json())
              .catch(() => null),
            fetch(`${BACKEND}/api/rarity?type=token&token_id=${tokenId}`)
              .then((r) => r.json())
              .catch(() => null),
          ]);
          if (myRes?.isOwner) {
            owned.push({
              tokenId,
              name: myRes.bagName || `Token #${tokenId}`,
              image: null, // loaded lazily below
              soldAt: checkRes?.soldAt || myRes.soldAt,
              claimed: checkRes?.claimed || myRes.claimed,
              buyerWallet: checkRes?.buyerWallet || null,
              amount: myRes.amount,
              rarity_rank: rarityRes?.found ? rarityRes.rank : undefined,
              rarity_label: rarityRes?.found ? rarityRes.label : undefined,
            });
          }
        }),
      );

      const sorted = owned.sort(
        (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
      );
      setPieces(sorted);

      // Load images + traits from Stellar in background
      for (const piece of sorted) {
        loadTokenImage(piece.tokenId).then((traits) => {
          setPieces((prev) =>
            prev.map((p) =>
              p.tokenId === piece.tokenId ? { ...p, ...traits } : p,
            ),
          );
        });
      }
    } catch (e) {
      console.log("Load pieces failed:", e);
    } finally {
      setPiecesLoading(false);
    }
  }

  const short = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

  // ── Not logged in ─────────────────────────────────────────────
  if (!loading && !session) {
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
            <Text style={s.topEye}>My Pieces</Text>
            <View style={{ width: 60 }} />
          </View>
        </SafeAreaView>
        <View style={s.center}>
          <Text style={s.guestIcon}>👜</Text>
          <Text style={s.guestTitle}>Sign In to View Your Pieces</Text>
          <Text style={s.guestSub}>
            Your purchased bags, wallet, and order history all in one place.
          </Text>
          <TouchableOpacity
            style={s.signInBtn}
            onPress={() => router.push("/auth" as any)}
          >
            <Text style={s.signInBtnTxt}>Sign In / Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.browseBtn}
            onPress={() => router.push("/collection" as any)}
          >
            <Text style={s.browseBtnTxt}>Browse Collection →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ── Nav ── */}
      <SafeAreaView edges={["top"]} style={s.topBar}>
        <View style={s.topBarInner}>
          <View>
            <Text style={s.navEye}>Michael By Christian</Text>
            <Text style={s.navTitle}>
              My <Text style={s.navTitleEm}>Pieces</Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <CartIcon />
            <TouchableOpacity
              onPress={() => router.push("/collection" as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.navLink}>Collection</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={signOut}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.navLink}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Profile header ── */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>
              {(profile?.name || session!.user.email || "M")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={s.profileName}>{profile?.name || "MBC Member"}</Text>
          <Text style={s.profileEmail}>{session!.user.email}</Text>
        </View>

        {/* ── Wallet strip ── */}
        {profile?.stellar_wallet_public ? (
          <TouchableOpacity
            style={s.walletStrip}
            onPress={() => {
              const url = `${EXPLORER}/account/${profile.stellar_wallet_public}`;
              if (IS_WEB) window.open(url, "_blank");
              else Linking.openURL(url);
            }}
            activeOpacity={0.8}
          >
            <View>
              <Text style={s.walletStripLabel}>Stellar Wallet</Text>
              <Text style={s.walletStripAddr}>
                {short(profile.stellar_wallet_public)}
              </Text>
            </View>
            <Text style={s.walletStripLink}>View on Explorer ↗</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.noWalletStrip}>
            <Text style={s.noWalletTxt}>
              No wallet yet — purchase a piece to get yours automatically.
            </Text>
          </View>
        )}

        {/* ── Stats bar ── */}
        {!piecesLoading && (
          <View style={s.statsBar}>
            {[
              { v: String(pieces.length), l: "Owned" },
              {
                v: String(pieces.filter((p) => p.claimed).length),
                l: "Claimed",
              },
              {
                v: String(pieces.filter((p) => !p.claimed).length),
                l: "Unclaimed",
              },
            ].map(({ v, l }) => (
              <View key={l} style={s.statCell}>
                <Text style={s.statVal}>{v}</Text>
                <Text style={s.statLbl}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Pieces grid ── */}
        {piecesLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={C.gold} size="small" />
            <Text style={s.loadTxt}>Loading your pieces...</Text>
          </View>
        ) : pieces.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyTitle}>No pieces yet</Text>
            <TouchableOpacity
              style={s.browseBtn}
              onPress={() => router.push("/collection" as any)}
            >
              <Text style={s.browseBtnTxt}>Browse the Collection →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.grid}>
            {Array.from(
              { length: Math.ceil(pieces.length / COLS) },
              (_, rowIdx) => (
                <View key={rowIdx} style={s.row}>
                  {pieces
                    .slice(rowIdx * COLS, rowIdx * COLS + COLS)
                    .map((piece) => (
                      <TouchableOpacity
                        key={piece.tokenId}
                        style={s.card}
                        onPress={() =>
                          router.push({
                            pathname: "/piece/[id]",
                            params: { id: piece.tokenId },
                          })
                        }
                        activeOpacity={0.88}
                      >
                        {/* Image */}
                        <View style={s.cardImg}>
                          {piece.image ? (
                            <Image
                              source={{ uri: piece.image }}
                              style={StyleSheet.absoluteFillObject}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={s.cardInit}>
                              {piece.name
                                .split(" ")
                                .map((w: string) => w[0])
                                .join("")
                                .substring(0, 2)
                                .toUpperCase()}
                            </Text>
                          )}
                          <View style={s.imgOverlay} />

                          {/* Token badge */}
                          <View style={s.badgeColRight}>
                            <View style={s.tokenBadge}>
                              <Text style={s.tokenBadgeTxt} numberOfLines={1}>
                                #{piece.tokenId}
                              </Text>
                            </View>
                            {piece.rarity_rank ? (
                              <View style={s.rarityBadge}>
                                <Text
                                  style={s.rarityBadgeTxt}
                                  numberOfLines={1}
                                >
                                  Rank #{piece.rarity_rank}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Left badges */}
                          <View style={s.badgeColLeft}>
                            {piece.edition_type ? (
                              <View style={s.editionBadge}>
                                <Text
                                  style={s.editionBadgeTxt}
                                  numberOfLines={1}
                                >
                                  {piece.edition_type}
                                </Text>
                              </View>
                            ) : null}
                            {piece.rarity_label ? (
                              <View style={s.rarityLabelBadge}>
                                <Text
                                  style={s.rarityLabelTxt}
                                  numberOfLines={1}
                                >
                                  {piece.rarity_label}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          {/* Claimed / Unclaimed */}
                          {piece.claimed ? (
                            <View style={s.claimedBadge}>
                              <Text style={s.claimedBadgeTxt}>✦ Claimed</Text>
                            </View>
                          ) : (
                            <View style={s.unclaimedBadge}>
                              <Text style={s.unclaimedBadgeTxt}>Unclaimed</Text>
                            </View>
                          )}

                          {/* NFC */}
                          {piece.nfc_chip_id ? (
                            <View style={s.nfcBadge}>
                              <Text style={s.nfcBadgeTxt}>✦ NFC</Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Card body */}
                        <View style={s.cardBody}>
                          <Text style={s.cardSilhouette} numberOfLines={1}>
                            {piece.silhouette
                              ? `${piece.silhouette} · Silhouette`
                              : "MBC"}
                          </Text>
                          <Text style={s.cardName} numberOfLines={2}>
                            {piece.name}
                          </Text>
                          <Text style={s.cardSub} numberOfLines={1}>
                            {[piece.primary_texture, piece.primary_color]
                              .filter(Boolean)
                              .join(" · ") || "NFC Embedded"}
                          </Text>
                        </View>

                        {/* Card footer */}
                        <View style={s.cardFoot}>
                          <View>
                            <Text style={s.cardPrice}>
                              ${(piece.amount / 100).toFixed(0)}
                            </Text>
                            <Text style={s.cardCurrency}>USD</Text>
                          </View>
                          <View
                            style={[
                              s.statusPill,
                              piece.claimed
                                ? s.statusPillClaimed
                                : s.statusPillUnclaimed,
                            ]}
                          >
                            <Text
                              style={[
                                s.statusPillTxt,
                                piece.claimed
                                  ? { color: C.green }
                                  : { color: "#C0614A" },
                              ]}
                            >
                              {piece.claimed ? "✦ NFT Claimed" : "Claim NFT →"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  {/* Fill empty slots in last row */}
                  {pieces.slice(rowIdx * COLS, rowIdx * COLS + COLS).length <
                    COLS &&
                    Array.from(
                      {
                        length:
                          COLS -
                          pieces.slice(rowIdx * COLS, rowIdx * COLS + COLS)
                            .length,
                      },
                      (_, i) => (
                        <View
                          key={`empty-${i}`}
                          style={[s.card, { opacity: 0 }]}
                        />
                      ),
                    )}
                </View>
              ),
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const GAP_N = GAP;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

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
  navEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 2,
  },
  navTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "900",
    color: C.cream,
  },
  navTitleEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  navLink: { fontSize: 10, color: C.muted, letterSpacing: 0.5 },
  topEye: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    fontWeight: "600",
  },

  profileHeader: {
    alignItems: "center",
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarTxt: { fontSize: 22, fontWeight: "700", color: C.black },
  profileName: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 3,
  },
  profileEmail: { fontSize: 11, color: C.muted },

  walletStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.charcoal,
  },
  walletStripLabel: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 3,
  },
  walletStripAddr: { fontSize: 11, color: C.cream, fontFamily: "monospace" },
  walletStripLink: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
  },
  noWalletStrip: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.charcoal,
  },
  noWalletTxt: { fontSize: 11, color: C.muted, textAlign: "center" },

  statsBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  statVal: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
    color: C.cream,
  },
  statLbl: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 2,
  },

  loadTxt: {
    marginTop: 10,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  emptyTitle: {
    fontSize: 15,
    color: C.cream,
    fontWeight: "600",
    marginBottom: 16,
  },

  guestIcon: { fontSize: 44, marginBottom: 14 },
  guestTitle: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 8,
    textAlign: "center",
  },
  guestSub: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 12,
  },
  signInBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
  browseBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseBtnTxt: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },

  // Grid
  grid: { padding: GAP_N, paddingBottom: 32 },
  row: { flexDirection: "row", gap: GAP_N, marginBottom: GAP_N },
  card: {
    flex: 1,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardImg: {
    aspectRatio: 1,
    backgroundColor: C.warm,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12,11,9,0.08)",
  },
  cardInit: {
    fontFamily: "serif",
    fontSize: 40,
    fontWeight: "900",
    color: "rgba(184,150,62,0.1)",
  },

  badgeColLeft: {
    position: "absolute",
    top: 6,
    left: 6,
    gap: 3,
    maxWidth: "52%",
  },
  badgeColRight: {
    position: "absolute",
    top: 6,
    right: 6,
    gap: 3,
    alignItems: "flex-end",
    maxWidth: "46%",
  },

  tokenBadge: {
    backgroundColor: "rgba(12,11,9,0.88)",
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tokenBadgeTxt: {
    fontSize: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.gold,
  },
  editionBadge: {
    backgroundColor: "rgba(12,11,9,0.85)",
    borderWidth: 1,
    borderColor: C.borderBright,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  editionBadgeTxt: {
    fontSize: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.goldLt,
  },
  rarityBadge: {
    backgroundColor: "rgba(184,150,62,0.18)",
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  rarityBadgeTxt: {
    fontSize: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: C.goldLt,
    fontWeight: "700",
  },
  rarityLabelBadge: {
    backgroundColor: "rgba(184,150,62,0.18)",
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  rarityLabelTxt: {
    fontSize: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: C.goldLt,
    fontWeight: "700",
  },

  claimedBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(91,175,133,0.2)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.55)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  claimedBadgeTxt: {
    fontSize: 6,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.green,
    fontWeight: "600",
  },
  unclaimedBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(192,97,74,0.15)",
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.4)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unclaimedBadgeTxt: {
    fontSize: 6,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#C0614A",
    fontWeight: "600",
  },
  nfcBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(91,175,133,0.15)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.4)",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  nfcBadgeTxt: {
    fontSize: 6,
    letterSpacing: 1,
    color: C.green,
    fontWeight: "600",
  },

  cardBody: { padding: 10 },
  cardSilhouette: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 3,
  },
  cardName: {
    fontFamily: "serif",
    fontSize: 12,
    fontWeight: "700",
    color: C.cream,
    lineHeight: 16,
    marginBottom: 3,
  },
  cardSub: { fontSize: 9, color: C.muted, letterSpacing: 0.5 },

  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.warm,
  },
  cardPrice: {
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    color: C.goldLt,
  },
  cardCurrency: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 1,
  },
  statusPill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillClaimed: {
    backgroundColor: "rgba(91,175,133,0.1)",
    borderColor: "rgba(91,175,133,0.4)",
  },
  statusPillUnclaimed: {
    backgroundColor: "rgba(192,97,74,0.1)",
    borderColor: "rgba(192,97,74,0.35)",
  },
  statusPillTxt: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
});
