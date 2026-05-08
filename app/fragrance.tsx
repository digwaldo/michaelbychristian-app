// app/fragrance.tsx — Michael Christian Fragrances collection (light theme)

import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
};

const FRAGRANCES = [
  {
    id: "sweet-veil",
    name: "Sweet Veil",
    number: "No. 01",
    type: "Transparent Floral",
    concentration: "Parfum · 30%",
    desc: "A luminous transparent floral anchored by Hedione and pale rose. Opens like morning light through linen, dries to a whisper of white musk and clean skin.",
    topNotes: "Bergamot · Pink Pepper · Aldehydes",
    heartNotes: "Hedione · Pale Rose · Jasmine · Iris",
    baseNotes: "White Musk · Clean Skin · Ambrette",
    price30: 225,
    price50: 325,
    accent: "#B8963E",
    bottleBg: "#FBF7EE",
  },
  {
    id: "aladdin",
    name: "Aladdin",
    number: "No. 02",
    type: "Oriental Woody Floral",
    concentration: "Eau de Parfum",
    desc: "A rich, enveloping oriental built on oud, rose, and dark woods. Smoky and sensual with a saffron heart — a piece of the ancient Silk Road in every spray.",
    topNotes: "Saffron · Cardamom · Bergamot",
    heartNotes: "Rose · Oud · Jasmine Sambac",
    baseNotes: "Sandalwood · Amber · Dark Musk · Vetiver",
    price30: 195,
    price50: 285,
    accent: "#8C4A2A",
    bottleBg: "#FDF5F0",
  },
  {
    id: "homme-parfum",
    name: "Homme Parfum",
    number: "No. 03",
    type: "Aromatic Fougère Woody Iris",
    concentration: "Parfum",
    desc: "An aromatic fougère with a sharp iris heart softened by cedarwood and white musks. Clean, masculine, and unmistakably modern.",
    topNotes: "Lavender · Bergamot · Grapefruit",
    heartNotes: "Iris · Geranium · Violet Leaf",
    baseNotes: "Cedarwood · Sandalwood · White Musk · Oakmoss",
    price30: 195,
    price50: 285,
    accent: "#4A5C6B",
    bottleBg: "#F0F4F7",
  },
  {
    id: "beanie",
    name: "Beanie",
    number: "No. 04",
    type: "Aromatic Woody Chypre",
    concentration: "Parfum · 30%",
    desc: "A clean, mineral aromatic with a salty heart and warm earthy drydown. Juniper and Neroli open bright and fresh, settling into Orris, Tonka, and Labdanum.",
    topNotes: "Juniper Berry · Neroli · Apple Essence",
    heartNotes: "Dreamwood · Hedione · Sea Salt",
    baseNotes: "Orris Butter · Tonka Bean · Labdanum · Benzoin · Iso E Super",
    price30: 175,
    price50: 255,
    accent: "#5C6B4A",
    bottleBg: "#F0F4EE",
  },
  {
    id: "joopiter",
    name: "Joopiter",
    number: "No. 05",
    type: "Solar Citrus Oriental",
    concentration: "Parfum · 30%",
    desc: "A sun-drenched citrus oriental — Red Grapefruit, Bergamot, and Lemon opening into Jasmine and Orange, drying down to Frankincense, Ambroxan, and Tonka.",
    topNotes: "Red Grapefruit · Lemon · Bergamot · Apple Essence",
    heartNotes: "Jasmine · Orange Sweet · Hedione · Heliotrope",
    baseNotes:
      "Frankincense · Ambroxan · Tonka Bean · Vanilla · Cardamom · Patchouli",
    price30: 185,
    price50: 265,
    accent: "#8C6A1A",
    bottleBg: "#FDF8EE",
  },
];

