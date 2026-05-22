import * as React from "react";
import { useEffect, useState } from "react";
import { Outlet, Link, createRootRoute, useRouterState } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { ShieldAlert, Key, Phone, Mail, Globe, ArrowRight } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Digital Attendance System" },
      { name: "description", content: "Digital Attendance System — Enterprise Edition" },
      { name: "author", content: "TechSys Services" },
      { property: "og:title", content: "Digital Attendance System" },
      { property: "og:description", content: "Reliable, high-performance attendance tracking for the modern enterprise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon.png",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

import { Header } from "@/components/Header";

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("ts_system_unlocked") === "true");
  const [unlockKey, setUnlockKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setUnlocked(localStorage.getItem("ts_system_unlocked") === "true");
    };
    window.addEventListener("ts_auth_changed", handleAuthChange);
    return () => window.removeEventListener("ts_auth_changed", handleAuthChange);
  }, []);

  const handleQuickUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockKey) return;
    setLoading(true);

    setTimeout(() => {
      if (unlockKey.trim() === "TechSys#1320") {
        localStorage.setItem("ts_system_unlocked", "true");
        window.dispatchEvent(new Event("ts_auth_changed"));
        toast.success("System Console Unlocked", {
          description: "Enterprise license successfully verified."
        });
        setUnlockKey("");
      } else {
        toast.error("Decryption Failed", {
          description: "Invalid Enterprise Activation Key. Free license method is locked."
        });
      }
      setLoading(false);
    }, 800);
  };

  const isLandingPage = pathname === "/";
  const shouldBlock = !unlocked && !isLandingPage;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {shouldBlock ? (
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="relative p-8 rounded-2xl border border-destructive/20 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-up">
            <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />
            
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-6 animate-pulse">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground">Console Restricted</h1>
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              This terminal is locked under standard security protocol. Full administrative check-in or access key is required to decrypt this ledger.
            </p>

            <form onSubmit={handleQuickUnlock} className="mt-8 space-y-4">
              <div>
                <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-command font-bold text-left mb-1.5">
                  Enterprise Access Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-command/60" />
                  <input
                    type="text"
                    required
                    value={unlockKey}
                    onChange={(e) => setUnlockKey(e.target.value)}
                    placeholder="Enter Key TechSys#..."
                    className="w-full rounded-md border border-command/30 bg-command/5 pl-10 pr-3 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command text-command placeholder-command/40 font-bold tracking-widest transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !unlockKey}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Decrypting Protocol..." : "Unlock Terminal"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/40 flex justify-center">
              <Link
                to="/"
                className="text-xs font-mono-tech text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Return to Landing Portal
              </Link>
            </div>
          </div>

          {/* Quick Contact info on Restricted Screen */}
          <div className="mt-8 p-4 rounded-xl border border-border bg-card/40 backdrop-blur-md flex flex-col gap-2.5 text-left text-xs font-mono-tech text-muted-foreground">
            <div className="text-[10px] font-bold text-foreground tracking-widest border-b border-border/60 pb-1.5 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-command" /> TechSys Corporate Office
            </div>
            <div className="flex justify-between">
              <span>Support Line:</span>
              <span className="text-foreground font-bold">+91 8329893778</span>
            </div>
            <div className="flex justify-between">
              <span>Email Portal:</span>
              <a href="mailto:info@techsysservices.com" className="text-foreground font-bold hover:text-command transition-colors">info@techsysservices.com</a>
            </div>
            <div className="flex justify-between">
              <span>Official Site:</span>
              <a href="https://www.techsysservices.com" target="_blank" rel="noopener noreferrer" className="text-foreground font-bold hover:text-command transition-colors">www.techsysservices.com</a>
            </div>
          </div>
        </main>
      ) : (
        <Outlet />
      )}
      
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
