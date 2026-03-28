"use client";

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { C } from "../lib/theme";

const useClientLayout = () => {
  const [layout, setLayout] = useState({
    w: 375,
    h: 812,
    isPhone: true,
    isTablet: false,
    isWeb: false,
    isWebWide: false,
  });

  useEffect(() => {
    const update = () => {
      const dims = Dimensions.get("window");
      const isWeb = Platform.OS === "web";
      setLayout({
        w: dims.width,
        h: dims.height,
        isPhone: dims.width < 480,
        isTablet: dims.width >= 480 && dims.width < 900,
        isWeb: isWeb && dims.width >= 900,
        isWebWide: isWeb && dims.width >= 1400,
      });
    };
    update();
    const sub = Dimensions.addEventListener("change", update);
    return () => sub?.remove();
  }, []);

  return layout;
};

interface BagItem {
  src: number;
  name: string;
  color: string;
}
const BAGS: BagItem[] = [
  {
    src: require("../assets/bags/bag1.png") as number,
    name: "Prototype - Haven",
    color: "White · Gold",
  },
  {
    src: require("../assets/bags/bag2.png") as number,
    name: "Prototype - Haven",
    color: "Black · Gold",
  },
  {
    src: require("../assets/bags/bag3.png") as number,
    name: "Prototype - The Bride",
    color: "Brown · Black",
  },
  {
    src: require("../assets/bags/bag4.png") as number,
    name: "Prototype - The Bride",
    color: "Yellow · Red",
  },
  {
    src: require("../assets/bags/bag5.png") as number,
    name: "Prototype - The Bride",
    color: "Red · Black",
  },
  {
    src: require("../assets/bags/bag6.png") as number,
    name: "Prototype - The Bride",
    color: "Yellow · Black",
  },
];

const MARQUEE = [
  "NFC Authentication",
  "On-Chain Provenance",
  "Stellar Blockchain",
  "Handcrafted Luxury",
  "Buy With Card",
  "No Wallet Needed",
  "Michael By Christian",
  "Phygital Fashion",
];

const CONCEPT_POINTS = [
  {
    num: "01",
    title: "NFC Tap Authentication",
    body: "Every bag carries an embedded NFC card. Scan it to instantly verify your piece is genuine and linked to your Serial Number and Authentication Contract (NFT) on-chain.",
  },
  {
    num: "02",
    title: "On-Chain Provenance",
    body: "Design year, leather type, stitching, archive status — all recorded permanently on Stellar blockchain. Immutable. Forever yours.",
  },
  {
    num: "03",
    title: "Blockchain Made Easy",
    body: "Credit Card, Apple Pay, or Google Pay. No crypto wallet needed — we create one for you and deliver your Authentication Contract (NFT) in seconds.",
  },
  {
    num: "04",
    title: "Community",
    body: "Building an exclusive circle of owners, one authenticated transaction at a time. Every NFC tap and on-chain mint strengthens the collective.",
  },
];

const STATS = [
  { num: "10+", lbl: "In-House Designed Perfume Formulas" },
  { num: "15+", lbl: "Unique Handbag Silhouettes" },
  { num: "50+", lbl: "Unique Variations Produced" },
  { num: "2022–2026", lbl: "Founding Year — Phygital Integration Year" },
];

const PHYGITAL_CARDS = [
  {
    num: "01",
    title: "Your bag lives forever",
    accent: C.goldLt,
    body: "Most luxury pieces disappear into time — stolen, sold, forgotten. When your MBC piece is minted on Stellar, its entire story lives on a public blockchain. Immutable. Permanent. Provably yours.",
  },
  {
    num: "02",
    title: "Authenticity you can touch",
    accent: C.gold,
    body: "Tap your phone to the MBC 'M' embedded in every bag and it instantly pulls up the on-chain record. No certificates. No third parties. No guessing. The blockchain is the receipt.",
  },
  {
    num: "03",
    title: "Fashion as an asset",
    accent: C.gold,
    body: "Traditional luxury is illiquid. Phygital is different — your ownership is transferable on-chain, your piece's history is transparent, and its provenance is verifiable by anyone, anywhere, forever.",
  },
  {
    num: "04",
    title: "The next era of collecting",
    accent: C.gold,
    body: "The world's most forward-thinking collectors are already moving here. MBC is not just a bag — it's a position in a new category of luxury that merges craft, culture, and cryptographic proof.",
  },
  {
    num: "05",
    title: "The next era of investing",
    accent: C.green,
    body: "Purchasing MBC phygital is entry into a groundbreaking asset class: the NFT Authentication Contract infuses your physical bag with on-chain intrinsic value — verifiable provenance, unbreakable authenticity, and seamless transferability.",
  },
];

