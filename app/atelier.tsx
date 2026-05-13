// app/atelier.tsx — The Atelier: upcoming pieces (fragrance-page style feed)

import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
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
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const IS_WEB = Platform.OS === "web";
const MAX_W = IS_WEB ? 760 : undefined;

const T = {
  bg: "#FFFFFF",
  bgAlt: "#F8F6F2",
  bgDeep: "#F2EFE9",
  border: "#E8E4DC",
  text: "#1A1814",
  textSub: "#6B6458",
  textMuted: "#9A9088",
  gold: "#B8963E",
  greenBg: "#EEF7F2",
  greenBorder: "#A8D4BC",
  green: "#2D7A52",
  red: "#B84040",
};

const PIECES = [
  {
    id: "cordelia",
    name: "The Cordelia",
    number: "No. 01",
    type: "Bucket Bag",
    subtitle: "Hero Piece — Resort 2026",
    price: 585,
    drop: "Q3 2026",
    desc: "Our debut silhouette. A refined bucket bag with leather bow detail, chain-and-leather strap, and drawstring grommet closure. The Cordelia is for the woman who curates, not collects.",
    details: [
      "Leather bow detail",
      "Chain + leather strap",
      "Drawstring grommet closure",
      "Phygital authenticated",
    ],
    accent: "#B8963E",
    imageBg: "#0C0B09",
    colorways: [
      {
        name: "Rose Blush",
        hex: "#E8B4B4",
        image: require("../assets/renders/cordelia-pink.png"),
      },
      {
        name: "Crimson",
        hex: "#C0392B",
        image: require("../assets/renders/cordelia-red.png"),
      },
      {
        name: "Teal",
        hex: "#1A8A8A",
        image: require("../assets/renders/cordelia-teal.png"),
      },
      {
        name: "Lavender",
        hex: "#B89EC8",
        image: require("../assets/renders/cordelia-lavender.png"),
      },
    ],
  },
  {
    id: "venetia",
    name: "The Venetia",
    number: "No. 02",
    type: "Structured Satchel",
    subtitle: "Resort 2026",
    price: 695,
    drop: "Q3 2026",
    desc: "Patent leather with radiating seam architecture, dual buckle straps, and a T-bar turn-lock closure. Color-blocked construction — two leathers, one silhouette.",
    details: [
      "Patent leather body",
      "Radiating seam detail",
      "T-bar turn-lock closure",
      "Color-blocked construction",
    ],
    accent: "#2C6B6B",
    imageBg: "#F2F0EC",
    colorways: [
      {
        name: "Teal + Cream Handles",
        hex: "#2C6B6B",
        image: require("../assets/renders/venetia-1.png"),
      },
      {
        name: "Teal + Cream (Alt)",
        hex: "#3A7A7A",
        image: require("../assets/renders/venetia-2.png"),
      },
      {
        name: "Teal Monogram",
        hex: "#2A5A6A",
        image: require("../assets/renders/venetia-3.png"),
      },
      {
        name: "Teal + Burgundy Handles",
        hex: "#4A3A3A",
        image: require("../assets/renders/venetia-4.png"),
      },
    ],
  },
  {
    id: "haven",
    name: "The Haven Bowler",
    number: "No. 03",
    type: "Bowler Bag",
    subtitle: "Resort 2026",
    price: 495,
    drop: "Q3 2026",
    desc: "Domed silhouette meets downtown energy. Soft-formed, quietly opulent. Gold nameplate hardware, zipper closure, and contrast leather paneling at the base.",
    details: [
      "Gold nameplate hardware",
      "Contrast leather base",
      "Zip closure",
      "Pebbled leather body",
    ],
    accent: "#8C6F28",
    imageBg: "#2A2A2A",
    colorways: [
      {
        name: "Ivory + Tan",
        hex: "#F0E8D8",
        image: require("../assets/renders/haven-ivory.png"),
      },
      {
        name: "Noir",
        hex: "#1A1A1A",
        image: require("../assets/renders/haven-black.png"),
      },
      {
        name: "Blush + Sienna",
        hex: "#E8B4B4",
        image: require("../assets/renders/haven-pink.png"),
      },
      {
        name: "Lilac + Mauve",
        hex: "#C8B4D8",
        image: require("../assets/renders/haven-lavender.png"),
      },
      {
        name: "Forest Green",
        hex: "#1A3A1A",
        image: require("../assets/renders/haven-green.png"),
      },
    ],
  },
  {
    id: "sovereign",
    name: "The Sovereign",
    number: "No. 04",
    type: "Top-Handle Tote",
    subtitle: "Coming Soon — Q4 2026",
    price: 695,
    drop: "Q4 2026",
    desc: "Power dressing, distilled. Sharp lines, architectural form, chain hardware. The Sovereign is the statement piece in every MBC collection. Render dropping soon.",
    details: [
      "Top-handle + crossbody strap",
      "Architectural structured form",
      "Chain hardware",
      "Phygital authenticated",
    ],
    accent: "#2C6B6B",
    imageBg: "#F2F0EC",
    colorways: [
      {
        name: "Teal + Burgundy",
        hex: "#2C6B6B",
        image: require("../assets/renders/venetia-back.png"),
      },
    ],
  },
];

