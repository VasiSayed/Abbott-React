import { Routes, Route, Navigate } from "react-router-dom";

import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import MeetingManagement from "./pages/admin/MeetingManagement";
import Registrations from "./pages/admin/Registrations";
import DataExport from "./pages/admin/DataExport";
import EventRegistrationPage from "./pages/public/EventRegistrationPage";
import AdminEventAnalytics from "./pages/admin/AdminEventAnalytics"; // 👈 NEW

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("access_token");
  return token ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/home/:code" element={<EventRegistrationPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/meetings"
        element={
          <RequireAuth>
            <MeetingManagement />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/registrations"
        element={
          <RequireAuth>
            <Registrations />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/export"
        element={
          <RequireAuth>
            <DataExport />
          </RequireAuth>
        }
      />
      {/* 👇 NEW: Per-event analytics page (expects ?code=XYZ) */}
      <Route
        path="/admin/analytics"
        element={
          <RequireAuth>
            <AdminEventAnalytics />
          </RequireAuth>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route
        path="/admin"
        element={<Navigate to="/admin/dashboard" replace />}
      />
      <Route path="*" element={<div style={{ padding: 24 }}>Not Found</div>} />
    </Routes>
  );
}
