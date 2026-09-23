import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { classifyError } from "../lib/api";
import s from "./pages.module.css";
import a from "./auth.module.css";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const registered = location.state?.registered;

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await login(form.username.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(classifyError(err).message || t.loginFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`container ${s.page} ${a.wrap}`}>
      <div className={a.card}>
        <h1 className={a.title}>{t.signInTitle}</h1>
        <p className={a.subtitle}>{t.signInLead}</p>

        {registered && (
          <p className={`note note-info ${a.success}`} role="status">
            {t.accountCreated}
          </p>
        )}

        <form className={a.form} onSubmit={submit} noValidate>
          <div className={a.field}>
            <label className="field-label" htmlFor="login-username">{t.username}</label>
            <input
              id="login-username"
              className="input"
              value={form.username}
              autoComplete="username"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className={a.field}>
            <label className="field-label" htmlFor="login-password">{t.password}</label>
            <input
              id="login-password"
              type="password"
              className="input"
              value={form.password}
              autoComplete="current-password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && <p className={`note note-error ${a.error}`} role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t.signingIn : t.signIn}
          </button>
        </form>

        <p className={a.alt}>
          {t.noAccountYet} <Link to="/register">{t.createAccount}</Link>
        </p>
      </div>
    </div>
  );
}
