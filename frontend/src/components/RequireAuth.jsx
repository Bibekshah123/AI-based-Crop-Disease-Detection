import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* Guards the whole app. Signing in is compulsory: a visitor without a session
   is sent to the sign-in screen, which is also where the project introduces
   itself. Used as a layout route, so every child route inherits the guard. */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="container"
        style={{ padding: "var(--space-7)", textAlign: "center", color: "var(--color-text-muted)" }}
      >
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children ?? <Outlet />;
}
