import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DeviceManagement from "./pages/DeviceManagement";
import DeviceDetail from "./pages/DeviceDetail";
import DeviceAutomationsPage from "./pages/DeviceAutomationsPage";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { DeviceProvider } from "./contexts/DeviceContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import InstallPrompt from "./components/InstallPrompt";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <DeviceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/devices" element={<DeviceManagement isDashboard={false} />} />
              <Route path="/devices/:deviceId" element={<DeviceDetail />} />
              <Route path="/devices/:deviceId/automations" element={<DeviceAutomationsPage />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <InstallPrompt />
        <Toaster position="bottom-right" />
      </DeviceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;