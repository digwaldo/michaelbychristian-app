// app/auth.tsx — Login / Sign Up screen

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
import { C } from "../lib/theme";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit() {
    setError("");
    setSuccess("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password required");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Name required");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          setError(error.message);
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
          setError(error.message);
          return;
        }
        setSuccess(
          "Account created! Check your email to confirm, then sign in.",
        );
        setMode("signin");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.topBar}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.topEye}>Michael By Christian</Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <Text style={s.eyebrow}>MBC Account</Text>
            <Text style={s.title}>
              {mode === "signin" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={s.sub}>
              {mode === "signin"
                ? "Sign in to access your pieces, wallet, and cart."
                : "Join MBC — your wallet is created automatically."}
            </Text>

            {/* Google */}
            <TouchableOpacity
              style={s.googleBtn}
              onPress={handleGoogle}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={s.googleBtnTxt}>G Continue with Google</Text>
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {mode === "signup" && (
              <TextInput
                style={s.input}
                placeholder="Full name"
                placeholderTextColor={C.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor={C.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={C.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={s.error}>{error}</Text> : null}
            {success ? <Text style={s.successTxt}>{success}</Text> : null}

            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.black} size="small" />
              ) : (
                <Text style={s.submitBtnTxt}>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setSuccess("");
              }}
              style={s.switchBtn}
            >
              <Text style={s.switchTxt}>
                {mode === "signin"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text style={{ color: C.gold }}>
                  {mode === "signin" ? "Sign Up" : "Sign In"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backBtn: { width: 60 },
  backTxt: { fontSize: 11, color: C.muted },
  topEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
    padding: 32,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 12,
  },
  title: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "900",
    color: C.cream,
    marginBottom: 8,
  },
  sub: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 24 },
  googleBtn: {
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  googleBtnTxt: { fontSize: 13, color: C.cream, fontWeight: "600" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerTxt: { fontSize: 11, color: C.muted },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.warm,
    color: C.cream,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  error: { fontSize: 12, color: C.red, marginBottom: 12, lineHeight: 18 },
  successTxt: {
    fontSize: 12,
    color: C.green,
    marginBottom: 12,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: C.gold,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  submitBtnTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.black,
  },
  switchBtn: { alignItems: "center" },
  switchTxt: { fontSize: 12, color: C.muted },
});
