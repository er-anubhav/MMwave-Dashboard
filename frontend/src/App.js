import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HealthSleep from "./pages/HealthSleep";
import SecurityActivity from "./pages/SecurityActivity";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import DeviceManagement from "./pages/DeviceManagement";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { DeviceProvider } from "./contexts/DeviceContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";

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
              <Route path="/health" element={<HealthSleep />} />
              <Route path="/security" element={<SecurityActivity />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/devices" element={<DeviceManagement />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </DeviceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;