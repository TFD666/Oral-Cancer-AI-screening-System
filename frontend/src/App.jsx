import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import NewScan from "./pages/NewScan";
import ScanDetail from "./pages/ScanDetail";
import History from "./pages/History";
import CareGuidance from "./pages/CareGuidance";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <NewScan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan/:id"
          element={
            <ProtectedRoute>
              <ScanDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/care"
          element={
            <ProtectedRoute>
              <CareGuidance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
      <BottomNav />
    </div>
  );
}
