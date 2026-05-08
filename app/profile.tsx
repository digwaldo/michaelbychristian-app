// app/profile.tsx — Profile screen (main branch, light theme)

import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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

interface Inquiry {
  id: string;
  fragrance: string;
  volume: string;
  created_at: string;
  status: string;
}

export default function ProfileScreen() {
  const { session, user, profile, loading, signOut, refreshProfile } =
    useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInqLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (user) loadInquiries();
  }, [user]);

  async function loadInquiries() {
    if (!user?.email) return;
    setInqLoading(true);
    try {
      const { data, error } = await supabase
        .from("fragrance_inquiries")
        .select("*")
        .eq("email", user.email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) setInquiries(data);
    } catch (e) {
      console.log("Inquiries load failed:", e);
    } finally {
      setInqLoading(false);
    }
  }

  async function saveName() {
    if (!newName.trim()) {
      setNameError("Name cannot be empty.");
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: newName.trim() })
        .eq("id", user!.id);
      if (error) {
        setNameError(error.message);
        return;
      }
      await refreshProfile();
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // ── Not signed in ──────────────────────────────────────────
  if (!loading && !session) {
    return (
      <View style={s.root}>
        <SafeAreaView edges={["top"]} style={s.topBar}>
          <View style={s.topBarInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.backTxt}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.topLogo}>
              Michael <Text style={s.topLogoEm}>By Christian</Text>
            </Text>
            <View style={s.topSpacer} />
          </View>
        </SafeAreaView>
        <View style={s.center}>
          <Text style={s.guestEye}>Michael By Christian</Text>
          <Text style={s.guestTitle}>My Profile</Text>
          <Text style={s.guestSub}>
            Sign in to view your fragrance inquiries and be first to know when
            pieces become available.
          </Text>
          <TouchableOpacity
            style={s.signInBtn}
            onPress={() => router.push("/auth" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.signInBtnTxt}>Sign In / Create Account →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.ghostBtn}
            onPress={() => router.push("/fragrance" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.ghostBtnTxt}>Browse Fragrances</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.centerFull}>
        <ActivityIndicator color={T.gold} size="large" />
      </View>
    );
  }

  const initials = (profile?.name || user?.email || "M")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

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
          <TouchableOpacity
            onPress={signOut}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Profile header ── */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>

          {editingName ? (
            <View style={s.editNameRow}>
              <TextInput
                style={s.nameInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                autoCapitalize="words"
                placeholder="Your name"
                placeholderTextColor={T.textMuted}
              />
              <TouchableOpacity
                style={[s.saveNameBtn, savingName && { opacity: 0.6 }]}
                onPress={saveName}
                disabled={savingName}
              >
                {savingName ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.saveNameTxt}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelNameBtn}
                onPress={() => {
                  setEditingName(false);
                  setNameError("");
                }}
              >
                <Text style={s.cancelNameTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNewName(profile?.name || "");
                setEditingName(true);
              }}
              style={s.nameRow}
            >
              <Text style={s.profileName}>{profile?.name || "MBC Member"}</Text>
              <Text style={s.editIcon}>✎</Text>
            </TouchableOpacity>
          )}
          {!!nameError && <Text style={s.nameError}>{nameError}</Text>}

          <Text style={s.profileEmail}>{user?.email}</Text>
          <Text style={s.memberSince}>
            Member since{" "}
            {profile?.created_at ? formatDate(profile.created_at) : "—"}
          </Text>
        </View>

        {/* ── My Pieces — Coming Soon ── */}
        <View style={s.section}>
          <Text style={s.sectionEye}>My Pieces</Text>
          <Text style={s.sectionTitle}>On-Chain Ownership</Text>
          <View style={s.comingSoonBox}>
            <Text style={s.comingSoonIcon}>✦</Text>
            <Text style={s.comingSoonTitle}>Coming Soon</Text>
            <Text style={s.comingSoonSub}>
              MBC is launching on the Stellar blockchain. Once live, your
              authenticated bags and fragrances will appear here — with full
              on-chain provenance, NFC verification, and transfer history.
            </Text>
            <TouchableOpacity
              style={s.notifyBtn}
              onPress={() =>
                Linking.openURL(
                  `mailto:youngcompltd@gmail.com?subject=Mainnet Launch Notification — ${user?.email}&body=Please notify me when MBC launches on mainnet.`,
                )
              }
              activeOpacity={0.85}
            >
              <Text style={s.notifyBtnTxt}>Notify Me at Launch →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.dividerLine} />

        {/* ── Fragrance Inquiries ── */}
        <View style={s.section}>
          <Text style={s.sectionEye}>Fragrance Inquiries</Text>
          <Text style={s.sectionTitle}>Your Requests</Text>

          {inquiriesLoading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color={T.gold} size="small" />
              <Text style={s.loadingTxt}>Loading inquiries...</Text>
            </View>
          ) : inquiries.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTxt}>No inquiries yet.</Text>
              <TouchableOpacity
                style={s.browseBtn}
                onPress={() => router.push("/fragrance" as any)}
                activeOpacity={0.85}
              >
                <Text style={s.browseBtnTxt}>Browse Fragrances →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.inquiriesList}>
              {inquiries.map((inq, i) => (
                <View
                  key={inq.id}
                  style={[
                    s.inquiryRow,
                    i < inquiries.length - 1 && s.inquiryBorder,
                  ]}
                >
                  <View style={s.inquiryLeft}>
                    <Text style={s.inquiryName}>{inq.fragrance}</Text>
                    <Text style={s.inquiryDetail}>
                      {inq.volume} · {formatDate(inq.created_at)}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.inquiryStatus,
                      inq.status === "responded" && {
                        borderColor: T.greenBorder,
                        backgroundColor: T.greenBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.inquiryStatusTxt,
                        inq.status === "responded" && { color: T.green },
                      ]}
                    >
                      {inq.status === "responded" ? "✦ Responded" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={s.dividerLine} />

        {/* ── Account ── */}
        <View style={s.section}>
          <Text style={s.sectionEye}>Account</Text>
          {[
            { label: "Email", val: user?.email || "—" },
            {
              label: "Auth provider",
              val: user?.app_metadata?.provider || "email",
            },
            {
              label: "Account ID",
              val: user?.id?.substring(0, 12) + "..." || "—",
            },
          ].map(({ label, val }) => (
            <View key={label} style={s.accountRow}>
              <Text style={s.accountKey}>{label}</Text>
              <Text style={s.accountVal}>{val}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={s.signOutBlock}
            onPress={signOut}
            activeOpacity={0.85}
          >
            <Text style={s.signOutBlockTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  centerFull: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
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
  topSpacer: { width: 60 },
  backTxt: { fontSize: 11, color: T.textSub },
  topLogo: {
    fontFamily: "serif",
    fontSize: 15,
    fontWeight: "700",
    color: T.text,
  },
  topLogoEm: { fontStyle: "italic", fontWeight: "400", color: T.gold },
  signOutTxt: { fontSize: 11, color: T.textMuted },

  // Guest state
  guestEye: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: T.gold,
    marginBottom: 12,
    textAlign: "center",
  },
  guestTitle: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "900",
    color: T.text,
    marginBottom: 10,
    textAlign: "center",
  },
  guestSub: {
    fontSize: 13,
    color: T.textSub,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 320,
  },
  signInBtn: {
    backgroundColor: T.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 12,
  },
  signInBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#fff",
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  ghostBtnTxt: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textSub,
  },

  // Profile header
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: T.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarTxt: { fontSize: 22, fontWeight: "700", color: "#fff" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  profileName: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "900",
    color: T.text,
  },
  editIcon: { fontSize: 13, color: T.textMuted, marginTop: 2 },
  profileEmail: { fontSize: 12, color: T.textSub, marginBottom: 4 },
  memberSince: { fontSize: 10, color: T.textMuted, letterSpacing: 0.5 },

  editNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    color: T.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  saveNameBtn: {
    backgroundColor: T.gold,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  saveNameTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
  cancelNameBtn: { padding: 8 },
  cancelNameTxt: { fontSize: 13, color: T.textMuted },
  nameError: { fontSize: 11, color: T.red, marginTop: 4 },

  // Sections
  section: { paddingHorizontal: 24, paddingVertical: 28 },
  sectionEye: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: T.gold,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "900",
    color: T.text,
    marginBottom: 20,
  },
  dividerLine: { height: 1, backgroundColor: T.border },

  // Coming soon
  comingSoonBox: {
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bgAlt,
    padding: 24,
    alignItems: "center",
  },
  comingSoonIcon: { fontSize: 24, color: T.gold, marginBottom: 10 },
  comingSoonTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    marginBottom: 8,
  },
  comingSoonSub: {
    fontSize: 13,
    color: T.textSub,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  notifyBtn: {
    borderWidth: 1,
    borderColor: T.gold,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  notifyBtnTxt: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: T.gold,
  },

  // Inquiries
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  loadingTxt: { fontSize: 11, color: T.textMuted },
  emptyBox: { paddingVertical: 20, alignItems: "center" },
  emptyTxt: { fontSize: 13, color: T.textMuted, marginBottom: 16 },
  browseBtn: {
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  browseBtnTxt: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textSub,
  },
  inquiriesList: { borderWidth: 1, borderColor: T.border, overflow: "hidden" },
  inquiryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: T.bg,
  },
  inquiryBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  inquiryLeft: { flex: 1 },
  inquiryName: {
    fontFamily: "serif",
    fontSize: 14,
    fontWeight: "700",
    color: T.text,
    marginBottom: 3,
  },
  inquiryDetail: { fontSize: 10, color: T.textMuted, letterSpacing: 0.3 },
  inquiryStatus: {
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inquiryStatusTxt: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textMuted,
    fontWeight: "600",
  },

  // Account
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  accountKey: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: T.textSub,
  },
  accountVal: { fontSize: 12, color: T.text, fontWeight: "500" },
  signOutBlock: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
    alignItems: "center",
  },
  signOutBlockTxt: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: T.textMuted,
  },
});
