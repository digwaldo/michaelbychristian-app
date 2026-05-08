// app/auth.tsx — Sign in / Sign up (light theme)

import { router } from "expo-router";
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
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const T = {
  bg: "#FFFFFF",
  bgAlt: "#F8F6F2",
  border: "#E8E4DC",
  text: "#1A1814",
  textSub: "#6B6458",
  textMuted: "#9A9088",
  gold: "#B8963E",
  red: "#B84040",
  green: "#2D7A52",
};

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setSuccess("");
    setName("");
    setPassword("");
    setConfirm("");
  }

  async function handleSubmit() {
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (mode === "signup") {
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          setError(error);
          return;
        }
        router.replace("/profile" as any);
      } else {
        const { error } = await signUpWithEmail(
          email.trim(),
          password,
          name.trim(),
        );
        if (error) {
          setError(error);
          return;
        }
        setSuccess(
          "Account created! Check your email to confirm, then sign in.",
        );
        switchMode("signin");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error);
        return;
      }
      router.replace("/profile" as any);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email above first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setError(error.message);
    else setSuccess("Password reset email sent — check your inbox.");
  }

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <Text style={s.eyebrow}>Michael By Christian</Text>
            <Text style={s.title}>
              {mode === "signin" ? "Welcome back" : "Create account"}
            </Text>
            <Text style={s.subtitle}>
              {mode === "signin"
                ? "Sign in to access your profile and fragrance inquiries."
                : "Join MBC to track inquiries and be first for new releases."}
            </Text>

            {/* Mode toggle */}
            <View style={s.toggle}>
              <TouchableOpacity
                style={[s.toggleBtn, mode === "signin" && s.toggleBtnActive]}
                onPress={() => switchMode("signin")}
              >
                <Text
                  style={[s.toggleTxt, mode === "signin" && s.toggleTxtActive]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, mode === "signup" && s.toggleBtnActive]}
                onPress={() => switchMode("signup")}
              >
                <Text
                  style={[s.toggleTxt, mode === "signup" && s.toggleTxtActive]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Google */}
            <TouchableOpacity
              style={s.googleBtn}
              onPress={handleGoogle}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color={T.text} size="small" />
              ) : (
                <>
                  <Text style={s.googleG}>G</Text>
                  <Text style={s.googleTxt}>
                    {mode === "signin"
                      ? "Continue with Google"
                      : "Sign up with Google"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Name (signup) */}
            {mode === "signup" && (
              <>
                <Text style={s.label}>Full Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="Your name"
                  placeholderTextColor={T.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="your@email.com"
              placeholderTextColor={T.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder={
                mode === "signup" ? "Min. 8 characters" : "Your password"
              }
              placeholderTextColor={T.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* Confirm password (signup) */}
            {mode === "signup" && (
              <>
                <Text style={s.label}>Confirm Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Repeat your password"
                  placeholderTextColor={T.textMuted}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                />
              </>
            )}

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}
            {!!success && (
              <View style={s.successBox}>
                <Text style={s.successTxt}>{success}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.submitBtn, loading && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.submitTxt}>
                  {mode === "signin" ? "Sign In →" : "Create Account →"}
                </Text>
              )}
            </TouchableOpacity>

            {mode === "signin" && (
              <TouchableOpacity
                style={s.forgotWrap}
                onPress={handleForgotPassword}
              >
                <Text style={s.forgotTxt}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {mode === "signup" && (
              <Text style={s.termsTxt}>
                By creating an account you agree to our terms of service and
                privacy policy.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bgAlt },
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

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    padding: 32,
  },

  eyebrow: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: T.gold,
    marginBottom: 10,
    textAlign: "center",
  },
  title: {
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "900",
    color: T.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: T.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: T.bg,
  },
  toggleBtnActive: { backgroundColor: T.gold },
  toggleTxt: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: T.textMuted,
    fontWeight: "600",
  },
  toggleTxtActive: { color: "#FFFFFF" },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 13,
    backgroundColor: T.bg,
    marginBottom: 20,
  },
  googleG: { fontSize: 14, fontWeight: "700", color: T.text },
  googleTxt: { fontSize: 13, color: T.text, fontWeight: "500" },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerTxt: { fontSize: 11, color: T.textMuted },

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
    backgroundColor: T.bg,
    color: T.text,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },

  errorBox: {
    borderWidth: 1,
    borderColor: "#E8B4B4",
    backgroundColor: "#FDF0F0",
    padding: 12,
    marginBottom: 16,
  },
  errorTxt: { fontSize: 12, color: T.red, lineHeight: 18 },
  successBox: {
    borderWidth: 1,
    borderColor: "#A8D4BC",
    backgroundColor: "#EEF7F2",
    padding: 12,
    marginBottom: 16,
  },
  successTxt: { fontSize: 12, color: T.green, lineHeight: 18 },

  submitBtn: {
    backgroundColor: T.gold,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  submitTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#FFFFFF",
  },

  forgotWrap: { alignItems: "center", paddingVertical: 4, marginBottom: 8 },
  forgotTxt: { fontSize: 11, color: T.textMuted },
  termsTxt: {
    fontSize: 10,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
});
