import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import NepalFlag from "./NepalFlag";
import styles from "./Layout.module.css";

const NAV = [
  { to: "/", key: "navHome", end: true },
  { to: "/diagnose", key: "navDiagnose" },
  { to: "/library", key: "navLibrary" },
  { to: "/history", key: "navHistory" },
  { to: "/about", key: "navAbout" },
];

function LeafMark() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <path
        d="M20 4c-8 0-14 4-14 11 0 1.6.4 3 1 4.2L4 22l1.5-1.5C7 21.5 9 22 11 22c7 0 9-6 9-14 0-1.5 0-3 0-4Z"
        fill="var(--color-primary)"
      />
      <path d="M8 18c3-5 6-7 9-8" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { lang, toggle, t } = useLang();

  // Close the mobile menu whenever a link inside the nav is activated.
  const closeOnNavigate = (e) => {
    if (e.target.closest("a")) setOpen(false);
  };

  return (
    <>
      <a href="#main" className="skip-link">{t.skipToContent}</a>

      <header className={styles.header}>
        <div className={`container ${styles.bar}`}>
          <Link to="/" className={styles.brand} aria-label={t.brand}>
            <LeafMark />
            <span className={styles.brandName}>{t.brand}</span>
          </Link>

          <button
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls="primary-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>

          <nav
            id="primary-nav"
            className={`${styles.nav} ${open ? styles.navOpen : ""}`}
            aria-label={t.navPrimary}
            onClick={closeOnNavigate}
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ""}`}
              >
                {t[item.key]}
              </NavLink>
            ))}
            <button
              type="button"
              className={styles.langBtn}
              onClick={toggle}
              aria-label={lang === "en" ? t.switchToNepali : t.switchToEnglish}
              title={lang === "en" ? t.switchToNepali : t.switchToEnglish}
            >
              {lang === "en" ? "ने" : "EN"}
            </button>
          </nav>
        </div>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={`container ${styles.footInner}`}>
          <div className={styles.footMain}>
          <p className={styles.footText}>
            {t.footerTagline}
          </p>

          <nav className={styles.footLinks} aria-label={t.navFooter}>
            <Link to="/about">{t.footerAbout}</Link>
            <Link to="/library">{t.navLibrary}</Link>
          </nav>
          </div>

          <div className={styles.footAside}>
            <p className={styles.madeIn}>
              <NepalFlag size={26} title={t.nepalFlagAlt} />
              <span className={styles.madeInText}>
                <strong className={styles.madeInTitle}>{t.productOfNepal}</strong>
                <span className={styles.madeInSub}>{t.productOfNepalSub}</span>
              </span>
            </p>

            <p className={styles.credit}>
              <span className={styles.creditLabel}>{t.developedBy}</span>
              <strong className={styles.creditName}>{t.developerName}</strong>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