// ── Notify form ───────────────────────────────────────────────
function NotifyForm({
  piece,
  colorway,
  accent,
  onClose,
}: {
  piece: string;
  colorway: string;
  accent: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/atelier-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          piece,
          colorway,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View
        style={[
          n.box,
          { borderColor: T.greenBorder, backgroundColor: T.greenBg },
        ]}
      >
        <Text style={[n.icon, { color: T.green }]}>✦</Text>
        <Text style={n.successTitle}>You're on the list</Text>
        <Text style={n.successSub}>
          We'll notify you at {email} when {piece} drops.
        </Text>
        <TouchableOpacity style={n.closeBtn} onPress={onClose}>
          <Text style={n.closeTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={n.box}>
        <Text style={n.title}>{piece} · Notify Me</Text>
        <Text style={n.sub}>{colorway} · We'll email you when this drops.</Text>
        <Text style={n.label}>Full Name</Text>
        <TextInput
          style={n.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={T.textMuted}
          autoCapitalize="words"
        />
        <Text style={n.label}>Email</Text>
        <TextInput
          style={n.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={T.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {!!error && <Text style={n.errorTxt}>{error}</Text>}
        <TouchableOpacity
          style={[
            n.submitBtn,
            { backgroundColor: accent },
            submitting && { opacity: 0.6 },
          ]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={n.submitTxt}>Send Notification Request →</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={n.cancelWrap}>
          <Text style={n.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function AtelierScreen() {
  const { user, session, loading } = useAuth();
  const [selectedColorways, setSelectedColorways] = useState<
    Record<string, number>
  >({});

  // Auth gate — redirect if not signed in
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth" as any);
    }
  }, [loading, session]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: T.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={T.gold} size="large" />
      </View>
    );
  }

  if (!session) return null;
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [notifyForm, setNotifyForm] = useState<{
    piece: any;
    colorwayIdx: number;
  } | null>(null);

  useEffect(() => {
    loadLikes();
  }, [user]);

  async function loadLikes() {
    try {
      if (user) {
        const { data } = await supabase
          .from("atelier_user_likes")
          .select("piece_id")
          .eq("user_id", user.id);
        if (data) {
          const liked: Record<string, boolean> = {};
          data.forEach((r: any) => {
            liked[r.piece_id] = true;
          });
          setLikes(liked);
        }
      }
    } catch {}
  }

  async function toggleLike(pieceId: string) {
    if (!session) {
      router.push("/auth" as any);
      return;
    }
    const isLiked = likes[pieceId];
    setLikes((prev) => ({ ...prev, [pieceId]: !isLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [pieceId]: (prev[pieceId] || 0) + (isLiked ? -1 : 1),
    }));
    try {
      if (isLiked) {
        await supabase
          .from("atelier_user_likes")
          .delete()
          .eq("user_id", user!.id)
          .eq("piece_id", pieceId);
      } else {
        await supabase
          .from("atelier_user_likes")
          .insert({ user_id: user!.id, piece_id: pieceId });
      }
    } catch {
      setLikes((prev) => ({ ...prev, [pieceId]: isLiked }));
    }
  }

  return (
    <View style={s.root}>
      {/* Notify overlay */}
      {notifyForm && (
        <View style={s.overlay}>
          <NotifyForm
            piece={notifyForm.piece.name}
            colorway={notifyForm.piece.colorways[notifyForm.colorwayIdx].name}
            accent={notifyForm.piece.accent}
            onClose={() => setNotifyForm(null)}
          />
        </View>
      )}

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
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/" as any)
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.topLogo}>
            Michael <Text style={s.topLogoEm}>By Christian</Text>
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={[
            s.content,
            MAX_W
              ? { maxWidth: MAX_W, alignSelf: "center" as const, width: "100%" }
              : {},
          ]}
        >
          {/* Header */}
          <View style={s.hero}>
            <Text style={s.heroEye}>Upcoming Pieces · Preview Collection</Text>
            <Text style={s.heroTitle}>
              The{"\n"}
              <Text style={s.heroTitleEm}>Atelier</Text>
            </Text>
            <Text style={s.heroSub}>
              Four silhouettes. Fifteen colorways. Each phygital authenticated.
              {"\n"}
              Designed in Baltimore — dropping 2026.
            </Text>
          </View>

          <View style={s.rule} />

          {/* Piece feed — mirrors fragrance card layout */}
          {PIECES.map((piece) => {
            const cwIdx = selectedColorways[piece.id] || 0;
            const cw = piece.colorways[cwIdx];
            const isLiked = likes[piece.id];
            const likeCount = likeCounts[piece.id] || 0;

            return (
              <View key={piece.id} style={s.card}>
                {/* Dark image panel — all colorways preloaded, only active shown */}
                <View style={[s.imageWrap, { backgroundColor: piece.imageBg }]}>
                  {piece.colorways.map((c: any, i: number) => (
                    <Image
                      key={i}
                      source={c.image}
                      style={[s.bagImg, i !== cwIdx && s.hidden]}
                      resizeMode="contain"
                    />
                  ))}
                  <Text style={[s.bagNumber, { color: piece.accent }]}>
                    {piece.number}
                  </Text>
                </View>

                {/* Card info — mirrors fragrance cardInfo */}
                <View style={s.cardInfo}>
                  <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName}>{piece.name}</Text>
                      <Text style={s.cardType}>{piece.type}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[s.cardPrice, { color: piece.accent }]}>
                        ${piece.price.toLocaleString()}
                      </Text>
                      <Text style={s.cardPriceSub}>Est. Retail</Text>
                    </View>
                  </View>

                  <Text style={[s.cardSubtitle, { color: piece.accent }]}>
                    {piece.subtitle}
                  </Text>
                  <Text style={s.cardDesc} numberOfLines={3}>
                    {piece.desc}
                  </Text>

                  {/* Details rows — like fragrance notes box */}
                  <View style={s.detailsBox}>
                    {piece.details.map((d, i) => (
                      <View
                        key={i}
                        style={[
                          s.detailRow,
                          i < piece.details.length - 1 && s.detailBorder,
                        ]}
                      >
                        <Text style={[s.detailDot, { color: piece.accent }]}>
                          ✦
                        </Text>
                        <Text style={s.detailVal}>{d}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Colorway selector */}
                  <View style={s.colorwaySection}>
                    <View style={s.colorwayRow}>
                      <Text style={s.colorwayLbl}>Colorways</Text>
                      <View style={s.dots}>
                        {piece.colorways.map((c, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[
                              s.dot,
                              { backgroundColor: c.hex },
                              cwIdx === i && {
                                borderColor: piece.accent,
                                transform: [{ scale: 1.2 }],
                              },
                            ]}
                            onPress={() =>
                              setSelectedColorways((prev) => ({
                                ...prev,
                                [piece.id]: i,
                              }))
                            }
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={s.colorwayName}>{cw.name}</Text>
                  </View>

                  {/* Footer — notify + like + drop */}
                  <View style={s.cardFoot}>
                    <TouchableOpacity
                      style={[
                        s.notifyTag,
                        {
                          borderColor: piece.accent,
                          backgroundColor: piece.accent + "0D",
                        },
                      ]}
                      onPress={() =>
                        setNotifyForm({ piece, colorwayIdx: cwIdx })
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={[s.notifyTagTxt, { color: piece.accent }]}>
                        Notify Me →
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        s.likeBtn,
                        isLiked && { borderColor: piece.accent },
                      ]}
                      onPress={() => toggleLike(piece.id)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[s.likeIcon, isLiked && { color: piece.accent }]}
                      >
                        {isLiked ? "♥" : "♡"}
                      </Text>
                      {likeCount > 0 && (
                        <Text
                          style={[
                            s.likeCount,
                            isLiked && { color: piece.accent },
                          ]}
                        >
                          {likeCount}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <Text style={s.dropDate}>Est. Drop — {piece.drop}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Footer strip — like fragrance NFC strip */}
          <View style={s.footerStrip}>
            <View style={s.footerDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.footerTitle}>
                ✦ Each Piece Phygital Authenticated
              </Text>
              <Text style={s.footerSub}>
                Every MBC bag arrives with an on-chain Authentication Contract
                on the Stellar blockchain — permanent provenance, verifiable
                ownership, forever.
              </Text>
            </View>
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Notify form styles ────────────────────────────────────────
const n = StyleSheet.create({
  box: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    padding: 28,
    margin: 24,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  icon: { fontSize: 24, textAlign: "center", marginBottom: 10 },
  title: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    marginBottom: 4,
  },
  sub: { fontSize: 11, color: T.textSub, marginBottom: 20 },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textSub,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bgAlt,
    color: T.text,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  errorTxt: { fontSize: 11, color: T.red, marginBottom: 10 },
  submitBtn: { padding: 14, alignItems: "center", marginBottom: 10 },
  submitTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  cancelWrap: { alignItems: "center", paddingVertical: 8 },
  cancelTxt: { fontSize: 10, color: T.textMuted },
  successTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    textAlign: "center",
    marginBottom: 6,
  },
  successSub: {
    fontSize: 12,
    color: T.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: T.greenBorder,
    padding: 12,
    alignItems: "center",
  },
  closeTxt: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: T.green,
  },
});

// ── Main styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },

  topBar: {
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backTxt: { fontSize: 11, color: T.textSub },
  topLogo: {
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    color: T.text,
  },
  topLogoEm: { fontStyle: "italic", fontWeight: "400", color: T.gold },

  content: { paddingHorizontal: 20 },

  hero: { paddingTop: 28, paddingBottom: 20 },
  heroEye: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: T.gold,
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "900",
    color: T.text,
    lineHeight: 38,
    marginBottom: 14,
  },
  heroTitleEm: { fontStyle: "italic", fontWeight: "400", color: T.gold },
  heroSub: { fontSize: 13, color: T.textSub, lineHeight: 22 },

  rule: { height: 1, backgroundColor: T.border, marginBottom: 24 },

  // Card — same structure as fragrance card
  card: {
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    marginBottom: 16,
    overflow: "hidden",
  },

  // Dark image panel — matches fragrance bottleWrap
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  bagImg: { width: 260, height: 200 },
  hidden: { position: "absolute", opacity: 0, width: 260, height: 200 },
  bagNumber: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 12,
    fontWeight: "600",
  },

  // White info panel — matches fragrance cardInfo
  cardInfo: { padding: 20 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardName: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "900",
    color: T.text,
    marginBottom: 3,
  },
  cardType: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textSub,
  },
  cardPrice: { fontFamily: "serif", fontSize: 20, fontWeight: "700" },
  cardPriceSub: {
    fontSize: 9,
    letterSpacing: 1,
    color: T.textMuted,
    marginTop: 1,
  },
  cardSubtitle: {
    fontFamily: "serif",
    fontStyle: "italic",
    fontSize: 13,
    marginBottom: 12,
  },
  cardDesc: {
    fontSize: 13,
    color: T.textSub,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Details — like fragrance notes box
  detailsBox: {
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: T.bg,
  },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  detailDot: { fontSize: 8, marginRight: 10, width: 12 },
  detailVal: { fontSize: 12, color: T.text, flex: 1 },

  // Colorway
  colorwaySection: { marginBottom: 16 },
  colorwayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 5,
  },
  colorwayLbl: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: T.textMuted,
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  colorwayName: { fontSize: 10, color: T.textSub, fontStyle: "italic" },

  // Footer row — like fragrance cardFoot
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  notifyTag: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 },
  notifyTagTxt: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  likeBtn: {
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  likeIcon: { fontSize: 14, color: T.textMuted },
  likeCount: { fontSize: 11, color: T.textMuted },
  dropDate: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textMuted,
    marginLeft: "auto",
  },

  // Footer strip — like fragrance NFC strip
  footerStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.greenBorder,
    backgroundColor: T.greenBg,
    marginBottom: 8,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.green,
    marginTop: 4,
    flexShrink: 0,
  },
  footerTitle: {
    fontSize: 11,
    color: T.green,
    fontWeight: "600",
    marginBottom: 4,
  },
  footerSub: { fontSize: 11, color: T.textSub, lineHeight: 18 },
});
