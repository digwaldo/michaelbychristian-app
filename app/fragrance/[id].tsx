// app/fragrance/[id].tsx — Individual fragrance detail page

import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "../../lib/theme";

const IS_WEB = Platform.OS === "web";
const MAX_W = IS_WEB ? 760 : undefined;

const FRAGRANCES: Record<string, any> = {
  "sweet-veil": {
    name: "Sweet Veil",
    number: "No. 01",
    type: "Transparent Floral",
    concentration: "Parfum · 22%",
    scentFamily: "Floral",
    desc: "A luminous transparent floral anchored by Hedione and pale rose. Opens like morning light through linen, dries to a whisper of white musk and clean skin. Luminous. Intimate. Unmistakably feminine.",
    topNotes: "Bergamot · Pink Pepper · Aldehydes",
    heartNotes: "Hedione · Pale Rose · Jasmine · Iris",
    baseNotes: "White Musk · Clean Skin · Ambrette",
    topDuration: 35,
    heartDuration: 65,
    baseDuration: 90,
    price30: 185,
    price50: 265,
    edition: "Limited · 50 bottles",
    batch: "SV-2026-E1",
    origin: "Baltimore, MD · USA",
    projection: "Moderate · Skin close",
    longevity: "6–8 hours",
    season: "Spring · Summer",
    accent: C.goldLt,
    accentRaw: "#D4AF6A",
  },
  aladdin: {
    name: "Aladdin",
    number: "No. 02",
    type: "Oriental Woody Floral",
    concentration: "Eau de Parfum · 18%",
    scentFamily: "Oriental",
    desc: "A rich, enveloping oriental built on oud, rose, and dark woods. Smoky and sensual with a saffron heart — a piece of the ancient Silk Road in every spray. Bold. Opulent. Unforgettable.",
    topNotes: "Saffron · Cardamom · Bergamot",
    heartNotes: "Rose · Oud · Jasmine Sambac",
    baseNotes: "Sandalwood · Amber · Dark Musk · Vetiver",
    topDuration: 40,
    heartDuration: 70,
    baseDuration: 95,
    price30: 195,
    price50: 285,
    edition: "Limited · 40 bottles",
    batch: "ALD-2026-E1",
    origin: "Baltimore, MD · USA",
    projection: "Strong · Projects well",
    longevity: "8–12 hours",
    season: "Fall · Winter",
    accent: "#C0614A",
    accentRaw: "#C0614A",
  },
  "homme-parfum": {
    name: "Homme Parfum",
    number: "No. 03",
    type: "Aromatic Fougère Woody Iris",
    concentration: "Parfum · 20%",
    scentFamily: "Fougère",
    desc: "An aromatic fougère with a sharp iris heart softened by cedarwood and white musks. Clean, masculine, and unmistakably modern — built for the man who moves between worlds.",
    topNotes: "Lavender · Bergamot · Grapefruit",
    heartNotes: "Iris · Geranium · Violet Leaf",
    baseNotes: "Cedarwood · Sandalwood · White Musk · Oakmoss",
    topDuration: 30,
    heartDuration: 60,
    baseDuration: 85,
    price30: 195,
    price50: 285,
    edition: "Limited · 40 bottles",
    batch: "HOM-2026-E1",
    origin: "Baltimore, MD · USA",
    projection: "Moderate · Versatile",
    longevity: "7–10 hours",
    season: "All seasons",
    accent: C.silver,
    accentRaw: "#9A8E7A",
  },
};

