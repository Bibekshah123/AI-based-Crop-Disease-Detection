import { useLang } from "../context/LanguageContext";
import heroImage from "../assets/nepal-farming.webp";
import a from "../pages/auth.module.css";

/* The signed-out half of the sign-in and create-account screens. Because an
   account is now required, this panel carries the introduction the home page
   used to give: what the tool does, for whom, and in which languages. */
export default function AuthShowcase() {
  const { t } = useLang();
  const points = [t.authPoint1, t.authPoint2, t.authPoint3, t.authPoint4];

  return (
    <aside className={a.showcase} style={{ "--auth-image": `url(${heroImage})` }}>
      <div className={a.showcaseBody}>
      <h2 className={a.showcaseTitle}>{t.authHeadline}</h2>
      <p className={a.showcaseText}>{t.authSubhead}</p>
      <ul className={a.points}>
        {points.map((p) => (
          <li key={p} className={a.point}>
            <span className={a.pointDot} aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
      </div>
      <p className={a.credit}>
        <a href="https://commons.wikimedia.org/wiki/File:Farming_in_Nepal.jpg" target="_blank" rel="noreferrer">
          Photo: Adman Payne, CC BY-SA 4.0
        </a>
      </p>
    </aside>
  );
}
