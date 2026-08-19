import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Layout.module.css";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/diagnose", label: "Diagnose" },
  { to: "/library", label: "Disease library" },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever a link inside the nav is activated.
  const closeOnNavigate = (e) => {
    if (e.target.closest("a")) setOpen(false);
  };

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>

      <header className={styles.header}>
        <div className={`container ${styles.bar}`}>
          <Link to="/" className={styles.brand} aria-label="CropSense home">
            <LeafMark />
            <span className={styles.brandName}>CropSense</span>
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
            aria-label="Primary"
            onClick={closeOnNavigate}
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
            <span className={styles.navDivider} aria-hidden="true" />
            {user ? (
              <NavLink to="/profile" className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ""}`}>
                {user.username}
              </NavLink>
            ) : (
              <NavLink to="/login" className={`${styles.link} ${styles.linkCta}`}>
                Sign in
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className="container">
          <p className={styles.footText}>
            CropSense provides general crop-care guidance and is not a substitute for professional
            agricultural advice.
          </p>
          <nav className={styles.footLinks} aria-label="Footer">
            <Link to="/about">About &amp; disclaimer</Link>
            <Link to="/library">Disease library</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
