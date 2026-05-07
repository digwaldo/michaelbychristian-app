// app/fragrance/[id].tsx — Individual fragrance detail page

import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
          volume: vol + "ml",
          message: formMessage.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
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
            {!showForm ? (
              <TouchableOpacity
                style={s.ghostBtn}
                activeOpacity={0.85}
                onPress={() => setShowForm(true)}
              >
                <Text style={s.ghostBtnTxt}>Inquire via Email →</Text>
              </TouchableOpacity>
            ) : submitted ? (
              <View style={s.successBox}>
                <Text style={s.successIcon}>✦</Text>
                <Text style={s.successTitle}>Inquiry Received</Text>
                <Text style={s.successSub}>
                  We'll be in touch at {formEmail} shortly.
                </Text>
              </View>
            ) : (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <View style={s.formBox}>
                  <Text style={s.formTitle}>Fragrance Inquiry</Text>
                  <Text style={s.formSub}>
                    {f.name} · {vol}ml — we'll respond within 24 hours.
                  </Text>

                  <TextInput
                    style={s.input}
                    placeholder="Full Name *"
                    placeholderTextColor={C.muted}
                    value={formName}
                    onChangeText={setFormName}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Email Address *"
                    placeholderTextColor={C.muted}
                    value={formEmail}
                    onChangeText={setFormEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Phone (optional)"
                    placeholderTextColor={C.muted}
                    value={formPhone}
                    onChangeText={setFormPhone}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={[s.input, s.inputMulti]}
                    placeholder="Message (optional)"
                    placeholderTextColor={C.muted}
                    value={formMessage}
                    onChangeText={setFormMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {submitError ? (
                    <Text style={s.errorTxt}>{submitError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                    onPress={submitInquiry}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color={C.black} size="small" />
                    ) : (
                      <Text style={s.submitBtnTxt}>Send Inquiry →</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowForm(false)}
                    style={{ marginTop: 10, alignItems: "center" }}
                  >
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}
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

  formBox: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    backgroundColor: C.charcoal,
    marginBottom: 4,
  },
  formTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 4,
  },
  formSub: { fontSize: 11, color: C.muted, marginBottom: 20, lineHeight: 18 },
  input: {
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.warm,
    color: C.cream,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },
  errorTxt: { fontSize: 11, color: "#C0614A", marginBottom: 10 },
  submitBtn: { backgroundColor: C.gold, padding: 14, alignItems: "center" },
  submitBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
  cancelTxt: { fontSize: 10, color: C.muted, letterSpacing: 1 },

  successBox: {
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.4)",
    backgroundColor: "rgba(91,175,133,0.06)",
    padding: 24,
    alignItems: "center",
  },
  successIcon: { fontSize: 24, color: C.green, marginBottom: 8 },
  successTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 6,
  },
  successSub: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
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
