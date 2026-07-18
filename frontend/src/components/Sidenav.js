import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Shield, Bell, Terminal, Settings, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

import { useDevice } from "../contexts/DeviceContext";

export default function Sidenav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { selectedDevice } = useDevice();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isStd = selectedDevice?.device_id?.toUpperCase().startsWith("STD");

  const mainLinks = [
    { name: "Overview", path: "/", icon: Home },
    { name: "Alerts", path: "/notifications", icon: Bell },
    ...(!isStd ? [{ name: "Health & Sleep", path: "/health", icon: Heart }] : []),
    { name: "Security & Activity", path: "/security", icon: Shield },
  ];

  const bottomLinks = [
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Raw Data", path: "/raw-data", icon: Terminal },
  ];

  return (
    <aside className="fixed inset-y-0 rounded-none left-0 z-40 w-64 my-4 ml-4 overflow-y-auto transition-transform glass-card lg:translate-x-0 hidden lg:flex flex-col shadow-lg">
      <div className="relative border-b border-gray-200/50 dark:border-border mb-2">
        <div className="flex items-center gap-3 py-6 px-8">
          <span className="text-xl text-black dark:text-primary tracking-wider">
            LYFSense
          </span>
        </div>
      </div>
      <div className="m-4 flex-1 flex flex-col justify-between">
        <ul className="flex flex-col gap-1.5">
          {mainLinks.map(({ name, path, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <li key={name} className="relative">
                <Link to={path}>
                  <button
                    className={`relative select-none text-left transition-colors text-sm py-3 rounded-none w-full flex items-center gap-4 px-4 capitalize z-10 ${
                      isActive
                        ? "text-emerald-700 dark:text-emerald-400 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-primary"
                    }`}
                    type="button"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 bg-emerald-50 dark:bg-emerald-950/20 border-l-[3px] border-emerald-500 rounded-none -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span>{name}</span>
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>

        <ul className="mb-4 flex flex-col gap-1.5">
          {bottomLinks.map(({ name, path, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <li key={name} className="relative">
                <Link to={path}>
                  <button
                    className={`relative select-none text-left transition-colors text-sm py-3 rounded-none w-full flex items-center gap-4 px-4 capitalize z-10 ${
                      isActive
                        ? "text-emerald-700 dark:text-emerald-400 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-primary"
                    }`}
                    type="button"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 bg-emerald-50 dark:bg-emerald-950/20 border-l-[3px] border-emerald-500 rounded-none -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span>{name}</span>
                  </button>
                </Link>
              </li>
            );
          })}
          <li className="relative">
            <button
              onClick={handleLogout}
              className="relative select-none text-left transition-colors text-sm py-3 rounded-none w-full flex items-center gap-4 px-4 capitalize z-10 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10"
              type="button"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
