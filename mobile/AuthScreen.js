import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "./auth";
import { colors, radius } from "./theme";

/* Sign in / create account. Reachable from the account button, never forced:
   the diagnose screen works without ever opening this. */
export default function AuthScreen({ t }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const registering = mode === "register";

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (registering) {
        await signup(form.username, form.email, form.password);
        setMode("login");
        setForm({ ...form, email: "", password: "" });
        setNotice(t.accountCreated);
      } else {
        await login(form.username, form.password);
      }
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(detail || (registering ? t.signupFailed : t.loginFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{registering ? t.createAccountTitle : t.signInTitle}</Text>
      <Text style={styles.lead}>{registering ? t.createAccountLead : t.signInLead}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t.username}</Text>
        <TextInput
          style={styles.input}
          value={form.username}
          onChangeText={(v) => setForm({ ...form, username: v })}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />

        {registering && (
          <>
            <Text style={styles.label}>{t.email}</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </>
        )}

        <Text style={styles.label}>{t.password}</Text>
        <TextInput
          style={styles.input}
          value={form.password}
          onChangeText={(v) => setForm({ ...form, password: v })}
          secureTextEntry
          autoCapitalize="none"
          textContentType={registering ? "newPassword" : "password"}
        />
        {registering && <Text style={styles.hint}>{t.passwordHint}</Text>}

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{registering ? t.createAccount : t.signIn}</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkBtn}
          onPress={() => {
            setMode(registering ? "login" : "register");
            setError("");
            setNotice("");
          }}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>
            {registering ? `${t.haveAccount} ${t.signIn}` : `${t.noAccountYet} ${t.createAccount}`}
          </Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  lead: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  notice: {
    marginTop: 14,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.greenSoft,
    borderWidth: 1,
    borderColor: colors.primaryTint,
    color: colors.primaryDark,
    fontSize: 13,
  },
  error: {
    marginTop: 14,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    color: colors.error,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkBtn: { marginTop: 14, alignItems: "center", paddingVertical: 8 },
  linkText: { color: colors.primaryDark, fontWeight: "700", fontSize: 14 },
  mutedLink: { color: colors.textMuted, fontWeight: "600", fontSize: 14 },
});
