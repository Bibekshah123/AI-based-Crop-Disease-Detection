import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { EmptyState } from "../components/ui";
import s from "./pages.module.css";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className={`container ${s.page}`}>
      <EmptyState
        title={t.notFound}
        action={<Link to="/" className="btn btn-primary">{t.backHome}</Link>}
      >
        {t.notFoundBody}
      </EmptyState>
    </div>
  );
}
