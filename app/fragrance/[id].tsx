// app/fragrance/[id].tsx — Fragrance detail page (light theme)

import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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

const IS_WEB = Platform.OS === "web";
const { width: SCREEN_W } = Dimensions.get("window");
const IS_WIDE = IS_WEB && SCREEN_W >= 768;

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

const FRAGRANCES: Record<string, any> = {
  "sweet-veil": {
    name: "Sweet Veil",
    number: "No. 01",
    type: "Transparent Floral",
    subtitle: "2025 — Édition Limitée",
    concentration: "Parfum · 30%",
    scentFamily: "Floral",
    desc: "A luminous transparent floral anchored by Hedione and pale rose. Opens like morning light through linen, dries to a whisper of white musk and clean skin. Luminous. Intimate. Unmistakably feminine.",
    topNotes: "Bergamot · Pink Pepper · Aldehydes",
    heartNotes: "Hedione · Pale Rose · Jasmine · Iris",
    baseNotes: "White Musk · Clean Skin · Ambrette",
    topDuration: 35,
    heartDuration: 65,
    baseDuration: 90,
    price30: 225,
    price50: 325,
    edition: "Artisan Made · By Inquiry",
    batch: "SV-2026-E1",
    origin: "Baltimore, MD · USA",
    projection: "Moderate · Skin close",
    longevity: "Up to 8 hours",
    season: "Spring · Summer",
    finish: "Polished Crystal",
    accent: "#B8963E",
  },
  aladdin: {
    name: "Aladdin",
    number: "No. 02",
    type: "Oriental Woody Floral",
    subtitle: "2026 — Édition Limitée",
    concentration: "Eau de Parfum · 30%",
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
    edition: "Artisan Made · By Inquiry",
    batch: "ALD-2026-E1",
    origin: "Baltimore, MD · USA",
    projection: "Strong · Projects well",
    longevity: "Up to 8 hours",
    season: "Fall · Winter",
    finish: "Polished Crystal",
    accent: "#8C4A2A",
  },
  beanie: {
    name: "Beanie",
    number: "No. 04",
    type: "Aromatic Woody Chypre",
    subtitle: "2024 — Édition Limitée",
    concentration: "Parfum · 30%",
    scentFamily: "Chypre Woody",
    desc: "A clean, mineral aromatic with a salty heart and warm earthy drydown. Juniper and Neroli open bright and fresh, drifting into Dreamwood and Sea Salt, then settling into a rich base of Orris, Tonka, and Labdanum. Effortless. Grounded. Quietly addictive.",
    topNotes: "Juniper Berry · Neroli · Apple Essence",
    heartNotes: "Dreamwood · Hedione · Sea Salt",
    baseNotes: "Orris Butter · Tonka Bean · Labdanum · Benzoin · Iso E Super",
    topDuration: 30,
    heartDuration: 60,
    baseDuration: 88,
    price30: 175,
    price50: 255,
    edition: "Artisan Made · By Inquiry",
    batch: "BNE-2024-E1",
    origin: "Baltimore, MD · USA",
    projection: "Moderate · Skin close",
    longevity: "Up to 8 hours",
    season: "Fall · Winter · Spring",
    finish: "Polished Crystal",
    accent: "#5C6B4A",
  },
  joopiter: {
    name: "Joopiter",
    number: "No. 05",
    type: "Solar Citrus Oriental",
    subtitle: "2024 — Édition Limitée",
    concentration: "Parfum · 30%",
    scentFamily: "Oriental Citrus",
    desc: "A sun-drenched citrus oriental that opens with a burst of Red Grapefruit, Italian Lemon, and Calabrian Bergamot before warming into Jasmine and Orange Blossom. The drydown is rich and resinous — Frankincense, Ambroxan, Tonka, and Vanilla root the brightness into something lasting and bold.",
    topNotes: "Red Grapefruit · Lemon · Bergamot · Apple Essence",
    heartNotes: "Jasmine · Orange Sweet · Hedione · Heliotrope",
    baseNotes:
      "Frankincense · Ambroxan · Tonka Bean · Vanilla · Cardamom · Patchouli · Iso E Super",
    topDuration: 35,
    heartDuration: 65,
    baseDuration: 90,
    price30: 185,
    price50: 265,
    edition: "Artisan Made · By Inquiry",
    batch: "JOP-2024-E1",
    origin: "Baltimore, MD · USA",
    projection: "Strong · Projects well",
    longevity: "Up to 8 hours",
    season: "Spring · Summer · Fall",
    finish: "Polished Crystal",
    accent: "#8C6A1A",
  },
  "homme-parfum": {
    name: "Homme Parfum",
    number: "No. 03",
    type: "Aromatic Fougère Woody Iris",
    subtitle: "2025 — Édition Limitée",
    concentration: "Parfum · 30%",
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
    edition: "Artisan Made · By Inquiry",
    batch: "HOM-2026-E1",
    origin: "Baltimore, MD · USA",
    projection: "Moderate · Versatile",
    longevity: "Up to 8 hours",
    season: "All seasons",
    finish: "Polished Crystal",
    accent: "#4A5C6B",
  },
};