export default function FragranceScreen() {
  return (
    <View style={s.root}>
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
          {/* Hero header */}
          <View style={s.hero}>
            <Text style={s.heroEye}>Michael Christian Fragrances</Text>
            <Text style={s.heroTitle}>
              The{"\n"}
              <Text style={s.heroTitleEm}>Collection</Text>
            </Text>
            <Text style={s.heroSub}>
              Three fragrances. Each limited. Each authenticated on-chain.{"\n"}
              Made in Baltimore — worn everywhere.
            </Text>
          </View>

          <View style={s.rule} />

          {/* Fragrance cards */}
          {FRAGRANCES.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={s.card}
              onPress={() =>
                router.push({
                  pathname: "/fragrance/[id]",
                  params: { id: f.id },
                } as any)
              }
              activeOpacity={0.88}
            >
              {/* Bottle image */}
              <View style={s.bottleWrap}>
                <Image
                  source={require("../assets/perfume_bottle.png")}
                  style={s.bottleImg}
                  resizeMode="contain"
                />
                <Text style={[s.bottleNumber, { color: f.accent }]}>
                  {f.number}
                </Text>
              </View>

              {/* Card info */}
              <View style={s.cardInfo}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{f.name}</Text>
                    <Text style={s.cardType}>
                      {f.type} · {f.concentration}
                    </Text>
                  </View>
                  <View style={[s.cardArrow, { borderColor: f.accent }]}>
                    <Text style={[s.cardArrowTxt, { color: f.accent }]}>→</Text>
                  </View>
                </View>

                <Text style={s.cardDesc} numberOfLines={2}>
                  {f.desc}
                </Text>

                {/* Notes */}
                <View style={s.notesBox}>
                  {[
                    { label: "Top", val: f.topNotes },
                    { label: "Heart", val: f.heartNotes },
                    { label: "Base", val: f.baseNotes },
                  ].map((note) => (
                    <View key={note.label} style={s.noteRow}>
                      <Text style={[s.noteLabel, { color: f.accent }]}>
                        {note.label}
                      </Text>
                      <Text style={s.noteVal} numberOfLines={1}>
                        {note.val}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Price row */}
                <View style={s.cardFoot}>
                  <View>
                    <Text style={[s.cardPrice, { color: f.accent }]}>
                      From ${f.price30}
                    </Text>
                    <Text style={s.cardPriceSub}>30 ml or 50 ml</Text>
                  </View>
                  <View
                    style={[
                      s.inquireTag,
                      {
                        borderColor: f.accent,
                        backgroundColor: f.accent + "0D",
                      },
                    ]}
                  >
                    <Text style={[s.inquireTagTxt, { color: f.accent }]}>
                      Inquire →
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* NFC footer */}
          <View style={s.nfcStrip}>
            <View style={s.nfcDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.nfcTitle}>
                ✦ NFC Authentication on Every Bottle
              </Text>
              <Text style={s.nfcSub}>
                Tap the bottle cap to verify provenance on the Stellar
                blockchain. Each fragrance is a limited edition — authenticated
                and immutable.
              </Text>
            </View>
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
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

  card: {
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    marginBottom: 16,
    overflow: "hidden",
  },

  bottleWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#0C0B09",
    backgroundColor: "#0C0B09",
  },
  bottleImg: { width: 120, height: 160 },
  bottleNumber: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 12,
    fontWeight: "600",
    color: "rgba(212,175,106,0.7)",
  },

  cardInfo: { padding: 16 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
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
  cardArrow: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cardArrowTxt: { fontSize: 16, fontWeight: "300" },
  cardDesc: {
    fontSize: 13,
    color: T.textSub,
    lineHeight: 20,
    marginBottom: 16,
  },

  notesBox: {
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  noteLabel: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    width: 40,
    marginRight: 8,
    fontWeight: "600",
    flexShrink: 0,
  },
  noteVal: { fontSize: 11, color: T.text, flex: 1 },

  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPrice: { fontFamily: "serif", fontSize: 20, fontWeight: "700" },
  cardPriceSub: {
    fontSize: 9,
    letterSpacing: 1,
    color: T.textMuted,
    marginTop: 2,
  },
  inquireTag: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  inquireTagTxt: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  nfcStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.greenBorder,
    backgroundColor: T.greenBg,
    marginBottom: 8,
  },
  nfcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.green,
    marginTop: 4,
    flexShrink: 0,
  },
  nfcTitle: {
    fontSize: 11,
    color: T.green,
    fontWeight: "600",
    marginBottom: 4,
  },
  nfcSub: { fontSize: 11, color: T.textSub, lineHeight: 18 },
});