const STEPS = [
  {
    num: "A",
    badge: "Easiest",
    title: "Pay with Card, Apple Pay, or Google Pay",
    body: "Enter your email and payment details via secure Stripe checkout. No crypto required — we handle everything.",
  },
  {
    num: "B",
    title: "We Create Your Stellar Wallet Automatically",
    body: "If you don't have a wallet, we set one up for you instantly. You'll own it forever for NFTs, tokens, and the full Stellar ecosystem.",
  },
  {
    num: "C",
    title: "NFT Transfers to Your Wallet",
    body: "Once payment clears, your Authentication Contract (NFT) transfers directly to your wallet in seconds. Wallet details sent by email.",
  },
  {
    num: "D",
    title: "Claim & Ship Your Physical Bag",
    body: "Reply to your confirmation email with your shipping address — we verify ownership on-chain and dispatch your bag.",
  },
];

function MarqueeTicker() {
  const translateX = useRef(new Animated.Value(0)).current;
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    if (rowWidth === 0) return;
    translateX.setValue(0);
    Animated.loop(
      Animated.timing(translateX, {
        toValue: -rowWidth,
        duration: rowWidth * 18,
        useNativeDriver: Platform.OS !== "web",
        isInteraction: false,
      }),
    ).start();
  }, [rowWidth]);

  const items = [...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE];

  return (
    <View style={ts.wrap}>
      <Animated.View
        style={[ts.row, { transform: [{ translateX }] }]}
        onLayout={(e) => {
          if (rowWidth === 0) setRowWidth(e.nativeEvent.layout.width / 2);
        }}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <Text style={ts.item}>{item}</Text>
            <Text style={ts.sep}>·</Text>
          </React.Fragment>
        ))}
      </Animated.View>
    </View>
  );
}

const ts = StyleSheet.create({
  wrap: { backgroundColor: C.gold, paddingVertical: 10, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center" },
  item: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.black,
    fontWeight: "700",
    flexShrink: 0,
    paddingHorizontal: 12,
  },
  sep: {
    fontSize: 9,
    color: C.black,
    opacity: 0.5,
    paddingHorizontal: 14,
    flexShrink: 0,
  },
});