export default function FragranceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const f = FRAGRANCES[id as string];
  const [vol, setVol] = useState<30 | 50>(30);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function submitInquiry() {
    if (!formName.trim() || !formEmail.trim()) {
      setSubmitError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/fragrance-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          fragrance: f.name,
          volume: `${vol}ml`,
          message: formMessage.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.detail || json.error || "Submission failed");
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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

  const DETAILS = [
    ["Concentration", f.concentration],
    ["Scent family", f.scentFamily],
    ["Projection", f.projection],
    ["Longevity", f.longevity],
    ["Best season", f.season],
    ["Origin", f.origin],
    ["Edition", f.edition],
    ["Batch no.", f.batch],
    ["Blockchain", "Stellar · Soroban"],
    ["Finish", f.finish],
  ];

  const NOTES = [
    {
      tier: "Top Notes",
      timing: "0–30 min",
      notes: f.topNotes,
      duration: f.topDuration,
    },
    {
      tier: "Heart Notes",
      timing: "30 min–3 hrs",
      notes: f.heartNotes,
      duration: f.heartDuration,
    },
    {
      tier: "Base Notes",
      timing: "3+ hrs",
      notes: f.baseNotes,
      duration: f.baseDuration,
    },
  ];

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.topBar}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backTxt}>← Fragrances</Text>
          </TouchableOpacity>
          <Text style={s.topLogo}>
            Michael <Text style={s.topLogoEm}>By Christian</Text>
          </Text>
          <View style={s.topSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* Hero */}
        <View style={IS_WIDE ? s.heroRow : s.heroCol}>
          {/* Bottle — dark panel with real image */}
          <View style={IS_WIDE ? s.bottlePanelWeb : s.bottlePanelMobile}>
            <View style={s.bottleImgWrap}>
              <Image
                source={require("../../assets/perfume_bottle.png")}
                style={s.bottleImg}
                resizeMode="contain"
              />
            </View>
            <View style={s.bottleTagRow}>
              <Text style={[s.bottleTagName, { color: f.accent }]}>
                {f.name}
              </Text>
              <Text style={s.bottleTagSub}>
                {f.number} · {vol}ml
              </Text>
            </View>
          </View>

          {/* Info — white panel */}
          <View style={IS_WIDE ? s.infoPanelWeb : s.infoPanelMobile}>
            <Text style={[s.heroNumber, { color: f.accent }]}>
              Michael Christian Fragrances · {f.number}
            </Text>
            <Text style={s.heroTitle}>{f.name}</Text>
            <Text style={[s.heroSubtitle, { color: f.accent }]}>
              {f.subtitle}
            </Text>
            <Text style={s.heroDesc}>{f.desc}</Text>

            <View style={s.priceRow}>
              <Text style={[s.price, { color: f.accent }]}>${price}</Text>
              <Text style={s.priceSub}>USD · {f.concentration}</Text>
            </View>

            <View style={s.volRow}>
              {([30, 50] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    s.volBtn,
                    vol === v && {
                      borderColor: f.accent,
                      backgroundColor: f.accent + "0D",
                    },
                  ]}
                  onPress={() => setVol(v)}
                >
                  <Text style={[s.volBtnTxt, vol === v && { color: f.accent }]}>
                    {v} ML
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!showForm && !submitted && (
              <TouchableOpacity
                style={[s.inquireBtn, { backgroundColor: f.accent }]}
                onPress={() => setShowForm(true)}
                activeOpacity={0.85}
              >
                <Text style={s.inquireBtnTxt}>Inquire via Email →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Inquiry form */}
        {(showForm || submitted) && (
          <View style={s.formSection}>
            {submitted ? (
              <View style={s.successBox}>
                <Text style={s.successIcon}>✦</Text>
                <Text style={s.successTitle}>Inquiry Received</Text>
                <Text style={s.successSub}>
                  We'll be in touch at {formEmail} within 24 hours.
                </Text>
              </View>
            ) : (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <View style={s.formBox}>
                  <Text style={s.formTitle}>
                    {f.name} · {vol}ml Inquiry
                  </Text>
                  <Text style={s.formSub}>
                    Fill out the form and we'll respond within 24 hours.
                  </Text>

                  <Text style={s.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Your name"
                    placeholderTextColor={T.textMuted}
                    value={formName}
                    onChangeText={setFormName}
                    autoCapitalize="words"
                  />

                  <Text style={s.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="your@email.com"
                    placeholderTextColor={T.textMuted}
                    value={formEmail}
                    onChangeText={setFormEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={s.inputLabel}>Phone (optional)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="+1 (000) 000-0000"
                    placeholderTextColor={T.textMuted}
                    value={formPhone}
                    onChangeText={setFormPhone}
                    keyboardType="phone-pad"
                  />

                  <Text style={s.inputLabel}>Message (optional)</Text>
                  <TextInput
                    style={[s.input, s.inputMulti]}
                    placeholder="Any questions or special requests..."
                    placeholderTextColor={T.textMuted}
                    value={formMessage}
                    onChangeText={setFormMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {!!submitError && (
                    <Text style={s.errorTxt}>{submitError}</Text>
                  )}

                  <TouchableOpacity
                    style={[
                      s.submitBtn,
                      { backgroundColor: f.accent },
                      submitting && s.btnDisabled,
                    ]}
                    onPress={submitInquiry}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.submitBtnTxt}>Send Inquiry →</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowForm(false)}
                    style={s.cancelWrap}
                  >
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
        )}

        <View style={s.content}>
          <View style={s.rule} />

          {/* Olfactory pyramid */}
          <Text style={[s.sectionLbl, { color: f.accent }]}>
            Olfactory Composition
          </Text>
          <View style={IS_WIDE ? s.pyramidRow : s.pyramidCol}>
            {NOTES.map((note, i) => (
              <View
                key={i}
                style={[
                  IS_WIDE ? s.noteCardWeb : s.noteCardMobile,
                  IS_WIDE && i < 2 ? s.noteCardBorderRight : null,
                  !IS_WIDE && i < 2 ? s.noteCardBorderBottom : null,
                ]}
              >
                <View style={s.noteTierRow}>
                  <Text style={s.noteTier}>{note.tier}</Text>
                  <Text style={s.noteTiming}>{note.timing}</Text>
                </View>
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

          {/* Provenance details */}
          <Text style={[s.sectionLbl, { color: f.accent }]}>
            Provenance & Details
          </Text>
          <View style={s.detailsBox}>
            {DETAILS.map(([key, val], i) => (
              <View
                key={i}
                style={[
                  s.detailRow,
                  IS_WIDE ? s.detailRowHalf : null,
                  i % 2 !== 0 ? { backgroundColor: T.bgAlt } : null,
                ]}
              >
                <Text style={s.detailKey}>{key}</Text>
                <Text style={s.detailVal}>{val}</Text>
              </View>
            ))}
          </View>

          {/* Collection */}
          <View style={s.rule} />
          <Text style={[s.sectionLbl, { color: f.accent }]}>
            The Collection
          </Text>
          <View style={s.collectionRow}>
            {Object.entries(FRAGRANCES).map(([key, frag]: [string, any]) => (
              <TouchableOpacity
                key={key}
                style={[
                  s.collCard,
                  frag.name === f.name && { borderColor: f.accent },
                ]}
                onPress={() => {
                  if (frag.name !== f.name) {
                    router.push({
                      pathname: "/fragrance/[id]",
                      params: { id: key },
                    } as any);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    s.collName,
                    frag.name === f.name && { color: f.accent },
                  ]}
                >
                  {frag.name}
                </Text>
                <Text style={s.collType} numberOfLines={1}>
                  {frag.type}
                </Text>
                <Text style={[s.collPrice, { color: frag.accent }]}>
                  From ${frag.price30}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.spacer} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  screen: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errTitle: { fontSize: 16, color: T.text, marginBottom: 12 },
  backLink: { fontSize: 12, color: T.textSub },

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
  topSpacer: { width: 80 },
  backTxt: { fontSize: 11, color: T.textSub },
  topLogo: {
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    color: T.text,
  },
  topLogoEm: { fontStyle: "italic", fontWeight: "400", color: T.gold },

  heroRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  heroCol: {
    flexDirection: "column",
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  bottlePanelWeb: {
    width: "45%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#111008",
  },
  bottlePanelMobile: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    backgroundColor: "#111008",
  },
  bottleImgWrap: {
    width: 220,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  bottleImg: { width: "100%", height: "100%" },
  bottleTagRow: { alignItems: "center", marginTop: 16 },
  bottleTagName: {
    fontFamily: "serif",
    fontSize: 16,
    fontStyle: "italic",
    letterSpacing: 1,
    marginBottom: 4,
  },
  bottleTagSub: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "rgba(212,175,106,0.6)",
  },

  infoPanelWeb: {
    flex: 1,
    padding: 40,
    backgroundColor: T.bg,
    justifyContent: "center",
  },
  infoPanelMobile: { padding: 24, backgroundColor: T.bg },
  heroNumber: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "900",
    color: T.text,
    marginBottom: 4,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontFamily: "serif",
    fontStyle: "italic",
    fontSize: 14,
    marginBottom: 14,
  },
  heroDesc: {
    fontSize: 13,
    color: T.textSub,
    lineHeight: 22,
    marginBottom: 20,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 16,
  },
  price: { fontFamily: "serif", fontSize: 28, fontWeight: "700" },
  priceSub: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: T.textMuted,
  },

  volRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  volBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: T.border,
  },
  volBtnTxt: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textSub,
  },

  inquireBtn: { padding: 14, alignItems: "center" },
  inquireBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },

  formSection: { paddingHorizontal: 24, paddingTop: 28 },
  formBox: {
    borderWidth: 1,
    borderColor: T.border,
    padding: 24,
    backgroundColor: T.bgAlt,
    marginBottom: 4,
  },
  formTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    marginBottom: 4,
  },
  formSub: { fontSize: 12, color: T.textSub, marginBottom: 20, lineHeight: 18 },
  inputLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textSub,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    color: T.text,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },
  errorTxt: { fontSize: 11, color: T.red, marginBottom: 10 },
  submitBtn: { padding: 14, alignItems: "center", marginBottom: 10 },
  btnDisabled: { opacity: 0.6 },
  submitBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  cancelWrap: { alignItems: "center", paddingVertical: 8 },
  cancelTxt: { fontSize: 10, color: T.textMuted, letterSpacing: 1 },

  successBox: {
    borderWidth: 1,
    borderColor: T.greenBorder,
    backgroundColor: T.greenBg,
    padding: 28,
    alignItems: "center",
  },
  successIcon: { fontSize: 24, color: T.green, marginBottom: 8 },
  successTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    marginBottom: 6,
  },
  successSub: {
    fontSize: 12,
    color: T.textSub,
    textAlign: "center",
    lineHeight: 18,
  },

  content: { paddingHorizontal: 24 },
  rule: { height: 1, backgroundColor: T.border, marginVertical: 28 },
  sectionLbl: {
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    marginBottom: 16,
    fontWeight: "600",
  },
  spacer: { height: 60 },

  pyramidRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  pyramidCol: {
    flexDirection: "column",
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  noteCardWeb: { flex: 1, padding: 18, backgroundColor: T.bg },
  noteCardMobile: { padding: 18, backgroundColor: T.bg },
  noteCardBorderRight: { borderRightWidth: 1, borderRightColor: T.border },
  noteCardBorderBottom: { borderBottomWidth: 1, borderBottomColor: T.border },
  noteTierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  noteTier: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: T.textSub,
    fontWeight: "600",
    flexShrink: 1,
  },
  noteTiming: { fontSize: 8, color: T.textMuted, flexShrink: 0 },
  noteNotes: { fontSize: 13, color: T.text, marginBottom: 12, lineHeight: 20 },
  durationBar: { height: 2, backgroundColor: T.bgDeep },
  durationFill: { height: 2 },

  detailsBox: {
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bg,
  },
  detailRowHalf: { width: "50%" },
  detailKey: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: T.textSub,
    flex: 1,
    marginRight: 8,
  },
  detailVal: {
    fontSize: 12,
    color: T.text,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },

  collectionRow: { flexDirection: "row", gap: 10, paddingBottom: 4 },
  collCard: {
    width: 130,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    backgroundColor: T.bgAlt,
  },
  collName: {
    fontFamily: "serif",
    fontSize: 13,
    fontWeight: "700",
    color: T.text,
    marginBottom: 3,
  },
  collType: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: T.textMuted,
    marginBottom: 8,
  },
  collPrice: { fontSize: 12, fontWeight: "600" },
});
