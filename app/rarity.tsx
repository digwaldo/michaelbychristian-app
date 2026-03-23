// app/rarity.tsx — MBC Rarity Explained

import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BACKEND, C } from "../lib/theme";

const IS_WEB = Platform.OS === "web";
const MAX_W = IS_WEB ? 760 : undefined;

const TIERS = [
  {
    label: "Haute",
    display: "Haute",
    pct: "Top 5%",
    color: "#D4AF6A",
    bg: "rgba(212,175,106,0.12)",
    border: "rgba(212,175,106,0.4)",
  },
  {
    label: "Tres Rare",
    display: "Très Rare",
    pct: "Top 15%",
    color: "#B8963E",
    bg: "rgba(184,150,62,0.10)",
    border: "rgba(184,150,62,0.35)",
  },
  {
    label: "Prestige",
    display: "Prestige",
    pct: "Top 35%",
    color: "#9A8E7A",
    bg: "rgba(154,142,122,0.10)",
    border: "rgba(154,142,122,0.35)",
  },
  {
    label: "Signature",
    display: "Signature",
    pct: "Top 65%",
    color: "#7A7060",
    bg: "rgba(122,112,96,0.10)",
    border: "rgba(122,112,96,0.35)",
  },
  {
    label: "Essential",
    display: "Essential",
    pct: "Remaining",
    color: "#5A5248",
    bg: "rgba(90,82,72,0.10)",
    border: "rgba(90,82,72,0.35)",
  },
];

const WEIGHTS = [
  {
    tier: "Tier 1 — Physical Materials",
    weight: "3×",
    weightColor: C.goldLt,
    desc: "The actual leathers, fabrics, and hardware finishes. The most meaningful measure of physical uniqueness.",
    traits: ["Primary Texture", "Secondary Texture", "Hardware"],
  },
  {
    tier: "Tier 2 — Design Identity",
    weight: "2×",
    weightColor: "#9A8E7A",
    desc: "The visual and structural DNA of the piece — silhouette, colorway, and edition.",
    traits: [
      "Silhouette",
      "Model",
      "Edition Type",
      "Primary Color",
      "Secondary Color",
    ],
  },
  {
    tier: "Tier 3 — Provenance",
    weight: "1×",
    weightColor: C.muted,
    desc: "Context, origin, and craftsmanship history that adds depth to the piece's story.",
    traits: [
      "Textured Pattern",
      "Interior Lining",
      "Authentication",
      "Collection",
      "Collaboration",
      "Design Status",
      "Archive Status",
      "Tailored Year",
      "Design Year",
    ],
  },
];

interface TierDist {
  label: string;
  count: number;
  total: number;
}

