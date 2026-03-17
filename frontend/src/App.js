import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import HealthSleep from "./pages/HealthSleep";
import SecurityActivity from "./pages/SecurityActivity";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DeviceManagement from "./pages/DeviceManagement";
import Automations from "./pages/Automations";
import Notifications from "./pages/Notifications";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { DeviceProvider } from "./contexts/DeviceContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <DeviceProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/health"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <HealthSleep />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/automations"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Automations />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/security"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SecurityActivity />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/devices"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DeviceManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Notifications />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </DeviceProvider>
      </AuthProvider>
    </div>
  );
}

export default App;