export default function HomeScreen() {
  const layout = useClientLayout();
  const { w, h, isPhone, isTablet, isWeb, isWebWide } = layout;
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;
  const player = useVideoPlayer(require("../assets/hero-video.mp4"));

  useEffect(() => {
    player.loop = true;
    player.muted = true;
    const start = async () => {
      try {
        player.play();
      } catch (e) {
        console.log("Video autoplay failed:", e);
      }
    };
    start();
  }, [player]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 1000,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 800,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const sidePad = isPhone ? 18 : 24;
  const heroH = isPhone ? Math.min(h * 0.58, 460) : isTablet ? h * 0.68 : 540;
  const heroTitleSize = isPhone ? 40 : isTablet ? 48 : 58;
  const h2Size = isPhone ? 28 : 36;
  const maxW = isWeb ? 760 : undefined;

  // ── NAV_LINKS — Production: index + rarity only ──────────────
  const NAV_LINKS = [{ label: "Rarity", path: "/rarity", gold: true }];

  const COLS = isPhone ? 2 : 3;

  return (
    <View style={s.root}>
      {/* ── NAV ── */}
      <SafeAreaView edges={["top"]} style={s.navSafe}>
        <View style={[s.nav, { paddingHorizontal: sidePad }]}>
          <View
            style={[
              s.navInner,
              maxW
                ? { maxWidth: maxW, alignSelf: "center", width: "100%" }
                : {},
            ]}
          >
            <View>
              <Text style={s.navEye}>Collection 2026</Text>
              <Text style={s.navLogo}>
                Michael <Text style={s.navLogoEm}>By Christian</Text>
              </Text>
            </View>

            {/* Desktop — inline links */}
            {!isPhone && (
              <View style={s.navLinks}>
                {NAV_LINKS.map((l) => (
                  <TouchableOpacity
                    key={l.label}
                    onPress={() => router.push(l.path as any)}
                  >
                    <Text style={[s.navLink, l.gold && { color: C.gold }]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Phone — hamburger */}
            {isPhone && (
              <TouchableOpacity
                onPress={() => setMenuOpen(!menuOpen)}
                style={s.hamburger}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[s.hLine, menuOpen && s.hLineTop]} />
                <View style={[s.hLine, menuOpen && s.hLineMid]} />
                <View style={[s.hLine, menuOpen && s.hLineBot]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Mobile dropdown */}
        {isPhone && menuOpen && (
          <View style={s.mobileMenu}>
            {NAV_LINKS.map((l) => (
              <TouchableOpacity
                key={l.label}
                style={s.mobileMenuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push(l.path as any);
                }}
              >
                <Text style={[s.mobileMenuTxt, l.gold && { color: C.gold }]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── HERO ── */}
        <View style={s.heroSection}>
          <View style={[s.heroFrame, { height: heroH, width: "100%" }]}>
            <View style={s.heroMedia}>
              <VideoView
                player={player}
                style={s.heroVideo}
                contentFit={isPhone ? "contain" : "cover"}
                nativeControls={false}
                allowsFullscreen={false}
                startsPictureInPictureAutomatically={false}
              />
            </View>
            <LinearGradient
              colors={
                isPhone
                  ? ["transparent", "rgba(12,11,9,0.28)", "rgba(12,11,9,0.82)"]
                  : ["transparent", "rgba(12,11,9,0.6)", C.black]
              }
              locations={[0.2, 0.65, 1]}
              style={s.heroOverlay}
            />
            <Animated.View
              style={[
                s.heroContent,
                { opacity: fade, transform: [{ translateY: slideY }] },
              ]}
            >
              <View style={[s.heroInner, { paddingHorizontal: sidePad }]}>
                <Text
                  style={[
                    s.heroEye,
                    isPhone && { fontSize: 8, letterSpacing: 2 },
                  ]}
                >
                  Phygital · Luxury Fashion · Stellar · Est. 2026
                </Text>
                <Text
                  style={[
                    s.heroTitle,
                    {
                      fontSize: heroTitleSize,
                      lineHeight: heroTitleSize * 0.98,
                    },
                  ]}
                >
                  Michael
                </Text>
                <Text
                  style={[
                    s.heroSub,
                    {
                      fontSize: heroTitleSize,
                      lineHeight: heroTitleSize * 1.1,
                    },
                  ]}
                >
                  By Christian
                </Text>
                <Text
                  style={[
                    s.heroTagline,
                    isPhone && { fontSize: 13, maxWidth: "100%" },
                  ]}
                >
                  Where artisan craft meets immutable provenance.{"\n"}Every
                  stitch signed on-chain.
                </Text>
                <View style={[s.ctaRow, isPhone && { marginTop: 20 }]}>
                  {/*<TouchableOpacity
                    style={[
                      s.btnWhite,
                      isPhone && { paddingHorizontal: 20, paddingVertical: 12 },
                    ]}
                    onPress={() => {}}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.btnWhiteTxt, isPhone && { fontSize: 9 }]}>
                      Browse & Buy
                    </Text>
                  </TouchableOpacity>*/}
                  <TouchableOpacity
                    style={[
                      s.btnGhost,
                      isPhone && { paddingHorizontal: 20, paddingVertical: 12 },
                    ]}
                    onPress={() => router.push("/profile")}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.btnGhostTxt, isPhone && { fontSize: 9 }]}>
                      My Pieces
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[s.chips, isPhone && { marginTop: 12 }]}>
                  {[
                    "💳 Card",
                    "🍎 Apple Pay",
                    "G Google Pay",
                    "👜 No Wallet",
                  ].map((p) => (
                    <View key={p} style={s.chip}>
                      <Text style={s.chipTxt}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* ── TICKER ── */}
        <MarqueeTicker />

        {/* ── CONCEPT ── */}
        <View style={[s.section, { paddingHorizontal: sidePad }]}>
          <View
            style={
              maxW ? { maxWidth: maxW, alignSelf: "center", width: "100%" } : {}
            }
          >
            <Text style={s.eyebrow}>The Concept</Text>
            <Text
              style={[s.h2, { fontSize: h2Size, lineHeight: h2Size * 1.1 }]}
            >
              Where craft meets{"\n"}
              <Text style={s.h2Em}>the chain</Text>
            </Text>
            <Text style={s.bodyText}>
              MBC is the first luxury fashion house where every physical bag is
              paired with an NFT — a permanent, verifiable record of ownership
              and heritage that no traditional house can offer.
            </Text>
            {CONCEPT_POINTS.map((p, i) => (
              <View key={p.num} style={[s.point, i === 0 && { marginTop: 8 }]}>
                <Text style={s.pointNum}>{p.num}</Text>
                <View style={s.pointRight}>
                  <Text style={s.pointTitle}>{p.title}</Text>
                  <Text style={s.pointBody}>{p.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── STATS ── */}
        <View style={[s.statsSection, { paddingHorizontal: sidePad }]}>
          <View
            style={
              maxW ? { maxWidth: maxW, alignSelf: "center", width: "100%" } : {}
            }
          >
            <Text style={s.eyebrow}>By The Numbers</Text>
            {STATS.map((st, i) => (
              <View
                key={st.lbl}
                style={[s.statRow, i < STATS.length - 1 && s.statDivider]}
              >
                <Text
                  style={[
                    s.statNum,
                    isPhone && { fontSize: 36, lineHeight: 36 },
                  ]}
                >
                  {st.num}
                </Text>
                <Text style={s.statLbl}>{st.lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── COLLECTION CTA ── */}
        <View style={s.collSection}>
          <View
            style={[
              { paddingHorizontal: sidePad, paddingTop: 52, paddingBottom: 24 },
              maxW
                ? { maxWidth: maxW, alignSelf: "center", width: "100%" }
                : {},
            ]}
          >
            <Text style={s.eyebrow}>The Collection</Text>
            <Text
              style={[s.h2, { fontSize: h2Size, lineHeight: h2Size * 1.1 }]}
            >
              Current <Text style={s.h2Em}>Pieces</Text>
            </Text>
            <Text style={s.bodyText}>
              Pay by card, Apple Pay, or Google Pay.{"\n"}No wallet needed — NFT
              delivered instantly.
            </Text>
            {/*<TouchableOpacity
              style={s.btnGold}
              onPress={() => {}}
              activeOpacity={0.85}
            >
              <Text style={s.btnGoldTxt}>Browse All Pieces & Buy →</Text>
            </TouchableOpacity>*/}
          </View>
          <View style={[s.bagGrid, { paddingHorizontal: 2 }]}>
            <View style={s.bagRow}>
              {BAGS.slice(0, COLS).map((bag, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.bagCard}
                  onPress={() => {}}
                  activeOpacity={0.88}
                >
                  <View style={s.bagImgWrap}>
                    <Image
                      source={bag.src}
                      style={s.bagImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={s.bagCardBody}>
                    <Text style={s.bagName} numberOfLines={1}>
                      {bag.name}
                    </Text>
                    <Text style={s.bagColor}>{bag.color}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.bagRow}>
              {BAGS.slice(COLS, COLS * 2).map((bag, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.bagCard}
                  onPress={() => router.push("/collection")}
                  activeOpacity={0.88}
                >
                  <View style={s.bagImgWrap}>
                    <Image
                      source={bag.src}
                      style={s.bagImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={s.bagCardBody}>
                    <Text style={s.bagName} numberOfLines={1}>
                      {bag.name}
                    </Text>
                    <Text style={s.bagColor}>{bag.color}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── HOW PHYGITAL WORKS ── */}
        <View style={[s.section, s.sectionAlt, { paddingHorizontal: sidePad }]}>
          <View
            style={
              maxW ? { maxWidth: maxW, alignSelf: "center", width: "100%" } : {}
            }
          >
            <Text style={s.eyebrow}>How Phygital Works</Text>
            <Text
              style={[s.h2, { fontSize: h2Size, lineHeight: h2Size * 1.1 }]}
            >
              Engrave Yourself{"\n"}Into History,{" "}
              <Text style={s.h2Em}>Digitally</Text>
            </Text>
            <Text style={s.phygitalLead}>
              Phygital is not a gimmick. It's the convergence of two things that
              have never properly existed together: the warmth of handcrafted
              luxury and the permanence of the blockchain.
            </Text>
            {PHYGITAL_CARDS.map((card, i) => (
              <View
                key={card.num}
                style={[s.phCard, i === 0 && { marginTop: 8 }]}
              >
                <View style={[s.phCardNum, { borderColor: card.accent }]}>
                  <Text style={[s.phCardNumTxt, { color: card.accent }]}>
                    {card.num}
                  </Text>
                </View>
                <View style={s.phCardBody}>
                  <Text style={s.phCardTitle}>{card.title}</Text>
                  <Text style={s.phCardText}>{card.body}</Text>
                </View>
              </View>
            ))}
            <View style={s.phQuote}>
              <Text style={s.phQuoteMark}>"</Text>
              <Text style={[s.phQuoteText, isPhone && { fontSize: 15 }]}>
                The question is no longer whether luxury will go on-chain. It's
                who gets there first with something worth owning.
              </Text>
              <Text style={s.phQuoteAttr}>— Michael By Christian</Text>
            </View>
            <TouchableOpacity
              style={s.btnGold}
              onPress={() => {}}
              activeOpacity={0.85}
            >
              <Text style={s.btnGoldTxt}>Own a Piece of This →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── HOW TO BUY ── */}
        <View style={[s.section, s.sectionAlt, { paddingHorizontal: sidePad }]}>
          <View
            style={
              maxW ? { maxWidth: maxW, alignSelf: "center", width: "100%" } : {}
            }
          >
            <Text style={s.eyebrow}>How To Buy</Text>
            <Text
              style={[s.h2, { fontSize: h2Size, lineHeight: h2Size * 1.1 }]}
            >
              Own In A Few <Text style={s.h2Em}>Simple Steps</Text>
            </Text>
            {STEPS.map((step, i) => (
              <View
                key={step.num}
                style={[s.step, i === 0 && { marginTop: 8 }]}
              >
                <View style={s.stepNumBox}>
                  <Text style={s.stepNumTxt}>{step.num}</Text>
                </View>
                <View style={s.stepRight}>
                  <View style={s.stepTitleRow}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    {step.badge && (
                      <View style={s.badge}>
                        <Text style={s.badgeTxt}>{step.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
            <View style={s.callout}>
              {/*<Text style={s.calloutTitle}>· Checkout the Collection ·</Text>
              <TouchableOpacity
                style={s.btnBorder}
                onPress={() => {}}
                activeOpacity={0.85}
              >
                <Text style={s.btnBorderTxt}>Browse & Buy →</Text>
              </TouchableOpacity>*/}
            </View>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: C.black }}>
          <View style={[s.footer, { paddingHorizontal: sidePad }]}>
            <Text style={s.footerLogo}>
              Michael <Text style={s.footerLogoEm}>By Christian</Text>
            </Text>
            <View style={s.footerRule} />
            <Text style={s.footerSub}>
              Phygital Luxury Fashion · Stellar Blockchain · Est. 2026
            </Text>
            <Text style={s.footerHandle}>@michaelbychristian · @cinccity</Text>
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },
  navSafe: {
    backgroundColor: C.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  nav: { paddingVertical: 14 },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 2,
  },
  navLogo: {
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "700",
    color: C.cream,
  },
  navLogoEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  navLinks: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    flexWrap: "wrap",
  },
  navLink: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(245,239,224,0.65)",
  },
  hamburger: { padding: 4, gap: 5, justifyContent: "center" },
  hLine: { width: 22, height: 2, backgroundColor: C.cream, borderRadius: 1 },
  hLineTop: { transform: [{ rotate: "45deg" }, { translateY: 7 }] },
  hLineMid: { opacity: 0 },
  hLineBot: { transform: [{ rotate: "-45deg" }, { translateY: -7 }] },
  mobileMenu: {
    backgroundColor: C.charcoal,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  mobileMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mobileMenuTxt: {
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.cream,
  },
  hero: {
    width: "100%",
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: C.black,
  },
  heroSection: { width: "100%", backgroundColor: C.black, overflow: "hidden" },
  heroFrame: {
    width: "100%",
    position: "relative",
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: C.black,
  },
  heroMedia: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    zIndex: 0,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  heroContent: { paddingBottom: 44, zIndex: 2 },
  heroVideo: { width: "100%", height: "100%" },
  heroTextBlock: { maxWidth: 420 },
  heroTextBlockWide: { marginLeft: 80 },
  heroInner: {},
  heroEye: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 14,
  },
  heroTitle: {
    fontFamily: "serif",
    fontWeight: "900",
    color: C.cream,
    letterSpacing: -1,
  },
  heroSub: {
    fontFamily: "serif",
    fontStyle: "italic",
    fontWeight: "300",
    color: C.goldLt,
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroTagline: {
    fontFamily: "serif",
    fontStyle: "italic",
    fontSize: 15,
    color: "rgba(245,239,224,0.58)",
    marginTop: 14,
    lineHeight: 23,
    maxWidth: 380,
  },
  ctaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 24 },
  btnWhite: {
    backgroundColor: C.cream,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  btnWhiteTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: "rgba(245,239,224,0.38)",
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  btnGhostTxt: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.cream,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 16 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(245,239,224,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipTxt: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(245,239,224,0.48)",
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.black,
    paddingVertical: 48,
  },
  sectionAlt: { backgroundColor: C.charcoal },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 12,
  },
  h2: {
    fontFamily: "serif",
    fontWeight: "900",
    color: C.cream,
    marginBottom: 16,
  },
  h2Em: { fontStyle: "italic", fontWeight: "300", color: C.goldLt },
  bodyText: {
    fontSize: 14,
    color: "#A09880",
    lineHeight: 24,
    marginBottom: 24,
  },
  point: {
    flexDirection: "row",
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 18,
  },
  pointNum: {
    fontSize: 10,
    fontWeight: "700",
    color: C.gold,
    letterSpacing: 2,
    width: 26,
    marginTop: 2,
  },
  pointRight: { flex: 1 },
  pointTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.cream,
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  pointBody: { fontSize: 13, color: "#A09880", lineHeight: 20 },
  statsSection: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.charcoal,
    paddingVertical: 48,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: 22,
    gap: 16,
  },
  statDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  statNum: {
    fontFamily: "serif",
    fontSize: 48,
    fontWeight: "900",
    color: C.cream,
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  statLbl: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    flex: 1,
    flexWrap: "wrap",
  },
  collSection: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.black,
  },
  btnGold: {
    backgroundColor: C.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignSelf: "flex-start",
  },
  btnGoldTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.black,
  },
  bagGrid: { gap: 2 },
  bagRow: { flexDirection: "row", gap: 2, marginBottom: 2 },
  bagCard: {
    flex: 1,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  bagImgWrap: {
    aspectRatio: 1,
    backgroundColor: "#0C0B09",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  bagImg: { width: "100%", height: "100%" },
  bagCardBody: { padding: 10 },
  bagName: {
    fontFamily: "serif",
    fontSize: 12,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 3,
  },
  bagColor: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  phygitalLead: {
    fontSize: 15,
    color: "#A09880",
    lineHeight: 26,
    marginBottom: 28,
    fontStyle: "italic",
    fontFamily: "serif",
  },
  phCard: {
    flexDirection: "row",
    gap: 18,
    paddingTop: 22,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  phCardNum: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  phCardNumTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  phCardBody: { flex: 1 },
  phCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 7,
    lineHeight: 21,
  },
  phCardText: { fontSize: 13, color: "#A09880", lineHeight: 21 },
  phQuote: {
    marginTop: 36,
    marginBottom: 32,
    paddingLeft: 18,
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
  },
  phQuoteMark: {
    fontFamily: "serif",
    fontSize: 44,
    color: C.gold,
    lineHeight: 36,
    marginBottom: 4,
  },
  phQuoteText: {
    fontFamily: "serif",
    fontStyle: "italic",
    fontSize: 17,
    color: C.cream,
    lineHeight: 27,
    marginBottom: 10,
  },
  phQuoteAttr: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.muted,
  },
  step: {
    flexDirection: "row",
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 16,
  },
  stepNumBox: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumTxt: { fontSize: 12, fontWeight: "700", color: C.gold },
  stepRight: { flex: 1 },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.cream,
    flex: 1,
    lineHeight: 19,
  },
  badge: {
    backgroundColor: "rgba(91,175,133,0.12)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.35)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeTxt: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.green,
  },
  stepBody: { fontSize: 13, color: "#A09880", lineHeight: 20 },
  callout: {
    marginTop: 32,
    backgroundColor: C.black,
    borderWidth: 1,
    borderColor: C.border,
    padding: 22,
  },
  calloutTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 16,
    textAlign: "center",
  },
  btnBorder: {
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnBorderTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.cream,
  },
  footer: {
    paddingVertical: 44,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerLogo: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
    color: C.cream,
    marginBottom: 12,
  },
  footerLogoEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  footerRule: {
    height: 1,
    width: 40,
    backgroundColor: C.border,
    marginBottom: 12,
  },
  footerSub: {
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 17,
  },
  footerHandle: { fontSize: 10, color: C.muted },
});
