// app/fragrance.tsx — Michael Christian Fragrances collection

import { router } from "expo-router";
import React from "react";
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "../lib/theme";

const IS_WEB = Platform.OS === "web";
const { width } = Dimensions.get("window");
const MAX_W = IS_WEB ? 760 : undefined;

const FRAGRANCES = [
  {
    id: "sweet-veil",
    name: "Sweet Veil",
    number: "No. 01",
    type: "Transparent Floral",
    concentration: "Parfum",
    desc: "A luminous transparent floral anchored by Hedione and pale rose. Opens like morning light through linen, dries to a whisper of white musk and clean skin.",
    topNotes: "Bergamot · Pink Pepper · Aldehydes",
    heartNotes: "Hedione · Pale Rose · Jasmine · Iris",
    baseNotes: "White Musk · Clean Skin · Ambrette",
    price30: 185,
    price50: 265,
    accent: C.goldLt,
    available: true,
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
    accent: "#C0614A",
    available: true,
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
    accent: C.silver,
    available: true,
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
          <View style={{ alignItems: "center" }}>
            <Text style={s.topEye}>Michael By Christian</Text>
          </View>
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
          {/* Hero */}
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
          {FRAGRANCES.map((f, idx) => (
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
              {/* Bottle visual */}
              <View style={[s.bottleWrap, { borderColor: f.accent + "33" }]}>
                <View style={[s.bottleCap, { backgroundColor: f.accent }]} />
                <View
                  style={[s.bottleNeck, { borderColor: f.accent + "66" }]}
                />
                <View style={[s.bottleBody, { borderColor: f.accent + "55" }]}>
                  <Text style={[s.bottleName, { color: f.accent }]}>
                    {f.name}
                  </Text>
                  <Text style={s.bottleBrand}>MBC</Text>
                </View>
              </View>

              {/* Info */}
              <View style={s.cardInfo}>
                <Text style={s.cardNumber}>{f.number}</Text>
                <Text style={s.cardName}>{f.name}</Text>
                <Text style={s.cardType}>{f.type}</Text>
                <Text style={s.cardDesc} numberOfLines={3}>
                  {f.desc}
                </Text>

                {/* Notes preview */}
                <View style={s.notesPreview}>
                  <View style={s.noteRow}>
                    <Text style={s.noteLabel}>Top</Text>
                    <Text style={s.noteVal} numberOfLines={1}>
                      {f.topNotes}
                    </Text>
                  </View>
                  <View style={s.noteRow}>
                    <Text style={s.noteLabel}>Heart</Text>
                    <Text style={s.noteVal} numberOfLines={1}>
                      {f.heartNotes}
                    </Text>
                  </View>
                  <View style={s.noteRow}>
                    <Text style={s.noteLabel}>Base</Text>
                    <Text style={s.noteVal} numberOfLines={1}>
                      {f.baseNotes}
                    </Text>
                  </View>
                </View>

                {/* Price + CTA */}
                <View style={s.cardFoot}>
                  <View>
                    <Text style={s.cardPrice}>From ${f.price30}</Text>
                    <Text style={s.cardPriceSub}>USD · 30 or 50 ml</Text>
                  </View>
                  <View style={s.cardBtn}>
                    <Text style={s.cardBtnTxt}>View →</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* NFC strip */}
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
  root: { flex: 1, backgroundColor: C.black },
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
  backTxt: { fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  topEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
  },

  content: { paddingHorizontal: 20 },

  hero: { paddingTop: 36, paddingBottom: 28 },
  heroEye: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "900",
    color: C.cream,
    lineHeight: 38,
    marginBottom: 14,
  },
  heroTitleEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  heroSub: { fontSize: 13, color: C.muted, lineHeight: 22 },

  rule: { height: 1, backgroundColor: C.border, marginBottom: 24 },

  card: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.charcoal,
    marginBottom: 16,
    overflow: "hidden",
  },
  bottleWrap: {
    backgroundColor: "#0C0B09",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
  },
  bottleCap: { width: 36, height: 10, borderRadius: 2, marginBottom: 0 },
  bottleNeck: {
    width: 26,
    height: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderRadius: 2,
  },
  bottleBody: {
    width: 70,
    height: 110,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 14,
    backgroundColor: "rgba(212,175,106,0.04)",
  },
  bottleName: {
    fontSize: 10,
    fontFamily: "serif",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  bottleBrand: {
    fontSize: 6,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 2,
  },

  cardInfo: { padding: 20 },
  cardNumber: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 4,
  },
  cardName: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 4,
  },
  cardType: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 12,
  },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 16 },

  notesPreview: {
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  noteLabel: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    width: 36,
    marginRight: 8,
  },
  noteVal: { fontSize: 11, color: C.cream, flex: 1 },

  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPrice: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
    color: C.goldLt,
  },
  cardPriceSub: { fontSize: 9, letterSpacing: 1, color: C.muted, marginTop: 2 },
  cardBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cardBtnTxt: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },

  nfcStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.3)",
    backgroundColor: "rgba(91,175,133,0.06)",
    marginBottom: 8,
  },
  nfcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
    marginTop: 4,
    flexShrink: 0,
  },
  nfcTitle: {
    fontSize: 11,
    color: C.green,
    fontWeight: "600",
    marginBottom: 4,
  },
  nfcSub: { fontSize: 11, color: C.muted, lineHeight: 18 },
});
