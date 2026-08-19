import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* Guards routes that need a signed-in user. Diagnosis stays public — only
   account pages use this. */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ padding: "var(--space-7)", textAlign: "center", color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
