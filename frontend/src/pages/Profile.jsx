import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { me as fetchMe } from "../lib/api";
import { listHistory, clearHistory } from "../lib/history";
import s from "./pages.module.css";
import a from "./auth.module.css";

export default function Profile() {
  const { user, logout } = useAuth();
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
        <h1 className={a.title}>Your account</h1>
        <p className={a.subtitle}>Manage your account and local data.</p>

        <div className={a.rows}>
          <div className={a.row}>
            <span className={a.rowLabel}>Username</span>
            <span className={a.rowValue}>{user?.username}</span>
          </div>
          {user?.email && (
            <div className={a.row}>
              <span className={a.rowLabel}>Email</span>
              <span className={a.rowValue}>{user.email}</span>
            </div>
          )}
          {created && (
            <div className={a.row}>
              <span className={a.rowLabel}>Member since</span>
              <span className={a.rowValue}>{new Date(created).toLocaleDateString()}</span>
            </div>
          )}
          <div className={a.row}>
            <span className={a.rowLabel}>Saved checks (this device)</span>
            <span className={a.rowValue}>{historyCount}</span>
          </div>
        </div>

        <div className={a.actions}>
          <button type="button" className="btn btn-secondary" onClick={clearLocal} disabled={historyCount === 0}>
            Clear local history
          </button>
          <button type="button" className="btn btn-primary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
