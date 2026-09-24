import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { me as fetchMe, getServerHistory } from "../lib/api";
import { listHistory } from "../lib/history";
import s from "./pages.module.css";
import p from "./Profile.module.css";

export default function Profile() {
  const { user, logout } = useAuth();
  const { t, lang } = useLang();
  const [created, setCreated] = useState("");
  const [savedCount, setSavedCount] = useState(() => listHistory().length);

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((data) => active && setCreated(data.created_at || ""))
      .catch(() => {});
    getServerHistory()
      .then((rows) => active && setSavedCount(rows.length))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const initial = (user?.username || "?").trim().charAt(0).toUpperCase();
  const memberSince = created
    ? new Intl.DateTimeFormat(lang === "np" ? "ne-NP" : "en", { dateStyle: "long" }).format(new Date(created))
    : "—";

  return (
    <div className={`container ${s.page} ${p.wrap}`}>
      <header className={p.identity}>
        <span className={p.avatar} aria-hidden="true">{initial}</span>
        <div>
          <h1 className={p.name}>{user?.username}</h1>
          {user?.email && <p className={p.email}>{user.email}</p>}
        </div>
      </header>

      <dl className={p.stats}>
        <div className={p.stat}>
          <dt className={p.statLabel}>{t.savedChecks}</dt>
          <dd className={p.statValue}>{savedCount}</dd>
        </div>
        <div className={p.stat}>
          <dt className={p.statLabel}>{t.memberSince}</dt>
          <dd className={p.statValue}>{memberSince}</dd>
        </div>
      </dl>

      <section className={p.card}>
        <h2 className={p.cardTitle}>{t.accountDetails}</h2>
        <div className={p.rows}>
          <div className={p.row}>
            <span className={p.rowLabel}>{t.username}</span>
            <span className={p.rowValue}>{user?.username}</span>
          </div>
          {user?.email && (
            <div className={p.row}>
              <span className={p.rowLabel}>{t.email}</span>
              <span className={p.rowValue}>{user.email}</span>
            </div>
          )}
          <div className={p.row}>
            <span className={p.rowLabel}>{t.password}</span>
            <span className={p.rowValue}>••••••••</span>
          </div>
        </div>
        <p className={p.note}>{t.accountNote}</p>
      </section>

      <button type="button" className={`btn btn-secondary ${p.signOut}`} onClick={logout}>
        {t.signOut}
      </button>
    </div>
  );
}
