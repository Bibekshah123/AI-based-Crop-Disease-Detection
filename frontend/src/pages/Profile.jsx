import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { me as fetchMe } from "../lib/api";
import { listHistory, clearHistory } from "../lib/history";
import s from "./pages.module.css";
import a from "./auth.module.css";

export default function Profile() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [created, setCreated] = useState("");
  const [historyCount, setHistoryCount] = useState(() => listHistory().length);

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((data) => active && setCreated(data.created_at || ""))
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const signOut = () => {
    logout();
    navigate("/");
  };

  const clearLocal = () => {
    clearHistory();
    setHistoryCount(0);
  };

  return (
    <div className={`container ${s.page} ${a.wrap}`}>
      <div className={a.card}>
        <h1 className={a.title}>{t.profileTitle}</h1>
        <p className={a.subtitle}>{t.savedOnServer}</p>

        <div className={a.rows}>
          <div className={a.row}>
            <span className={a.rowLabel}>{t.username}</span>
            <span className={a.rowValue}>{user?.username}</span>
          </div>
          {user?.email && (
            <div className={a.row}>
              <span className={a.rowLabel}>{t.email}</span>
              <span className={a.rowValue}>{user.email}</span>
            </div>
          )}
          {created && (
            <div className={a.row}>
              <span className={a.rowLabel}>{t.memberSince}</span>
              <span className={a.rowValue}>{new Date(created).toLocaleDateString()}</span>
            </div>
          )}
          <div className={a.row}>
            <span className={a.rowLabel}>{t.savedChecks}</span>
            <span className={a.rowValue}>{historyCount}</span>
          </div>
        </div>

        <div className={a.actions}>
          <button type="button" className="btn btn-secondary" onClick={clearLocal} disabled={historyCount === 0}>
            {t.deleteAll}
          </button>
          <button type="button" className="btn btn-primary" onClick={signOut}>
            {t.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}
