import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui";
import s from "./pages.module.css";

export default function NotFound() {
  return (
    <div className={`container ${s.page}`}>
      <EmptyState
        title="Page not found"
        action={<Link to="/" className="btn btn-primary">Back to home</Link>}
      >
        The page you were looking for doesn&apos;t exist or has moved.
      </EmptyState>
    </div>
  );
}
