import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import PropertyDetails from "./pages/PropertyDetails";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AgencyDashboard from "./pages/AgencyDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import type { ReactNode } from "react";

// ── Role-guard: allowed only for the specified role names ────────────────────
function RoleRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles: string[];
}) {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  const roleName = user?.role?.name ?? "";
  if (!roles.includes(roleName)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/property/:id" element={<PropertyDetails />} />

      {/* User dashboard (role: user) */}
      <Route
        path="/dashboard"
        element={
          <RoleRoute roles={["user"]}>
            <Dashboard />
          </RoleRoute>
        }
      />

      {/* Agency dashboard (role: agency) */}
      <Route
        path="/agency"
        element={
          <RoleRoute roles={["agency"]}>
            <AgencyDashboard />
          </RoleRoute>
        }
      />

      {/* Developer dashboard (role: developer) */}
      <Route
        path="/developer"
        element={
          <RoleRoute roles={["developer"]}>
            <DeveloperDashboard />
          </RoleRoute>
        }
      />

      {/* Admin dashboard (role: admin | moderator) */}
      <Route
        path="/admin"
        element={
          <RoleRoute roles={["admin", "moderator"]}>
            <AdminDashboard />
          </RoleRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;