export default function RarityScreen() {
  const [dist, setDist] = useState<TierDist[]>([]);
  const [loading, setLoading] = useState(true);
  const [topBag, setTopBag] = useState<{
    name: string;
    tokenId: number;
  } | null>(null);

  useEffect(() => {
    loadDist();
  }, []);

  async function loadDist() {
    try {
      const res = await fetch(`${BACKEND}/api/rarity?type=distribution`);
      const json = await res.json();

      if (!json.found) {
        setLoading(false);
        return;
      }

      setDist(
        json.distribution.map((d: any) => ({
          label: d.label,
          count: d.count,
          total: json.total,
        })),
      );
      if (json.topTokenId)
        setTopBag({
          name: `Token #${json.topTokenId}`,
          tokenId: json.topTokenId,
        });
    } catch (e) {
      console.log("rarity dist fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }

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
            style={s.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={s.topBarCenter}>
            <Text style={s.topEye}>Michael By Christian</Text>
          </View>
          <View style={{ width: 80 }} />
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
          {/* ── Hero ── */}
          <View style={s.hero}>
            <Text style={s.heroEye}>Rarity System</Text>
            <Text style={s.heroTitle}>
              How MBC{"\n"}
              <Text style={s.heroTitleEm}>Rarity Works</Text>
            </Text>
            <Text style={s.heroSub}>
              Every bag in the Michael By Christian collection is assigned a
              rarity rank based on how unique its physical attributes are
              compared to every other piece. Ranks update automatically as new
              pieces are added to the collection.
            </Text>
          </View>

          <View style={s.rule} />

          {/* ── Tier distribution ── */}
          <Text style={s.sectionLbl}>Current Collection Distribution</Text>
          {loading ? (
            <View style={s.loadBox}>
              <ActivityIndicator color={C.gold} size="small" />
            </View>
          ) : dist.length > 0 ? (
            <View style={s.tierDist}>
              {TIERS.map((tier) => {
                const d = dist.find((d) => d.label === tier.label);
                const count = d?.count || 0;
                const pct = d ? Math.round((count / d.total) * 100) : 0;
                const barWidth = d
                  ? `${Math.max((count / d.total) * 100, 2)}%`
                  : "2%";
                return (
                  <View
                    key={tier.label}
                    style={[
                      s.tierRow,
                      { backgroundColor: tier.bg, borderColor: tier.border },
                    ]}
                  >
                    <View style={s.tierLeft}>
                      <Text style={[s.tierLabel, { color: tier.color }]}>
                        {(tier as any).display || tier.label}
                      </Text>
                      <Text style={s.tierPct}>{tier.pct}</Text>
                    </View>
                    <View style={s.tierBarWrap}>
                      <View
                        style={[
                          s.tierBar,
                          {
                            width: barWidth as any,
                            backgroundColor: tier.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[s.tierCount, { color: tier.color }]}>
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={s.noData}>
              <Text style={s.noDataTxt}>
                Distribution available after collection loads
              </Text>
            </View>
          )}

          <View style={s.rule} />

          {/* ── Rarity tiers table ── */}
          <Text style={s.sectionLbl}>Rarity Tiers</Text>
          <View style={s.tiersBox}>
            {TIERS.map((tier, i) => (
              <View
                key={tier.label}
                style={[
                  s.tierTableRow,
                  i === TIERS.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[s.tierDot, { backgroundColor: tier.color }]} />
                <Text style={[s.tierTableLabel, { color: tier.color }]}>
                  {(tier as any).display || tier.label}
                </Text>
                <Text style={s.tierTablePct}>{tier.pct}</Text>
              </View>
            ))}
          </View>

          <View style={s.rule} />

          {/* ── Scoring weights ── */}
          <Text style={s.sectionLbl}>Scoring Weights</Text>
          <Text style={s.weightIntro}>
            Each trait is scored by how rare its specific value is across the
            full collection. Rarer values score higher. Traits are weighted by
            their contribution to a bag's physical uniqueness.
          </Text>

          {WEIGHTS.map((w) => (
            <View key={w.tier} style={s.weightBox}>
              <View style={s.weightHeader}>
                <Text style={s.weightTier}>{w.tier}</Text>
                <View style={s.weightBadge}>
                  <Text style={[s.weightBadgeTxt, { color: w.weightColor }]}>
                    {w.weight}
                  </Text>
                </View>
              </View>
              <Text style={s.weightDesc}>{w.desc}</Text>
              <View style={s.weightTraits}>
                {w.traits.map((t) => (
                  <View key={t} style={s.weightTrait}>
                    <Text style={s.weightTraitTxt}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* ── NFC bonus ── */}
          <View style={s.nfcBox}>
            <View style={s.nfcHeader}>
              <Text style={s.nfcTitle}>✦ NFC Chip Bonus</Text>
              <View style={s.weightBadge}>
                <Text style={[s.weightBadgeTxt, { color: C.green }]}>+2×</Text>
              </View>
            </View>
            <Text style={s.weightDesc}>
              Bags with an embedded NFC authentication chip receive a
              significant rarity bonus. Not every piece carries NFC — those that
              do are permanently more verifiable and scarcer as the collection
              grows.
            </Text>
          </View>

          <View style={s.rule} />

          {/* ── How scoring works ── */}
          <Text style={s.sectionLbl}>How The Score Is Calculated</Text>
          <View style={s.explainBox}>
            {[
              {
                n: "01",
                title: "Count each trait value",
                body: "For every trait, we count how many bags in the collection share the same value. A forest green hardware finish shared by 1 other bag is far rarer than black hardware shared by 10.",
              },
              {
                n: "02",
                title: "Score by frequency",
                body: "Each trait scores: (total bags ÷ count sharing that value) × weight. Rarer values score exponentially higher.",
              },
              {
                n: "03",
                title: "Sum all traits",
                body: "All weighted trait scores are added together to produce a total rarity score for the bag.",
              },
              {
                n: "04",
                title: "Rank the collection",
                body: "Every bag is ranked 1 through N by score. Rank 1 is the rarest piece. Ranks recalculate every time the collection is viewed — new additions immediately affect all existing ranks.",
              },
            ].map(({ n, title, body }) => (
              <View key={n} style={s.explainRow}>
                <Text style={s.explainN}>{n}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.explainTitle}>{title}</Text>
                  <Text style={s.explainBody}>{body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={s.rule} />

          {/* ── CTA ── */}
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => router.push("/collection" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnTxt}>Browse the Collection →</Text>
          </TouchableOpacity>

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
  backBtn: { width: 80 },
  backTxt: { fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  topBarCenter: { flex: 1, alignItems: "center" },
  topEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
  },

  content: { paddingHorizontal: 24 },

  hero: { paddingTop: 40, paddingBottom: 32 },
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
    lineHeight: 40,
    marginBottom: 16,
  },
  heroTitleEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  heroSub: { fontSize: 14, color: C.muted, lineHeight: 24 },

  rule: { height: 1, backgroundColor: C.border, marginVertical: 28 },
  sectionLbl: {
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 16,
    fontWeight: "600",
  },

  // Distribution
  loadBox: { paddingVertical: 24, alignItems: "center" },
  tierDist: { gap: 8 },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  tierLeft: { width: 90 },
  tierLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tierPct: { fontSize: 9, color: C.muted, letterSpacing: 1 },
  tierBarWrap: {
    flex: 1,
    height: 4,
    backgroundColor: C.warm,
    overflow: "hidden",
  },
  tierBar: { height: 4 },
  tierCount: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "serif",
    width: 28,
    textAlign: "right",
  },
  noData: {
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  noDataTxt: { fontSize: 12, color: C.muted },

  // Tiers table
  tiersBox: { borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  tierTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.charcoal,
    gap: 10,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierTableLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  tierTablePct: { fontSize: 11, color: C.muted },

  // Weights
  weightIntro: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 20,
  },
  weightBox: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.charcoal,
    padding: 20,
    marginBottom: 10,
  },
  weightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weightTier: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.cream,
    fontWeight: "600",
    flex: 1,
  },
  weightBadge: {
    backgroundColor: C.warm,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weightBadgeTxt: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  weightDesc: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  weightTraits: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  weightTrait: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weightTraitTxt: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },

  nfcBox: {
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.4)",
    backgroundColor: "rgba(91,175,133,0.06)",
    padding: 20,
  },
  nfcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  nfcTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.green,
    fontWeight: "600",
  },

  // Explain
  explainBox: { gap: 0 },
  explainRow: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  explainN: {
    fontSize: 10,
    color: C.gold,
    fontWeight: "700",
    letterSpacing: 1,
    width: 24,
    marginTop: 2,
  },
  explainTitle: {
    fontSize: 13,
    color: C.cream,
    fontWeight: "600",
    marginBottom: 6,
  },
  explainBody: { fontSize: 12, color: C.muted, lineHeight: 20 },

  // CTA
  ctaBtn: { backgroundColor: C.gold, padding: 18, alignItems: "center" },
  ctaBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.black,
  },
});
// Note: rarity data is populated by visiting the collection page
// The save-rarity API is called automatically after addRarity() completes
