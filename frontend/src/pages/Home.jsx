import { Link } from "react-router-dom";
import s from "./pages.module.css";

const STEPS = [
  "Select the crop",
  "Add a clear leaf photo",
  "Review the possible disease and guidance",
];

export default function Home() {
  return (
    <>
      <section className={s.hero}>
        <div className="container">
          <h1 className={s.heroTitle}>Identify crop disease from a leaf photo</h1>
          <p className={s.heroText}>
            Upload a clear leaf image to receive a possible disease match, confidence level, visual
            explanation, and general crop-care guidance.
          </p>
          <div className={s.heroActions}>
            <Link to="/diagnose" className="btn btn-primary">Check a leaf</Link>
            <Link to="/library" className="btn btn-secondary">Browse disease library</Link>
          </div>
        </div>
      </section>

      <section className={s.stepsSection}>
        <div className="container">
          <h2 className={s.stepsTitle}>How it works</h2>
          <ol className={s.steps}>
            {STEPS.map((text, i) => (
              <li key={i} className={s.step}>
                <span className={s.stepNum} aria-hidden="true">{i + 1}</span>
                <p className={s.stepText}>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
