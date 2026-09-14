import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { CROPS, cropLabel } from "../lib/crops";
import heroImage from "../assets/nepal-farming.webp";
import hm from "./Home.module.css";

function CameraIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);

  // A photo picked here opens the diagnose page with it already loaded.
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) navigate("/diagnose", { state: { file } });
  };

  const steps = [t.step1, t.step2, t.step3];

  return (
    <>
      <section className={hm.hero} style={{ "--hero-image": `url(${heroImage})` }}>
        <div className={`container ${hm.heroGrid}`}>
          <div className={hm.heroCopy}>
            <h1 className={hm.title}>{t.homeTitle}</h1>
            <p className={hm.lead}>{t.homeLead}</p>
            <Link to="/library" className={hm.libraryLink}>{t.browseLibrary} →</Link>
          </div>

          <div className={hm.checkCard}>
            <span className={hm.checkIcon}><CameraIcon size={28} /></span>
            <h2 className={hm.checkTitle}>{t.checkALeaf}</h2>
            <p className={hm.checkBody}>{t.checkCardBody}</p>
            <div className={hm.checkActions}>
              <button type="button" className={`btn btn-primary ${hm.checkBtn}`} onClick={() => cameraRef.current?.click()}>
                <CameraIcon /> {t.takePhoto}
              </button>
              <button type="button" className={`btn btn-secondary ${hm.checkBtn}`} onClick={() => uploadRef.current?.click()}>
                <UploadIcon /> {t.uploadImage}
              </button>
            </div>
            <p className={hm.checkHint}>{t.checkCardHint}</p>
            <input ref={uploadRef} type="file" accept="image/*" onChange={handleChange} hidden />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} hidden />
          </div>
        </div>
        <a
          className={hm.credit}
          href="https://commons.wikimedia.org/wiki/File:Farming_in_Nepal.jpg"
          target="_blank"
          rel="noreferrer"
        >
          Photo: Adman Payne, CC BY-SA 4.0
        </a>
      </section>

      <section className={hm.section}>
        <div className="container">
          <h2 className={hm.sectionTitle}>{t.howItWorks}</h2>
          <ol className={hm.steps}>
            {steps.map((title, i) => (
              <li key={i} className={hm.step}>
                <span className={hm.stepNum} aria-hidden="true">{i + 1}</span>
                <span className={hm.stepTitle}>{title}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${hm.section} ${hm.sectionAlt}`}>
        <div className="container">
          <h2 className={hm.sectionTitle}>{t.cropsCovered}</h2>
          <ul className={hm.crops}>
            {CROPS.map((c) => (
              <li key={c.id} className={hm.cropChip}>{cropLabel(c, lang)}</li>
            ))}
          </ul>
          <p className={hm.note}>
            {t.cropsCoveredNote} <Link to="/about">{t.readMore}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
