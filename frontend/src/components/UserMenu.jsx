import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import styles from "./UserMenu.module.css";

/* The signed-in user's avatar in the header, with a small dropdown holding the
   account link and sign out — so the header carries an icon rather than a bare
   username and a loose button. */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on an outside click or Escape, the two things a user expects.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.username || "?").trim().charAt(0).toUpperCase();

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.avatarBtn}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.accountMenu}
        title={user.username}
      >
        <span className={styles.avatar} aria-hidden="true">{initial}</span>
        <svg className={styles.chevron} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.identity}>
            <span className={styles.avatarLarge} aria-hidden="true">{initial}</span>
            <span className={styles.identityText}>
              <span className={styles.name}>{user.username}</span>
              {user.email && <span className={styles.email}>{user.email}</span>}
            </span>
          </div>

          <button type="button" role="menuitem" className={styles.item} onClick={() => go("/profile")}>
            <PersonIcon />
            {t.profileTitle}
          </button>
          <button type="button" role="menuitem" className={styles.item} onClick={() => go("/history")}>
            <ClockIcon />
            {t.navHistory}
          </button>

          <hr className={styles.divider} />

          <button
            type="button"
            role="menuitem"
            className={`${styles.item} ${styles.danger}`}
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <ExitIcon />
            {t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6V12l3 1.8" strokeLinecap="round" />
    </svg>
  );
}
function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 20H6a1 1 0 01-1-1V5a1 1 0 011-1h8" strokeLinecap="round" />
      <path d="M17 15l3-3-3-3M20 12h-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
