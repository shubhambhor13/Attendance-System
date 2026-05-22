import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const navItems = [
  { to: "/mark", label: "Mark Attendance" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/employees", label: "Employees", adminOnly: true },
  { to: "/reports", label: "Reports" },
  { to: "/logs", label: "Logs", adminOnly: true },
  { to: "/employee-calendar", label: "Calendar" },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("ts_system_unlocked") === "true");
  const [activeUser, setActiveUser] = useState<any>(() => JSON.parse(localStorage.getItem("ts_active_user") || "null"));
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const handleAuthChange = () => {
      setUnlocked(localStorage.getItem("ts_system_unlocked") === "true");
      setActiveUser(JSON.parse(localStorage.getItem("ts_active_user") || "null"));
    };
    window.addEventListener("ts_auth_changed", handleAuthChange);
    
    // Live clock timer interval
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      window.removeEventListener("ts_auth_changed", handleAuthChange);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!unlocked) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.removeItem("ts_system_unlocked");
        localStorage.removeItem("ts_active_user");
        window.dispatchEvent(new Event("ts_auth_changed"));
        window.location.href = "/";
      }, 5 * 60 * 1000); // 5 minutes of inactivity
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(name => window.addEventListener(name, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(name => window.removeEventListener(name, resetTimer));
    };
  }, [unlocked]);

  const formattedDay = time.toLocaleDateString("en-US", { weekday: 'long' });
  const formattedDate = time.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = time.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && activeUser?.role === "employee") return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-md overflow-hidden">
            <img src="/assets/logo.png" alt="TechSys Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-mono-tech text-[10px] tracking-[0.2em] text-muted-foreground">Digital</span>
            <span className="text-sm font-semibold tracking-tight">Attendance System</span>
          </div>
        </Link>

        {unlocked && (
          <nav className="hidden md:flex items-center gap-1">
            {filteredNavItems.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 text-xs font-mono-tech uppercase tracking-wider rounded transition-colors ${
                    active
                      ? "bg-command/15 text-command"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Live Clock Component */}
        <div className="flex items-center gap-3">
          <div className="font-mono-tech text-right border-l border-border/60 pl-4">
            <div className="text-xs font-bold text-command tracking-wider">
              {formattedTime}
            </div>
            <div className="text-[9px] text-muted-foreground tracking-widest uppercase mt-0.5">
              {formattedDay} • {formattedDate}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}