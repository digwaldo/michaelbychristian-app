// app/profile.tsx — MBC Collector Profile
// Connect wallet → view owned NFTs → share / QR / certificate / transfer

import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchToken, formatPrice, imgUrl, TokenData } from "../lib/api";
import { clearWallet, loadWallet, saveWallet } from "../lib/storage";
import { BACKEND, C, CONTRACT, EXPLORER } from "../lib/theme";

const { width } = Dimensions.get("window");
const CARD_W = (width - 3) / 2;

interface OwnedToken {
  tokenId: number;
  data: TokenData;
}
type Sheet = "none" | "piece" | "qr" | "transfer" | "cert";

// ──────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [addrInput, setAddrInput] = useState("");
  const [addrErr, setAddrErr] = useState("");
  const [owned, setOwned] = useState<OwnedToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<OwnedToken | null>(null);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [toAddr, setToAddr] = useState("");
  const [toAddrErr, setToAddrErr] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState("");

  useEffect(() => {
    loadWallet().then((addr) => {
      if (addr) doConnect(addr, false);
    });
  }, []);

  function validateAddr(a: string): string {
    if (!a) return "";
    const t = a.trim().toUpperCase();
    if (!t.startsWith("G")) return "Address must start with G";
    if (t.length !== 56) return `Must be 56 characters (${t.length})`;
    return "";
  }

  async function doConnect(addr: string, persist = true) {
    const clean = addr.trim().toUpperCase();
    const err = validateAddr(clean);
    if (err) {
      setAddrErr(err);
      return;
    }
    setAddrErr("");
    setWallet(clean);
    if (persist) await saveWallet(clean);
    loadOwned(clean);
  }

  async function doDisconnect() {
    await clearWallet();
    setWallet(null);
    setOwned([]);
    setAddrInput("");
    setSelected(null);
    setSheet("none");
  }

  const loadOwned = useCallback(async (addr: string) => {
    setLoading(true);
    setLoadErr(null);
    try {
      // Fetch token IDs owned by this address from backend
      const res = await fetch(`${BACKEND}/api/owned/${addr}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const ids: number[] = await res.json();
      const tokens: OwnedToken[] = [];
      for (const id of ids) {
        try {
          const detail = await fetchToken(id);
          tokens.push({ tokenId: id, data: detail.data });
        } catch {}
      }
      setOwned(tokens);
    } catch (e: any) {
      setLoadErr(e.message || "Could not load collection");
    } finally {
      setLoading(false);
    }
  }, []);

  async function doShare() {
    if (!selected) return;
    const text = `I own ${selected.data.name} — a phygital luxury piece by Michael By Christian on Stellar. Token #${selected.tokenId}`;
    const url = `${EXPLORER}/contract/${CONTRACT}`;
    try {
      await Share.share({
        message: Platform.OS === "ios" ? text : `${text}\n${url}`,
        url,
      });
    } catch {}
  }

  async function doTransfer() {
    if (!selected || !wallet) return;
    const to = toAddr.trim().toUpperCase();
    const err = validateAddr(to);
    if (err) {
      setToAddrErr(err);
      return;
    }
    if (to === wallet) {
      setToAddrErr("Cannot transfer to your own wallet");
      return;
    }
    setToAddrErr("");
    setTransferring(true);
    setTransferMsg("Sending transfer request...");
    try {
      const res = await fetch(`${BACKEND}/api/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: wallet, to, tokenId: selected.tokenId }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || "Transfer failed");
      setTransferMsg(`✓ Transferred! Tx: ${data.hash?.slice(0, 14)}...`);
      setTimeout(() => {
        setSheet("none");
        setToAddr("");
        setTransferMsg("");
        loadOwned(wallet!);
      }, 2200);
    } catch (e: any) {
      setToAddrErr("Transfer failed: " + e.message);
      setTransferMsg("");
    } finally {
      setTransferring(false);
    }
  }

  const short = wallet ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : "";
  const initials = wallet ? wallet.slice(0, 2) : "MB";
  const totalValue = owned.reduce((s, t) => s + (t.data.price_usdc || 0), 0);

  // ── GATE ──
  if (!wallet)
    return (
      <View style={s.root}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: C.charcoal }}>
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 56 }}
            >
              <Text style={s.backTxt}>← Home</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>
              My <Text style={s.headerEm}>Collection</Text>
            </Text>
            <View style={{ width: 56 }} />
          </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={s.gateWrap}>
          <Text style={s.gateIcon}>◈</Text>
          <Text style={s.gateEye}>Michael By Christian</Text>
          <Text style={s.gateTitle}>Collector Profile</Text>
          <Text style={s.gateSub}>
            Enter your Stellar wallet address to view your MBC pieces,
            certificates of authenticity, and transfer history.
          </Text>
          <TextInput
            style={[s.input, addrErr ? s.inputErr : null]}
            value={addrInput}
            onChangeText={(t) => {
              setAddrInput(t);
              setAddrErr("");
            }}
            placeholder="G... your Stellar address (56 chars)"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => doConnect(addrInput)}
          />
          {addrErr ? <Text style={s.errTxt}>{addrErr}</Text> : null}
          <TouchableOpacity
            style={[s.connectBtn, !addrInput && s.btnOff]}
            onPress={() => doConnect(addrInput)}
            disabled={!addrInput}
            activeOpacity={0.85}
          >
            <Text style={s.connectBtnTxt}>View My Collection →</Text>
          </TouchableOpacity>
          <View style={s.gateFeatures}>
            {[
              "✦  View all your MBC pieces",
              "◈  Certificates of authenticity",
              "◉  NFC chip verification",
              "→  Transfer to other wallets",
            ].map((t, i) => (
              <Text key={i} style={s.gateFeature}>
                {t}
              </Text>
            ))}
          </View>
          <TouchableOpacity onPress={() => router.push("/collection")}>
            <Text style={s.gateLink}>
              Don't own a piece yet? Browse Collection →
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );

  // ── PROFILE ──
  function renderCard({ item }: { item: OwnedToken }) {
    const url = imgUrl(item.data.image);
    const init = (item.data.name || "MB")
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => {
          setSelected(item);
          setSheet("piece");
        }}
        activeOpacity={0.88}
      >
        <View style={s.cardImg}>
          {url ? (
            <Image
              source={{ uri: url }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <Text style={s.cardInit}>{init}</Text>
          )}
          <View style={s.tokenBadge}>
            <Text style={s.tokenBadgeTxt}>#{item.tokenId}</Text>
          </View>
          {item.data.nfc_chip_id ? (
            <View style={s.nfcBadge}>
              <Text style={s.nfcBadgeTxt}>✦ NFC</Text>
            </View>
          ) : null}
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardSilhouette} numberOfLines={1}>
            {item.data.silhouette || "MBC"}
          </Text>
          <Text style={s.cardName} numberOfLines={2}>
            {item.data.name}
          </Text>
          <Text style={s.cardPrice}>{formatPrice(item.data.price_usdc)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: C.charcoal }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 56 }}>
            <Text style={s.backTxt}>← Home</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            My <Text style={s.headerEm}>Collection</Text>
          </Text>
          <TouchableOpacity
            onPress={doDisconnect}
            style={{ width: 80, alignItems: "flex-end" }}
          >
            <Text style={s.disconnectTxt}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={owned}
        renderItem={renderCard}
        keyExtractor={(item) => String(item.tokenId)}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Wallet card */}
            <View style={s.walletCard}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{initials.toUpperCase()}</Text>
                <View style={s.avatarDot}>
                  <Text style={s.avatarDotTxt}>✦</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.walletEye}>MBC Collector</Text>
                <Text style={s.walletAddr}>{short}</Text>
              </View>
            </View>
            {/* Stats */}
            <View style={s.statsRow}>
              {[
                { v: owned.length, l: "Pieces" },
                {
                  v: totalValue ? `$${(totalValue / 100).toFixed(0)}` : "—",
                  l: "Value",
                },
                { v: owned.filter((t) => t.data.nfc_chip_id).length, l: "NFC" },
              ].map(({ v, l }) => (
                <View key={l} style={s.statCell}>
                  <Text style={s.statVal}>{v}</Text>
                  <Text style={s.statLbl}>{l}</Text>
                </View>
              ))}
            </View>
            {loading ? (
              <View style={s.centerPad}>
                <ActivityIndicator color={C.gold} />
                <Text style={s.loadTxt}>Loading your pieces...</Text>
              </View>
            ) : loadErr ? (
              <View style={s.centerPad}>
                <Text style={s.errTxt}>{loadErr}</Text>
                <TouchableOpacity
                  style={s.retryBtn}
                  onPress={() => loadOwned(wallet!)}
                >
                  <Text style={s.retryTxt}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : owned.length === 0 ? (
              <View style={s.centerPad}>
                <Text style={s.emptyTitle}>No pieces found</Text>
                <Text style={s.emptySub}>
                  This wallet doesn't own any MBC tokens yet.
                </Text>
                <TouchableOpacity
                  style={s.connectBtn}
                  onPress={() => router.push("/collection")}
                >
                  <Text style={s.connectBtnTxt}>Browse Collection →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={s.gridEye}>Your Pieces</Text>
            )}
          </>
        }
        ListFooterComponent={<View style={{ height: 48 }} />}
      />

      {/* ── PIECE SHEET ── */}
      <Modal
        visible={sheet === "piece" && !!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheet("none")}
      >
        {selected && (
          <View style={s.sheetRoot}>
            <View style={s.sheetBar} />
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity
                style={s.sheetClose}
                onPress={() => setSheet("none")}
              >
                <Text style={s.sheetCloseTxt}>✕ Close</Text>
              </TouchableOpacity>
            </SafeAreaView>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Image */}
              <View style={s.sheetImg}>
                {imgUrl(selected.data.image) ? (
                  <Image
                    source={{ uri: imgUrl(selected.data.image) }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={s.sheetImgInit}>
                    {(selected.data.name || "MB")
                      .split(" ")
                      .map((w: string) => w[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </Text>
                )}
                <View style={s.tokenBadge}>
                  <Text style={s.tokenBadgeTxt}>Token #{selected.tokenId}</Text>
                </View>
              </View>
              <View style={s.sheetContent}>
                <Text style={s.sheetEye}>
                  MBC · {selected.data.collection || "Collection"}
                </Text>
                <Text style={s.sheetTitle}>{selected.data.name}</Text>
                {selected.data.silhouette ? (
                  <Text style={s.sheetModel}>
                    {selected.data.silhouette} · {selected.data.edition_type}
                  </Text>
                ) : null}

                <View style={s.traitBox}>
                  {(
                    [
                      ["Texture", selected.data.primary_texture],
                      ["Hardware", selected.data.hardware],
                      ["Rarity", selected.data.trait_rarity],
                      ["Serial", selected.data.serial_number],
                    ] as [string, string][]
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <View key={k} style={s.traitRow}>
                        <Text style={s.traitKey}>{k}</Text>
                        <Text style={s.traitVal}>{v}</Text>
                      </View>
                    ))}
                </View>

                {/* Actions */}
                <View style={s.actionGrid}>
                  {[
                    {
                      label: "Share",
                      icon: "↗",
                      onPress: () => {
                        setSheet("none");
                        doShare();
                      },
                    },
                    {
                      label: "QR Code",
                      icon: "⊞",
                      onPress: () => setSheet("qr"),
                    },
                    {
                      label: "Certificate",
                      icon: "◻",
                      onPress: () => setSheet("cert"),
                    },
                    {
                      label: "Transfer",
                      icon: "→",
                      onPress: () => setSheet("transfer"),
                      danger: true,
                    },
                  ].map(({ label, icon, onPress, danger }) => (
                    <TouchableOpacity
                      key={label}
                      style={[s.actionBtn, danger && s.actionBtnDanger]}
                      onPress={onPress}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.actionIcon, danger && { color: C.red }]}>
                        {icon}
                      </Text>
                      <Text style={[s.actionLabel, danger && { color: C.red }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={s.detailBtn}
                  onPress={() => {
                    setSheet("none");
                    router.push({
                      pathname: "/piece/[id]",
                      params: { id: selected.tokenId },
                    });
                  }}
                >
                  <Text style={s.detailBtnTxt}>
                    View Full Blockchain Detail →
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── QR SHEET ── */}
      <Modal
        visible={sheet === "qr"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheet("none")}
      >
        <View style={s.sheetRoot}>
          <View style={s.sheetBar} />
          <SafeAreaView edges={["top"]}>
            <TouchableOpacity
              style={s.sheetClose}
              onPress={() => setSheet("none")}
            >
              <Text style={s.sheetCloseTxt}>✕ Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
          <View style={s.qrContent}>
            <Text style={s.qrEye}>Verify Ownership</Text>
            <Text style={s.qrTitle}>{selected?.data.name}</Text>
            <Text style={s.qrSub}>Token #{selected?.tokenId}</Text>
            <View style={s.qrBox}>
              {/* QR placeholder — in production add expo-camera based QR or react-native-qrcode-svg */}
              <Text style={s.qrBoxLabel}>Stellar Explorer Link</Text>
              <Text
                style={s.qrUrl}
                selectable
              >{`${EXPLORER}/contract/${CONTRACT}`}</Text>
            </View>
            <Text style={s.qrNote}>
              Copy and open this URL to verify ownership on Stellar Explorer. In
              production, this will display a scannable QR code.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── TRANSFER SHEET ── */}
      <Modal
        visible={sheet === "transfer"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheet("none")}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.sheetRoot}>
            <View style={s.sheetBar} />
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity
                style={s.sheetClose}
                onPress={() => {
                  setSheet("none");
                  setToAddr("");
                  setToAddrErr("");
                  setTransferMsg("");
                }}
              >
                <Text style={s.sheetCloseTxt}>✕ Cancel</Text>
              </TouchableOpacity>
            </SafeAreaView>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={s.sheetContent}>
                <Text style={s.sheetEye}>Transfer Piece</Text>
                <Text style={s.sheetTitle}>{selected?.data.name}</Text>
                <View style={s.warnBox}>
                  <Text style={s.warnTxt}>
                    ⚠️ This is permanent. The piece will leave your wallet
                    immediately and cannot be undone.
                  </Text>
                </View>
                <Text style={s.inputLabel}>Recipient Stellar Address</Text>
                <TextInput
                  style={[s.input, toAddrErr ? s.inputErr : null]}
                  value={toAddr}
                  onChangeText={(t) => {
                    setToAddr(t);
                    setToAddrErr("");
                  }}
                  placeholder="G... recipient address"
                  placeholderTextColor={C.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {toAddrErr ? <Text style={s.errTxt}>{toAddrErr}</Text> : null}
                {transferMsg ? (
                  <Text style={s.transferMsg}>{transferMsg}</Text>
                ) : null}
                <TouchableOpacity
                  style={[s.transferBtn, transferring && s.btnOff]}
                  onPress={doTransfer}
                  disabled={transferring}
                  activeOpacity={0.85}
                >
                  {transferring ? (
                    <ActivityIndicator color={C.black} size="small" />
                  ) : (
                    <Text style={s.transferBtnTxt}>Transfer NFT →</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CERTIFICATE SHEET ── */}
      <Modal
        visible={sheet === "cert"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheet("none")}
      >
        {selected && (
          <View style={s.sheetRoot}>
            <View style={s.sheetBar} />
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity
                style={s.sheetClose}
                onPress={() => setSheet("none")}
              >
                <Text style={s.sheetCloseTxt}>✕ Close</Text>
              </TouchableOpacity>
            </SafeAreaView>
            <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
              <View style={s.certCard}>
                <View style={s.certInner}>
                  <Text style={s.certBrand}>Michael By Christian</Text>
                  <View style={s.certRule} />
                  <Text style={s.certH1}>Certificate</Text>
                  <Text style={s.certH2}>of Authenticity & Ownership</Text>
                  <View style={s.certRule} />
                  <Text style={s.certPiece}>{selected.data.name}</Text>
                  <Text style={s.certEdition}>
                    {selected.data.edition_type || "Physical Provenance"} ·
                    Token #{selected.tokenId}
                  </Text>
                  {(
                    [
                      ["Silhouette", selected.data.silhouette],
                      ["Texture", selected.data.primary_texture],
                      ["Hardware", selected.data.hardware],
                      ["Auth", selected.data.authentication],
                      ["Serial", selected.data.serial_number],
                      ["Collection", selected.data.collection],
                      [
                        "Year",
                        selected.data.tailored_year
                          ? String(selected.data.tailored_year)
                          : "",
                      ],
                      ["Rarity", selected.data.trait_rarity],
                    ] as [string, string][]
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <View key={k} style={s.certRow}>
                        <Text style={s.certKey}>{k}</Text>
                        <Text style={s.certVal}>{v}</Text>
                      </View>
                    ))}
                  <View style={s.certChain}>
                    <Text style={s.certChainEye}>On-Chain Proof</Text>
                    <Text style={s.certChainLine}>
                      Contract: {CONTRACT.slice(0, 12)}...{CONTRACT.slice(-6)}
                    </Text>
                    <Text style={s.certChainLine}>
                      Token ID: #{selected.tokenId}
                    </Text>
                    <Text style={s.certChainLine}>
                      Owner: {wallet.slice(0, 10)}...{wallet.slice(-6)}
                    </Text>
                    <Text style={s.certChainLine}>
                      Network: Stellar · Soroban
                    </Text>
                    <Text style={s.certChainLine}>
                      Issued:{" "}
                      {new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text style={s.certSeal}>✦</Text>
                  <Text style={s.certFooterTxt}>michaelbychristian.com</Text>
                </View>
              </View>
              <Text style={s.certNote}>
                Screenshot this certificate as proof of ownership. Tap the NFC
                chip on your physical bag to verify it matches this on-chain
                record.
              </Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backTxt: { fontSize: 11, color: C.muted },
  headerTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "900",
    color: C.cream,
  },
  headerEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  disconnectTxt: { fontSize: 10, color: C.red },

  // Gate
  gateWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  gateIcon: { fontSize: 44, color: C.gold, marginBottom: 20 },
  gateEye: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 10,
  },
  gateTitle: {
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 12,
    textAlign: "center",
  },
  gateSub: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  gateFeatures: {
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    width: "100%",
    marginBottom: 24,
  },
  gateFeature: { fontSize: 12, color: C.muted, lineHeight: 27 },
  gateLink: { fontSize: 11, color: C.gold, textAlign: "center" },

  // Input
  input: {
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    color: C.cream,
    padding: 14,
    fontSize: 12,
    fontFamily: "monospace",
    width: "100%",
    marginBottom: 10,
  },
  inputErr: { borderColor: C.red },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 8,
  },
  errTxt: {
    fontSize: 11,
    color: C.red,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  connectBtn: {
    backgroundColor: C.gold,
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  connectBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.black,
  },
  btnOff: { opacity: 0.4 },

  // Wallet card
  walletCard: {
    margin: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 16,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.warm,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "900",
    color: C.goldLt,
  },
  avatarDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: C.gold,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarDotTxt: { fontSize: 8, color: C.black, fontWeight: "700" },
  walletEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 4,
  },
  walletAddr: {
    fontSize: 14,
    color: C.cream,
    fontFamily: "monospace",
    fontWeight: "500",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 1,
  },
  statCell: {
    flex: 1,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
  },
  statVal: {
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    color: C.goldLt,
    marginBottom: 3,
  },
  statLbl: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },

  centerPad: { padding: 40, alignItems: "center", gap: 12 },
  loadTxt: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 8,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
  },
  emptyTitle: {
    fontSize: 16,
    color: C.cream,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  gridEye: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginLeft: 16,
    marginBottom: 8,
  },

  // Grid
  grid: { padding: 1, paddingBottom: 24 },
  row: { gap: 1, marginBottom: 1 },
  card: {
    width: CARD_W,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardImg: {
    width: CARD_W,
    height: CARD_W,
    backgroundColor: C.warm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInit: {
    fontFamily: "serif",
    fontSize: 48,
    fontWeight: "900",
    color: "rgba(184,150,62,0.1)",
  },
  tokenBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(12,11,9,0.85)",
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tokenBadgeTxt: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.gold,
  },
  nfcBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(91,175,133,0.15)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  nfcBadgeTxt: { fontSize: 7, color: C.green },
  cardBody: { padding: 12 },
  cardSilhouette: {
    fontSize: 7,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 3,
  },
  cardName: {
    fontFamily: "serif",
    fontSize: 14,
    fontWeight: "700",
    color: C.cream,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardPrice: {
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    color: C.goldLt,
  },

  // Sheet base
  sheetRoot: { flex: 1, backgroundColor: C.black },
  sheetBar: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetClose: { padding: 16, paddingBottom: 4 },
  sheetCloseTxt: { fontSize: 12, color: C.muted },
  sheetImg: {
    width: "100%",
    height: width * 0.55,
    backgroundColor: C.warm,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetImgInit: {
    fontFamily: "serif",
    fontSize: 72,
    fontWeight: "900",
    color: "rgba(184,150,62,0.1)",
  },
  sheetContent: { padding: 24 },
  sheetEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 6,
  },
  sheetTitle: {
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "900",
    color: C.cream,
    lineHeight: 28,
    marginBottom: 6,
  },
  sheetModel: { fontSize: 11, color: C.muted, marginBottom: 20 },

  // Traits
  traitBox: {
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  traitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.charcoal,
  },
  traitKey: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
  },
  traitVal: { fontSize: 12, color: C.cream, fontWeight: "500" },

  // Action grid
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
    marginBottom: 16,
  },
  actionBtn: {
    width: (width - 48 - 1) / 2,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },
  actionBtnDanger: { borderColor: "rgba(192,97,74,0.3)" },
  actionIcon: { fontSize: 22, color: C.gold },
  actionLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  detailBtn: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
  },
  detailBtnTxt: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.gold,
  },

  // QR
  qrContent: { flex: 1, alignItems: "center", padding: 32 },
  qrEye: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 10,
  },
  qrTitle: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "900",
    color: C.cream,
    textAlign: "center",
    marginBottom: 4,
  },
  qrSub: { fontSize: 11, color: C.muted, marginBottom: 28 },
  qrBox: {
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  qrBoxLabel: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 12,
  },
  qrUrl: {
    fontSize: 11,
    color: C.goldLt,
    fontFamily: "monospace",
    textAlign: "center",
    lineHeight: 18,
  },
  qrNote: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },

  // Transfer
  warnBox: {
    backgroundColor: "rgba(192,97,74,0.08)",
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.3)",
    padding: 14,
    marginBottom: 20,
  },
  warnTxt: { fontSize: 12, color: C.red, lineHeight: 18 },
  transferBtn: {
    backgroundColor: C.gold,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  transferBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.black,
  },
  transferMsg: {
    fontSize: 12,
    color: C.green,
    marginTop: 10,
    textAlign: "center",
  },

  // Certificate
  certCard: {
    margin: 20,
    backgroundColor: C.cream,
    borderWidth: 2,
    borderColor: C.gold,
    padding: 4,
  },
  certInner: {
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    padding: 28,
    alignItems: "center",
  },
  certBrand: {
    fontSize: 8,
    letterSpacing: 5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 12,
  },
  certRule: {
    height: 1,
    backgroundColor: "rgba(184,150,62,0.3)",
    width: "80%",
    marginBottom: 14,
  },
  certH1: {
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "900",
    color: C.black,
    lineHeight: 36,
  },
  certH2: {
    fontFamily: "serif",
    fontSize: 15,
    fontStyle: "italic",
    color: C.muted,
    marginBottom: 14,
  },
  certPiece: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
    color: C.black,
    textAlign: "center",
    marginBottom: 4,
  },
  certEdition: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 18,
  },
  certRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(184,150,62,0.2)",
  },
  certKey: {
    fontSize: 9,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  certVal: {
    fontSize: 10,
    color: C.black,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  certChain: {
    backgroundColor: C.black,
    padding: 16,
    width: "100%",
    marginTop: 18,
    marginBottom: 14,
  },
  certChainEye: {
    fontSize: 7,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 10,
  },
  certChainLine: {
    fontSize: 10,
    color: C.muted,
    fontFamily: "monospace",
    lineHeight: 18,
  },
  certSeal: { fontSize: 28, color: C.gold, marginVertical: 12 },
  certFooterTxt: { fontSize: 9, color: C.muted, letterSpacing: 2 },
  certNote: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    marginHorizontal: 24,
    lineHeight: 18,
  },
});
