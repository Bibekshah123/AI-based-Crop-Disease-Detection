import { Link } from "react-router-dom";
import s from "./pages.module.css";

export default function About() {
  return (
    <div className={`container ${s.page} ${s.pageNarrow}`}>
      <div className={s.head}>
        <h1 className={s.title}>About &amp; disclaimer</h1>
        <p className={s.lead}>What this tool does, and how to use its results responsibly.</p>
      </div>

      <div className="surface" style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}>
        <section>
          <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>What it does</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            CropSense analyzes a photo of a crop leaf and suggests a <em>possible</em> disease match,
            with a confidence level and a visual explanation of the regions that influenced the model.
            It also provides general symptoms, likely cause, management, and prevention notes.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>Limitations</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            The model was trained largely on curated leaf images. Real field photos vary in lighting,
            background, and disease stage, so accuracy in the field can be lower. Results are a starting
            point for investigation, not a definitive diagnosis. When a result is marked uncertain,
            treat it with extra caution and re-check with a clearer photo.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>Disclaimer</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            This tool provides general guidance only and is not a substitute for professional
            agricultural advice. Confirm any important decision with a qualified local expert before
            applying treatments.
          </p>
        </section>

        <div>
          <Link to="/diagnose" className="btn btn-primary">Check a leaf</Link>
        </div>
      </div>
    </div>
  );
}
