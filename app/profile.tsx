// app/profile.tsx — My Pieces / Profile screen

import { router } from "expo-router";
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
import { BACKEND, C, EXPLORER } from "../lib/theme";

const IS_WEB = Platform.OS === "web";

interface OwnedPiece {
  tokenId: number;
  name: string;
  soldAt: string;
  claimed: boolean;
  buyerWallet: string | null;
  amount: number;
}

export default function ProfileScreen() {
  const { session, profile, signOut, loading } = useAuth();
  const [pieces, setPieces] = useState<OwnedPiece[]>([]);
  const [piecesLoading, setPiecesLoading] = useState(false);

  useEffect(() => {
    if (session?.user) loadPieces();
  }, [session]);

  async function loadPieces() {
    if (!session?.user?.email) return;
    setPiecesLoading(true);
    try {
      // Fetch all sold tokens and filter by buyer email
      const res = await fetch(`${BACKEND}/api/sold?type=list`);
      const { soldTokenIds } = await res.json();

      const owned: OwnedPiece[] = [];
      await Promise.all(
        soldTokenIds.map(async (tokenId: number) => {
          const r = await fetch(
            `${BACKEND}/api/sold?type=check&token_id=${tokenId}`,
          );
          const data = await r.json();
          // We check by matching email via a profile-specific endpoint
          if (data.sold) {
            // Fetch full sale data to check email match
            const r2 = await fetch(
              `${BACKEND}/api/my-pieces?email=${encodeURIComponent(session.user!.email!)}&token_id=${tokenId}`,
            );
            const d2 = await r2.json();
            if (d2.isOwner) {
              owned.push({
                tokenId,
                name: d2.bagName || `Token #${tokenId}`,
                soldAt: data.soldAt,
                claimed: data.claimed,
                buyerWallet: data.buyerWallet,
                amount: d2.amount,
              });
            }
          }
        }),
      );
      setPieces(
        owned.sort(
          (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime(),
        ),
      );
    } catch (e) {
      console.log("Load pieces failed:", e);
    } finally {
      setPiecesLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={s.screen}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    );
  }

  if (!session) {
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
        <View style={s.screen}>
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

  const short = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "—";

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
          <TouchableOpacity onPress={signOut}>
            <Text style={s.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Profile header ── */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>
              {(profile?.name || session.user.email || "M")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={s.profileName}>{profile?.name || "MBC Member"}</Text>
          <Text style={s.profileEmail}>{session.user.email}</Text>
        </View>

        {/* ── Wallet ── */}
        <View style={s.walletBox}>
          <Text style={s.sectionLbl}>Stellar Wallet</Text>
          {profile?.stellar_wallet_public ? (
            <>
              <View style={s.walletRow}>
                <Text style={s.walletLabel}>Address</Text>
                <Text style={s.walletAddr}>
                  {short(profile.stellar_wallet_public)}
                </Text>
              </View>
              <View style={[s.walletRow, { borderBottomWidth: 0 }]}>
                <Text style={s.walletLabel}>Status</Text>
                <Text style={[s.walletAddr, { color: C.green }]}>✦ Active</Text>
              </View>
              <TouchableOpacity
                style={s.explorerBtn}
                onPress={() => {
                  const url = `${EXPLORER}/account/${profile.stellar_wallet_public}`;
                  if (IS_WEB) window.open(url, "_blank");
                  else Linking.openURL(url);
                }}
              >
                <Text style={s.explorerBtnTxt}>View on Stellar Explorer ↗</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.noWallet}>
              <Text style={s.noWalletTxt}>
                No wallet yet — purchase a piece to get your wallet
                automatically.
              </Text>
            </View>
          )}
        </View>

        {/* ── My Pieces ── */}
        <View style={s.piecesSection}>
          <Text style={s.sectionLbl}>My Pieces</Text>
          {piecesLoading ? (
            <View style={s.loadBox}>
              <ActivityIndicator color={C.gold} size="small" />
              <Text style={s.loadTxt}>Loading your pieces...</Text>
            </View>
          ) : pieces.length === 0 ? (
            <View style={s.noPieces}>
              <Text style={s.noPiecesTxt}>No pieces yet.</Text>
              <TouchableOpacity
                onPress={() => router.push("/collection" as any)}
              >
                <Text style={s.noPiecesLink}>Browse the Collection →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            pieces.map((piece) => (
              <TouchableOpacity
                key={piece.tokenId}
                style={s.pieceCard}
                onPress={() =>
                  router.push({
                    pathname: "/piece/[id]",
                    params: { id: piece.tokenId },
                  })
                }
                activeOpacity={0.85}
              >
                <View style={s.pieceInfo}>
                  <Text style={s.pieceName}>{piece.name}</Text>
                  <Text style={s.pieceToken}>Token #{piece.tokenId}</Text>
                  <Text style={s.pieceDate}>
                    {new Date(piece.soldAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={s.pieceRight}>
                  <Text style={s.piecePrice}>
                    ${(piece.amount / 100).toFixed(0)}
                  </Text>
                  <View
                    style={[
                      s.pieceBadge,
                      {
                        backgroundColor: piece.claimed
                          ? "rgba(91,175,133,0.15)"
                          : "rgba(184,150,62,0.1)",
                        borderColor: piece.claimed
                          ? "rgba(91,175,133,0.4)"
                          : C.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.pieceBadgeTxt,
                        { color: piece.claimed ? C.green : C.muted },
                      ]}
                    >
                      {piece.claimed ? "✦ Claimed" : "Unclaimed"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: C.black,
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
  topEye: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    fontWeight: "600",
  },
  signOutTxt: { fontSize: 11, color: C.muted },
  guestIcon: { fontSize: 48, marginBottom: 16 },
  guestTitle: {
    fontFamily: "serif",
    fontSize: 24,
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
    marginBottom: 28,
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
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarTxt: { fontSize: 24, fontWeight: "700", color: C.black },
  profileName: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 4,
  },
  profileEmail: { fontSize: 12, color: C.muted },
  walletBox: { padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionLbl: {
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 16,
    fontWeight: "600",
  },
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  walletLabel: { fontSize: 10, color: C.muted, letterSpacing: 0.5 },
  walletAddr: { fontSize: 11, color: C.cream, fontFamily: "monospace" },
  explorerBtn: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  explorerBtnTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  noWallet: {
    padding: 16,
    backgroundColor: C.warm,
    borderWidth: 1,
    borderColor: C.border,
  },
  noWalletTxt: { fontSize: 12, color: C.muted, lineHeight: 18 },
  piecesSection: { padding: 20 },
  loadBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  loadTxt: { fontSize: 11, color: C.muted },
  noPieces: {
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  noPiecesTxt: { fontSize: 13, color: C.muted, marginBottom: 8 },
  noPiecesLink: { fontSize: 12, color: C.gold },
  pieceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.charcoal,
    marginBottom: 8,
  },
  pieceInfo: { flex: 1 },
  pieceName: {
    fontFamily: "serif",
    fontSize: 14,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 4,
  },
  pieceToken: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 2,
  },
  pieceDate: { fontSize: 10, color: C.muted },
  pieceRight: { alignItems: "flex-end", gap: 6 },
  piecePrice: {
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "700",
    color: C.goldLt,
  },
  pieceBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  pieceBadgeTxt: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
});
