import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { classifyError } from "../lib/api";
import s from "./pages.module.css";
import a from "./auth.module.css";

export default function Register() {
  const { signup } = useAuth();
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
      setError(classifyError(err).message || "Sign up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`container ${s.page} ${a.wrap}`}>
      <div className={a.card}>
        <h1 className={a.title}>Create an account</h1>
        <p className={a.subtitle}>Optional — diagnosis works without an account.</p>

        <form className={a.form} onSubmit={submit} noValidate>
          <div className={a.field}>
            <label className="field-label" htmlFor="reg-username">Username</label>
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
            <label className="field-label" htmlFor="reg-email">Email</label>
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
            <label className="field-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              value={form.password}
              autoComplete="new-password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          {error && <p className={`note note-error ${a.error}`} role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className={a.alt}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
