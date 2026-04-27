import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: "var(--text-muted)" }}>Checking session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}