export default function FragranceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const f = FRAGRANCES[id as string];
  const [vol, setVol] = useState<30 | 50>(30);

  if (!f) {
    return (
      <View style={s.screen}>
        <Text style={s.errTitle}>Fragrance not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = vol === 30 ? f.price30 : f.price50;

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
            <Text style={s.backTxt}>← Fragrances</Text>
          </TouchableOpacity>
          <Text style={s.topEye}>Michael By Christian</Text>
          <View style={{ width: 80 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bottle hero */}
        <View style={[s.heroWrap, { borderBottomColor: f.accentRaw + "33" }]}>
          <View style={s.bottleScene}>
            <View style={[s.bottleCap, { backgroundColor: f.accent }]} />
            <View style={[s.bottleNeck, { borderColor: f.accentRaw + "55" }]} />
            <View style={[s.bottleBody, { borderColor: f.accentRaw + "44" }]}>
              <Text style={[s.bottleName, { color: f.accent }]}>{f.name}</Text>
              <Text style={s.bottleBrand}>MBC · {f.number}</Text>
            </View>
          </View>
        </View>

        <View
          style={[
            s.content,
            MAX_W
              ? { maxWidth: MAX_W, alignSelf: "center" as const, width: "100%" }
              : {},
          ]}
        >
          {/* Title block */}
          <View style={s.titleBlock}>
            <Text style={s.eyebrow}>
              Michael Christian Fragrances · {f.number}
            </Text>
            <Text style={s.title}>{f.name}</Text>
            <Text style={s.type}>{f.type}</Text>
            <Text style={s.desc}>{f.desc}</Text>
          </View>

          {/* Volume + price */}
          <View style={s.purchaseBlock}>
            <View style={s.priceRow}>
              <Text style={s.price}>${price}</Text>
              <Text style={s.priceSub}>USD · {f.concentration}</Text>
            </View>
            <View style={s.volRow}>
              <TouchableOpacity
                style={[
                  s.volBtn,
                  vol === 30 && {
                    borderColor: f.accentRaw,
                    backgroundColor: f.accentRaw + "11",
                  },
                ]}
                onPress={() => setVol(30)}
              >
                <Text style={[s.volBtnTxt, vol === 30 && { color: f.accent }]}>
                  30 ml
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.volBtn,
                  vol === 50 && {
                    borderColor: f.accentRaw,
                    backgroundColor: f.accentRaw + "11",
                  },
                ]}
                onPress={() => setVol(50)}
              >
                <Text style={[s.volBtnTxt, vol === 50 && { color: f.accent }]}>
                  50 ml
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[s.buyBtn, { backgroundColor: f.accent }]}
              activeOpacity={0.85}
              onPress={() =>
                Linking.openURL(
                  "mailto:youngcompltd@gmail.com?subject=Order — " +
                    f.name +
                    " " +
                    vol +
                    "ml",
                )
              }
            >
              <Text style={s.buyBtnTxt}>Purchase · Authenticate On-Chain</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} activeOpacity={0.85}>
              <Text style={s.ghostBtnTxt}>Inquire via Email →</Text>
            </TouchableOpacity>
          </View>

          {/* NFC strip */}
          <View style={s.nfcStrip}>
            <View style={s.nfcDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.nfcTitle}>✦ NFC Authentication Embedded</Text>
              <Text style={s.nfcSub}>
                Tap bottle cap to verify provenance on Stellar blockchain
              </Text>
            </View>
          </View>

          <View style={s.rule} />

          {/* Olfactory pyramid */}
          <Text style={s.sectionLbl}>Olfactory Composition</Text>
          <View style={s.pyramidBox}>
            {[
              {
                tier: "Top Notes · 0–30 min",
                notes: f.topNotes,
                duration: f.topDuration,
              },
              {
                tier: "Heart Notes · 30 min–3 hrs",
                notes: f.heartNotes,
                duration: f.heartDuration,
              },
              {
                tier: "Base Notes · 3+ hrs",
                notes: f.baseNotes,
                duration: f.baseDuration,
              },
            ].map((note, i) => (
              <View
                key={i}
                style={[
                  s.noteCard,
                  i < 2 && {
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                  },
                ]}
              >
                <Text style={s.noteTier}>{note.tier}</Text>
                <Text style={s.noteNotes}>{note.notes}</Text>
                <View style={s.durationBar}>
                  <View
                    style={[
                      s.durationFill,
                      {
                        width: `${note.duration}%` as any,
                        backgroundColor: f.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={s.rule} />

          {/* Details */}
          <Text style={s.sectionLbl}>Provenance & Details</Text>
          <View style={s.detailsBox}>
            {[
              ["Concentration", f.concentration],
              ["Scent family", f.scentFamily],
              ["Projection", f.projection],
              ["Longevity", f.longevity],
              ["Best season", f.season],
              ["Origin", f.origin],
              ["Edition", f.edition],
              ["Batch no.", f.batch],
              ["Blockchain", "Stellar · Soroban"],
              ["Royalty", "5% on secondary"],
            ].map(([key, val], i) => (
              <View
                key={i}
                style={[
                  s.detailRow,
                  i % 2 === 0 && { backgroundColor: C.warm },
                ]}
              >
                <Text style={s.detailKey}>{key}</Text>
                <Text style={s.detailVal}>{val}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  screen: {
    flex: 1,
    backgroundColor: C.black,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errTitle: { fontSize: 16, color: C.cream, marginBottom: 12 },
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
  backTxt: { fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  topEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
  },

  heroWrap: {
    backgroundColor: "#0C0B09",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 52,
    borderBottomWidth: 1,
  },
  bottleScene: { alignItems: "center" },
  bottleCap: { width: 40, height: 12, borderRadius: 2 },
  bottleNeck: {
    width: 28,
    height: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderRadius: 2,
  },
  bottleBody: {
    width: 80,
    height: 130,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
    backgroundColor: "rgba(212,175,106,0.04)",
  },
  bottleName: {
    fontSize: 11,
    fontFamily: "serif",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  bottleBrand: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 3,
  },

  content: { paddingHorizontal: 24 },

  titleBlock: { paddingTop: 28, paddingBottom: 24 },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 10,
  },
  title: {
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 4,
  },
  type: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 16,
  },
  desc: { fontSize: 13, color: C.muted, lineHeight: 22 },

  purchaseBlock: { marginBottom: 20 },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 16,
  },
  price: {
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "700",
    color: C.goldLt,
  },
  priceSub: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  volRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  volBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 2,
  },
  volBtnTxt: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  buyBtn: { padding: 16, alignItems: "center", marginBottom: 10 },
  buyBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.black,
  },
  ghostBtn: {
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
  },
  ghostBtnTxt: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },

  nfcStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.3)",
    backgroundColor: "rgba(91,175,133,0.06)",
    marginBottom: 24,
  },
  nfcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
    marginTop: 3,
    flexShrink: 0,
  },
  nfcTitle: {
    fontSize: 11,
    color: C.green,
    fontWeight: "600",
    marginBottom: 2,
  },
  nfcSub: { fontSize: 10, color: C.muted },

  rule: { height: 1, backgroundColor: C.border, marginBottom: 24 },
  sectionLbl: {
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 16,
    fontWeight: "600",
  },

  pyramidBox: {
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  noteCard: { padding: 16, backgroundColor: C.charcoal },
  noteTier: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 6,
  },
  noteNotes: { fontSize: 13, color: C.cream, marginBottom: 10 },
  durationBar: { height: 2, backgroundColor: C.warm },
  durationFill: { height: 2 },

  detailsBox: {
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailKey: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
  },
  detailVal: { fontSize: 12, color: C.cream, fontWeight: "500" },
});
