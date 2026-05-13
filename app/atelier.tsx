// app/atelier.tsx — The Atelier: upcoming pieces preview page (main branch)

import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const IS_WEB = Platform.OS === "web";
const { width: SCREEN_W } = Dimensions.get("window");
const IS_WIDE = IS_WEB && SCREEN_W >= 768;

// ── Dark luxury theme ─────────────────────────────────────────
const D = {
  bg: "#FFFFFF",
  bgAlt: "#F8F6F2",
  bgDeep: "#F2EFE9",
  bgDark: "#0C0B09",
  bgCard: "#F8F6F2",
  border: "#E8E4DC",
  borderDark: "#D4CFC6",
  text: "#1A1814",
  textSub: "#6B6458",
  textMuted: "#9A9088",
  gold: "#B8963E",
  goldLt: "#B8963E",
  green: "#2D7A52",
  greenBg: "#EEF7F2",
  greenBorder: "#A8D4BC",
  red: "#B84040",
};

// ── Piece data ────────────────────────────────────────────────
const PIECES = [
  {
    id: "cordelia",
    name: "The Cordelia",
    type: "Bucket Bag",
    tag: "Hero Piece",
    hero: true,
    price: 585,
    drop: "Q3 2026",
    desc: "Our debut silhouette. A refined bucket bag with leather bow detail, chain-and-leather strap, and drawstring grommet closure. The Cordelia is for the woman who curates, not collects.",
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
    type: "Structured Satchel",
    tag: null,
    hero: false,
    price: 695,
    drop: "Q3 2026",
    desc: "Patent leather with radiating seam architecture, dual buckle straps, and a T-bar turn-lock closure. Color-blocked construction — two leathers, one silhouette.",
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
        hex: "#4A6A7A",
        image: require("../assets/renders/venetia-4.png"),
      },
    ],
  },
  {
    id: "haven",
    name: "The Haven Bowler",
    type: "Bowler Bag",
    tag: null,
    hero: false,
    price: 495,
    drop: "Q3 2026",
    desc: "Domed silhouette meets downtown energy. Soft-formed, quietly opulent. Gold nameplate hardware, zipper closure, and contrast leather paneling at the base.",
    colorways: [
      {
        name: "Ivory + Tan",
        hex: "#F5EFE0",
        image: require("../assets/renders/haven-ivory.png"),
      },
      {
        name: "Noir",
        hex: "#1A1A1A",
        image: require("../assets/renders/haven-black.png"),
      },
      {
        name: "Blush + Sienna",
        hex: "#E8C4C4",
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
    type: "Top-Handle Tote",
    tag: "Coming Soon",
    hero: false,
    price: 695,
    drop: "Q4 2026",
    desc: "Power dressing, distilled. Sharp lines, architectural form, chain hardware. The Sovereign is the statement piece in every MBC collection. Render dropping soon.",
    colorways: [
      {
        name: "Teal + Burgundy (Back)",
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
  onClose,
}: {
  piece: string;
  colorway: string;
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
      <View style={f.box}>
        <Text style={f.successIcon}>✦</Text>
        <Text style={f.successTitle}>You're on the list</Text>
        <Text style={f.successSub}>
          We'll notify you at {email} when {piece} drops.
        </Text>
        <TouchableOpacity style={f.closeBtn} onPress={onClose}>
          <Text style={f.closeBtnTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={f.box}>
        <Text style={f.formTitle}>Notify Me — {piece}</Text>
        <Text style={f.formSub}>
          {colorway} · We'll email you when this drops.
        </Text>

        <Text style={f.label}>Full Name</Text>
        <TextInput
          style={f.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={D.textMuted}
          autoCapitalize="words"
        />

        <Text style={f.label}>Email</Text>
        <TextInput
          style={f.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={D.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {!!error && <Text style={f.errorTxt}>{error}</Text>}

        <TouchableOpacity
          style={[f.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={D.bg} size="small" />
          ) : (
            <Text style={f.submitTxt}>Notify Me →</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={f.cancelBtn} onPress={onClose}>
          <Text style={f.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function AtelierScreen() {
  const { user, session } = useAuth();
  const [selectedColorways, setSelectedColorways] = useState<
    Record<string, number>
  >({
    cordelia: 0,
    venetia: 0,
    haven: 0,
    sovereign: 0,
  });
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [notifyForm, setNotifyForm] = useState<{
    piece: string;
    colorway: string;
  } | null>(null);

  useEffect(() => {
    loadLikes();
  }, []);

  async function loadLikes() {
    try {
      const { data } = await supabase
        .from("atelier_likes")
        .select("piece_id, count");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((r: any) => {
          counts[r.piece_id] = r.count;
        });
        setLikeCounts(counts);
      }
      if (user) {
        const { data: userLikes } = await supabase
          .from("atelier_user_likes")
          .select("piece_id")
          .eq("user_id", user.id);
        if (userLikes) {
          const liked: Record<string, boolean> = {};
          userLikes.forEach((r: any) => {
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

  function selectColorway(pieceId: string, idx: number) {
    setSelectedColorways((prev) => ({ ...prev, [pieceId]: idx }));
  }

  const heroPiece = PIECES[0];
  const otherPieces = PIECES.slice(1);

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.topBar}>
        <View style={s.topBarInner}>
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

      {notifyForm && (
        <View style={s.overlay}>
          <NotifyForm
            piece={notifyForm.piece}
            colorway={notifyForm.colorway}
            onClose={() => setNotifyForm(null)}
          />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Page header ── */}
        <View style={s.pageHeader}>
          <Text style={s.pageEye}>Upcoming Pieces — Preview Collection</Text>
          <Text style={s.pageTitle}>
            The <Text style={s.pageTitleEm}>Atelier</Text>
          </Text>
          <View style={s.seasonTag}>
            <Text style={s.seasonTagTxt}>✦ Resort 2026 Preview ✦</Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          {[
            { val: "4", lbl: "Silhouettes" },
            { val: "15", lbl: "Colorways" },
            { val: "2026", lbl: "Est. Drop" },
          ].map(({ val, lbl }) => (
            <View key={lbl} style={s.statCell}>
              <Text style={s.statVal}>{val}</Text>
              <Text style={s.statLbl}>{lbl}</Text>
            </View>
          ))}
        </View>

        <View style={s.rule} />

        {/* ── Hero piece ── */}
        <PieceCard
          piece={heroPiece}
          selectedColorway={selectedColorways[heroPiece.id]}
          isLiked={likes[heroPiece.id]}
          likeCount={likeCounts[heroPiece.id] || 0}
          onSelectColorway={(i) => selectColorway(heroPiece.id, i)}
          onLike={() => toggleLike(heroPiece.id)}
          onNotify={(colorway) =>
            setNotifyForm({ piece: heroPiece.name, colorway })
          }
          hero
        />

        <View style={s.rule} />

        {/* ── Other pieces grid ── */}
        <View style={IS_WIDE ? s.gridWide : s.gridMobile}>
          {otherPieces.map((piece) => (
            <PieceCard
              key={piece.id}
              piece={piece}
              selectedColorway={selectedColorways[piece.id]}
              isLiked={likes[piece.id]}
              likeCount={likeCounts[piece.id] || 0}
              onSelectColorway={(i) => selectColorway(piece.id, i)}
              onLike={() => toggleLike(piece.id)}
              onNotify={(colorway) =>
                setNotifyForm({ piece: piece.name, colorway })
              }
              hero={false}
            />
          ))}
        </View>

        {/* ── Quote footer ── */}
        <View style={s.quoteSection}>
          <Text style={s.quoteMark}>"</Text>
          <Text style={s.quoteText}>
            Each piece arrives with a phygital certificate of authenticity — a
            living record on-chain that travels with the bag, forever.
          </Text>
          <Text style={s.quoteAttr}>— Michael By Christian</Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ── Piece card component ──────────────────────────────────────
function PieceCard({
  piece,
  selectedColorway,
  isLiked,
  likeCount,
  onSelectColorway,
  onLike,
  onNotify,
  hero,
}: {
  piece: any;
  selectedColorway: number;
  isLiked: boolean;
  likeCount: number;
  onSelectColorway: (i: number) => void;
  onLike: () => void;
  onNotify: (colorway: string) => void;
  hero: boolean;
}) {
  const cw = piece.colorways[selectedColorway];

  return (
    <View style={[s.card, hero && s.heroCard]}>
      {/* Image */}
      <View style={[s.imgWrap, hero && s.heroImgWrap]}>
        <Image source={cw.image} style={s.img} resizeMode="contain" />
        {piece.tag && (
          <View style={s.tagBadge}>
            <Text style={s.tagBadgeTxt}>{piece.tag}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.cardContent}>
        <View style={s.cardTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardName}>{piece.name}</Text>
            <Text style={s.cardType}>{piece.type}</Text>
          </View>
          <Text style={s.cardPrice}>
            ${piece.price.toLocaleString()}
            {"\n"}
            <Text style={s.cardPriceSub}>Est. Retail</Text>
          </Text>
        </View>

        <Text style={s.cardDesc}>{piece.desc}</Text>

        {/* Colorways */}
        <View style={s.colorwayRow}>
          <Text style={s.colorwayLbl}>Colorways</Text>
          <View style={s.dots}>
            {piece.colorways.map((c: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.dot,
                  { backgroundColor: c.hex },
                  selectedColorway === i && s.dotActive,
                ]}
                onPress={() => onSelectColorway(i)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              />
            ))}
          </View>
        </View>
        <Text style={s.colorwayName}>{cw.name}</Text>

        {/* Actions */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.notifyBtn}
            onPress={() => onNotify(cw.name)}
            activeOpacity={0.85}
          >
            <Text style={s.notifyBtnTxt}>Notify Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.likeBtn, isLiked && s.likeBtnActive]}
            onPress={onLike}
            activeOpacity={0.85}
          >
            <Text style={[s.likeIcon, isLiked && { color: D.gold }]}>
              {isLiked ? "♥" : "♡"}
            </Text>
            {likeCount > 0 && (
              <Text style={[s.likeCount, isLiked && { color: D.gold }]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.dropDate}>Est. Drop — {piece.drop}</Text>
      </View>
    </View>
  );
}

// ── Notify form styles ────────────────────────────────────────
const f = StyleSheet.create({
  box: {
    backgroundColor: D.bg,
    borderWidth: 1,
    borderColor: D.border,
    padding: 28,
    margin: 24,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  formTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: D.text,
    marginBottom: 4,
  },
  formSub: {
    fontSize: 11,
    color: D.textSub,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: D.textSub,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: D.border,
    backgroundColor: D.bgAlt,
    color: D.text,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  errorTxt: { fontSize: 11, color: D.red, marginBottom: 10 },
  submitBtn: {
    backgroundColor: D.gold,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  submitTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelTxt: { fontSize: 10, color: D.textMuted, letterSpacing: 1 },
  successIcon: {
    fontSize: 24,
    color: D.green,
    textAlign: "center",
    marginBottom: 10,
  },
  successTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: D.text,
    textAlign: "center",
    marginBottom: 6,
  },
  successSub: {
    fontSize: 12,
    color: D.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: D.border,
    padding: 12,
    alignItems: "center",
  },
  closeBtnTxt: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: D.textSub,
  },
});

// ── Main styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  topBar: {
    backgroundColor: D.bg,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backTxt: { fontSize: 11, color: D.textSub },
  topLogo: {
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    color: D.text,
  },
  topLogoEm: { fontStyle: "italic", fontWeight: "400", color: D.gold },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },

  pageHeader: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: D.bg,
  },
  pageEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: D.gold,
    marginBottom: 10,
  },
  pageTitle: {
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "900",
    color: D.text,
    lineHeight: 38,
  },
  pageTitleEm: { fontStyle: "italic", fontWeight: "400", color: D.gold },
  seasonTag: {
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 16,
  },
  seasonTagTxt: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: D.gold,
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  statCell: { flex: 1, alignItems: "center" },
  statVal: {
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "900",
    color: D.text,
    lineHeight: 28,
  },
  statLbl: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: D.textMuted,
    marginTop: 4,
  },

  rule: { height: 1, backgroundColor: D.border },

  gridWide: { flexDirection: "row", flexWrap: "wrap" },
  gridMobile: { flexDirection: "column" },

  // Card — fragrance-style: dark image panel + white content panel
  card: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    backgroundColor: D.bg,
  },
  heroCard: { backgroundColor: D.bg },

  // Dark image panel — matches fragrance bottle panel
  imgWrap: {
    height: 300,
    backgroundColor: D.bgDark,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroImgWrap: { height: 420, backgroundColor: D.bgDark },
  img: { width: "80%", height: "80%" },
  tagBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: D.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagBadgeTxt: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },

  // White content panel
  cardContent: { padding: 24, backgroundColor: D.bg },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardName: {
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "900",
    color: D.text,
    lineHeight: 26,
  },
  cardType: {
    fontFamily: "serif",
    fontStyle: "italic",
    fontSize: 13,
    color: D.gold,
    marginTop: 3,
  },
  cardPrice: {
    fontSize: 20,
    fontFamily: "serif",
    fontWeight: "700",
    color: D.gold,
    textAlign: "right",
    lineHeight: 24,
  },
  cardPriceSub: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: D.textMuted,
  },
  cardDesc: {
    fontSize: 13,
    color: D.textSub,
    lineHeight: 22,
    marginBottom: 20,
  },

  colorwayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  colorwayLbl: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: D.textMuted,
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  dotActive: { borderColor: D.gold, transform: [{ scale: 1.2 }] },
  colorwayName: {
    fontSize: 10,
    color: D.textSub,
    marginBottom: 20,
    letterSpacing: 0.5,
    fontStyle: "italic",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    alignItems: "center",
  },
  notifyBtn: {
    flex: 1,
    backgroundColor: D.gold,
    padding: 14,
    alignItems: "center",
  },
  notifyBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  likeBtn: {
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeBtnActive: {
    borderColor: D.gold,
    backgroundColor: "rgba(184,150,62,0.08)",
  },
  likeIcon: { fontSize: 16, color: D.textMuted },
  likeCount: { fontSize: 11, color: D.textMuted },

  dropDate: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: D.textMuted,
    textAlign: "right",
  },

  quoteSection: {
    borderTopWidth: 1,
    borderTopColor: D.border,
    padding: 40,
    alignItems: "center",
    backgroundColor: D.bgAlt,
  },
  quoteMark: {
    fontFamily: "serif",
    fontSize: 48,
    color: D.gold,
    lineHeight: 40,
    marginBottom: 8,
  },
  quoteText: {
    fontFamily: "serif",
    fontStyle: "italic",
    fontSize: 15,
    color: D.textSub,
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 480,
    marginBottom: 12,
  },
  quoteAttr: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: D.textMuted,
  },
});
