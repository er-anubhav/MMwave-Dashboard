import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";

export default function DashboardNavbar({ isConnected }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Overview", path: "/" },
    { name: "Alerts", path: "/notifications" },
    { name: "Profile", path: "/profile" },
  ];

  const isPathActive = (itemPath) => {
    if (itemPath === "/") {
      return (
        location.pathname === "/" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/devices"
      );
    }
    return location.pathname === itemPath;
  };

  return (
    <div className="flex h-16 sm:h-20 items-center justify-between">
      {/* Header Left: BlareXSense brand */}
      <Link to="/" className="flex items-center gap-2 select-none">
        <span className="text-xl sm:text-2xl font-normal tracking-tight text-foreground">
          BlareXSense
        </span>
      </Link>

      {/* Header Right: Navbar */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const active = isPathActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3.5 py-2 rounded-lg text-sm sm:text-[15px] font-normal transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="hidden md:inline-flex text-xs sm:text-sm font-normal text-muted-foreground hover:text-destructive hover:bg-destructive-soft h-9 px-3"
        >
          Logout
        </Button>

        {/* Mobile Navigation (Right Sheet) */}
        <div className="md:hidden flex items-center">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Toggle navigation"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-5 flex flex-col">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-base font-normal tracking-tight text-foreground">
                    BlareXSense
                  </span>
                </div>

                {/* Mobile Navigation Links */}
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active = isPathActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSheetOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-normal transition-colors ${
                          active
                            ? "bg-primary text-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}

                  <div className="my-2 h-px bg-border/60" />

                  {/* Mobile Logout - placed directly below Alerts */}
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center justify-between px-3 py-2.5 rounded-md text-sm font-normal text-destructive hover:bg-destructive-soft transition-colors"
                  >
                    <span>Logout</span>
                    <LogOut size={16} />
                  </button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
