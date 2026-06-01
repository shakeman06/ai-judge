import { NavLink, Outlet } from "react-router-dom";
import { UploadCloud, Gavel, ListChecks, BarChart3 } from "lucide-react";

const nav = [
  { to: "/", label: "Import", icon: UploadCloud, end: true },
  { to: "/judges", label: "Judges", icon: Gavel },
  { to: "/queues", label: "Queues", icon: ListChecks },
  { to: "/results", label: "Results", icon: BarChart3 },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-ink-700 flex flex-col py-6 px-3">
        {/* Logo */}
        <div>
          <p className="font-display font-bold text-ink-50 text-sm leading-none">AI Judge</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pt-4 border-t border-ink-700">
          <p className="text-[10px] font-mono text-ink-500">v1.0.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
