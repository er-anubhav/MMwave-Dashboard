import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import NavList, { DeviceStatusLine } from "./NavItems";
import { useAuth } from "../contexts/AuthContext";

export default function Sidenav() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sticky top-20 flex flex-col rounded-2xl border border-border bg-card p-2.5 shadow-surface">
      {/* Nav */}
      <nav className="flex-1 px-1 py-2">
        <NavList />
      </nav>

      {/* Live device state — derived from DeviceContext, hidden when unknown */}
      <div className="px-1 py-1.5">
        <DeviceStatusLine />
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border/70 px-1 pt-2.5">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
          type="button"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
