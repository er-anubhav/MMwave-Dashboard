import { Link, useLocation } from "react-router-dom";
import { Home, MonitorSmartphone, Activity, Heart, Shield, Zap, Bell } from "lucide-react";

export default function Sidenav() {
 const location = useLocation();

 const links = [
 { name: "Overview", path: "/", icon: Home },
 { name: "Health & Sleep", path: "/health", icon: Heart },
 { name: "Security & Activity", path: "/security", icon: Shield },
 { name: "Automations", path: "/automations", icon: Zap },
 { name: "Notifications", path: "/notifications", icon: Bell },
 { name: "Devices", path: "/devices", icon: MonitorSmartphone },
 ];

 return (
 <aside className="fixed inset-y-0 rounded-xl left-0 z-40 w-64 my-4 ml-4 overflow-y-auto transition-transform bg-white xl:translate-x-0 hidden xl:flex flex-col border border-gray-200 shadow-sm">
 <div className="relative border-b border-gray-100 mb-2">
 <div className="flex items-center gap-3 py-8 px-8"> {/* Modified div class */}
 <Activity className="w-8 h-8 text-emerald-600" /> {/* Added Activity icon */}
 <h6 className="text-base text-black"> {/* Changed text-gray-900 to text-black, and text content */}
 MMWave Shield
 </h6>
 </div>
 </div>
 <div className="m-4 flex-1">
 <ul className="mb-4 flex flex-col gap-1.5">
 {links.map(({ name, path, icon: Icon }) => {
 const isActive = location.pathname === path;
 return (
 <li key={name}>
 <Link to={path}>
 <button
 className={`align-middle select-none text-center transition-all disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm py-3 rounded-lg w-full flex items-center gap-4 px-4 capitalize ${
 isActive
 ? "bg-emerald-50 text-emerald-700"
 : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
 }`}
 type="button"
 >
 <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
 <p className="text-sm capitalize">
 {name}
 </p>
 </button>
 </Link>
 </li>
 );
 })}
 </ul>
 </div>
 </aside>
 );
}
