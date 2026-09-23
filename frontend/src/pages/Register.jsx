import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { classifyError } from "../lib/api";
import AuthShowcase from "../components/AuthShowcase";
import a from "./auth.module.css";

export default function Register() {
  const { signup } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await signup(form.username.trim(), form.email.trim(), form.password);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(classifyError(err).message || t.signupFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={a.split}>
      <AuthShowcase />

      <div className={a.formSide}>
        <div className={a.wrap}>
          <div className={a.card}>
        <h1 className={a.title}>{t.createAccountTitle}</h1>
        <p className={a.subtitle}>{t.createAccountLead}</p>

        <form className={a.form} onSubmit={submit} noValidate>
          <div className={a.field}>
            <label className="field-label" htmlFor="reg-username">{t.username}</label>
            <input
              id="reg-username"
              className="input"
              value={form.username}
              autoComplete="username"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className={a.field}>
            <label className="field-label" htmlFor="reg-email">{t.email}</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              value={form.email}
              autoComplete="email"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className={a.field}>
            <label className="field-label" htmlFor="reg-password">{t.password}</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              value={form.password}
              autoComplete="new-password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            <p className="field-hint">{t.passwordHint}</p>
          </div>

          {error && <p className={`note note-error ${a.error}`} role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t.creatingAccount : t.createAccount}
          </button>
        </form>

            <p className={a.alt}>
              {t.haveAccount} <Link to="/login">{t.signIn}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
