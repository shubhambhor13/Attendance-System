import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, Globe, ArrowRight, UserPlus, Key, Eye, EyeOff, CheckCircle2, AlertTriangle, KeyRound, RotateCcw, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── 6-cell OTP input ────────────────────────────────────────────────────────
function RegOtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handleChange = (i: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const arr = (value + "      ").slice(0, 6).split("");
    arr[i] = digit;
    const next = arr.join("").trimEnd();
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
    e.preventDefault();
  };
  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-10 h-12 text-center text-lg font-black font-mono-tech rounded-lg border-2 bg-background focus:outline-none focus:ring-2 focus:ring-command focus:border-command transition-all disabled:opacity-50 ${
            value[i] ? "border-command text-command" : "border-border text-foreground"
          }`}
        />
      ))}
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = React.useState(() => localStorage.getItem("ts_system_unlocked") === "true");
  const [activeTab, setActiveTab] = React.useState<"signin" | "register" | "employee">("signin");
  
  // Sign In state
  const [signInEmail, setSignInEmail] = React.useState("");
  const [signInPassword, setSignInPassword] = React.useState("");
  const [signInKey, setSignInKey] = React.useState("");
  const [showSignInPassword, setShowSignInPassword] = React.useState(false);
  
  // Register state
  const [regName, setRegName] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regKey, setRegKey] = React.useState("");
  const [showRegPassword, setShowRegPassword] = React.useState(false);
  // Multi-step registration
  type RegStep = "form" | "otp" | "key";
  const [regStep, setRegStep] = React.useState<RegStep>("form");
  const [regOtp, setRegOtp] = React.useState("");
  const [regCountdown, setRegCountdown] = React.useState(0);
  const regTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Employee state
  const [empEmail, setEmpEmail] = React.useState("");
  type EmpStep = "form" | "otp";
  const [empStep, setEmpStep] = React.useState<EmpStep>("form");
  const [empOtp, setEmpOtp] = React.useState("");
  const [empCountdown, setEmpCountdown] = React.useState(0);
  const empTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = React.useState(false);

  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    // Auto logout on landing page access to secure administrative console
    if (localStorage.getItem("ts_system_unlocked") === "true") {
      localStorage.removeItem("ts_system_unlocked");
      localStorage.removeItem("ts_active_user");
      window.dispatchEvent(new Event("ts_auth_changed"));
      setUnlocked(false);
      toast.info("Console Secured", {
        description: "Session closed automatically on landing portal access."
      });
    }

    const handleAuthChange = () => {
      setUnlocked(localStorage.getItem("ts_system_unlocked") === "true");
    };
    window.addEventListener("ts_auth_changed", handleAuthChange);

    const timer = setInterval(() => setTime(new Date()), 1000);

    return () => {
      window.removeEventListener("ts_auth_changed", handleAuthChange);
      clearInterval(timer);
    };
  }, []);

  const formattedDay = time.toLocaleDateString("en-US", { weekday: 'long' });
  const formattedDate = time.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = time.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword || !signInKey) {
      toast.error("Required fields missing", { description: "Please fill in all inputs." });
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Strictly enforce License Key
      if (signInKey.trim() !== "TechSys#1320") {
        toast.error("Enterprise Activation Error", {
          description: "License Key invalid. Free trials are deactivated."
        });
        setLoading(false);
        return;
      }

      // Check registered users
      const users = JSON.parse(localStorage.getItem("ts_users") || "[]");
      const user = users.find((u: any) => u.email.toLowerCase() === signInEmail.toLowerCase() && u.password === signInPassword);

      const isFallbackAdmin = signInEmail.toLowerCase() === "admin@techsys.com" && signInPassword === "admin123";

      if (user || isFallbackAdmin) {
        // Fetch full admin data to restore standard local storage state
        fetch(`${SERVER}/api/admin-data?tenantId=${encodeURIComponent(signInEmail.trim())}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              localStorage.setItem("ts_employees", JSON.stringify(data.employees || []));
              localStorage.setItem("ts_records", JSON.stringify(data.records || []));
              localStorage.setItem("ts_holidays", JSON.stringify(data.holidays || []));
              console.log("[Sync] Admin storage successfully hydrated from server.");
            }
          })
          .catch(err => console.error("[Sync] Admin hydration failed:", err))
          .finally(() => {
            localStorage.setItem("ts_system_unlocked", "true");
            localStorage.setItem("ts_active_user", JSON.stringify({ email: signInEmail, name: user?.name || "Administrator" }));
            window.dispatchEvent(new Event("ts_auth_changed"));
            toast.success("Identity Verified", {
              description: `Logged in successfully as ${user?.name || "Administrator"}`
            });
            navigate({ to: "/dashboard" });
            setLoading(false);
          });
      } else {
        toast.error("Verification Denied", {
          description: "Invalid administrator email or password."
        });
        setLoading(false);
      }
    }, 1000);
  };

  // Step 1: validate form → send OTP
  const handleSendRegOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      toast.error("Required fields missing", { description: "Please fill Company Name, Email and Password." });
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Password too short", { description: "Minimum 6 characters required." });
      return;
    }
    const users = JSON.parse(localStorage.getItem("ts_users") || "[]");
    if (users.some((u: any) => u.email.toLowerCase() === regEmail.toLowerCase())) {
      toast.error("Email already registered", { description: "This email is already an admin account." });
      return;
    }
    setLoading(true);
    toast.loading("Sending OTP...", { id: "otp-loading" });
    try {
      const res = await fetch(`${SERVER}/api/send-admin-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail.trim(), name: regName.trim() }),
      });
      const data = await res.json();
      toast.dismiss("otp-loading");
      if (!res.ok || !data.success) {
        toast.error("OTP Failed", { description: data.error || "Could not send verification email." });
        setLoading(false);
        return;
      }
      setRegStep("otp");
      setRegOtp("");
      setRegCountdown(300);
      if (regTimerRef.current) clearInterval(regTimerRef.current);
      regTimerRef.current = setInterval(() => setRegCountdown(p => { if (p <= 1) { clearInterval(regTimerRef.current!); return 0; } return p - 1; }), 1000);
      toast.success("OTP Sent Successfully!", { description: `Verification code sent to ${regEmail.trim()}` });
    } catch {
      toast.dismiss("otp-loading");
      toast.error("Server Unreachable", { description: "Make sure the backend server is running." });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP
  const handleVerifyRegOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (regOtp.length !== 6) { toast.error("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail.trim(), otp: regOtp }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Verification Failed", { description: data.error }); setRegOtp(""); return; }
      clearInterval(regTimerRef.current!);
      setRegStep("key");
      toast.success("Email Verified ✓", { description: "Now enter your Enterprise Access Key to complete registration." });
    } catch {
      toast.error("Server Unreachable");
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify when 6 digits entered
  React.useEffect(() => {
    if (regStep === "otp" && regOtp.length === 6) handleVerifyRegOtp();
  }, [regOtp]);

  // Step 3: validate key → create account → sign in
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regKey) { toast.error("Key required"); return; }
    setLoading(true);
    setTimeout(() => {
      if (regKey.trim() !== "TechSys#1320") {
        toast.error("Registration Blocked", { description: "Enterprise Access Key invalid." });
        setLoading(false);
        return;
      }
      const users = JSON.parse(localStorage.getItem("ts_users") || "[]");
      const newUser = { id: crypto.randomUUID(), name: regName, email: regEmail, password: regPassword };
      users.push(newUser);
      localStorage.setItem("ts_users", JSON.stringify(users));
      // Auto sign-in
      localStorage.setItem("ts_system_unlocked", "true");
      localStorage.setItem("ts_active_user", JSON.stringify({ email: regEmail, name: regName }));
      window.dispatchEvent(new Event("ts_auth_changed"));
      toast.success("Registration Complete!", { description: `Welcome, ${regName}. Console unlocked.` });
      navigate({ to: "/dashboard" });
      setLoading(false);
    }, 900);
  };

  const resetRegFlow = () => {
    setRegStep("form"); setRegOtp(""); setRegKey(""); setRegCountdown(0);
    if (regTimerRef.current) clearInterval(regTimerRef.current);
  };

  const resetEmpFlow = () => {
    setEmpStep("form"); setEmpOtp(""); setEmpCountdown(0);
    if (empTimerRef.current) clearInterval(empTimerRef.current);
  };

  const handleSendEmpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empEmail) {
      toast.error("Email required");
      return;
    }
    setLoading(true);
    toast.loading("Sending OTP...", { id: "otp-loading" });
    try {
      const res = await fetch(`${SERVER}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: empEmail.trim() }),
      });
      const data = await res.json();
      toast.dismiss("otp-loading");
      if (!res.ok || !data.success) {
        toast.error("OTP Failed", { description: data.error || "Could not send verification email." });
        setLoading(false);
        return;
      }
      setEmpStep("otp");
      setEmpOtp("");
      setEmpCountdown(300);
      if (empTimerRef.current) clearInterval(empTimerRef.current);
      empTimerRef.current = setInterval(() => setEmpCountdown(p => { if (p <= 1) { clearInterval(empTimerRef.current!); return 0; } return p - 1; }), 1000);
      toast.success("OTP Sent Successfully!", { description: `Verification code sent to ${empEmail.trim()}` });
    } catch {
      toast.dismiss("otp-loading");
      toast.error("Server Unreachable", { description: "Make sure the backend server is running." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmpOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (empOtp.length !== 6) { toast.error("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: empEmail.trim(), otp: empOtp }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Verification Failed", { description: data.error }); setEmpOtp(""); return; }
      clearInterval(empTimerRef.current!);
      
      // Fetch employee-specific data to enforce absolute data isolation
      try {
        const dataRes = await fetch(`${SERVER}/api/employee-data?email=${encodeURIComponent(empEmail.trim())}`);
        if (dataRes.ok) {
          const empData = await dataRes.json();
          // Restrict local storage to ONLY contain the logged-in employee's data
          localStorage.setItem("ts_employees", JSON.stringify([empData.employee]));
          localStorage.setItem("ts_records", JSON.stringify(empData.records || []));
          localStorage.setItem("ts_holidays", JSON.stringify(empData.holidays || []));
          console.log("[Sync] Employee storage restricted and loaded from server.");
        }
      } catch (syncErr) {
        console.error("[Sync] Employee specific sync failed:", syncErr);
      }

      // Successfully authenticated as employee!
      localStorage.setItem("ts_system_unlocked", "true");
      localStorage.setItem("ts_active_user", JSON.stringify({ 
        email: empEmail.trim(), 
        name: data.employeeName, 
        role: "employee", 
        employee_id: data.employeeId 
      }));
      window.dispatchEvent(new Event("ts_auth_changed"));
      toast.success("Welcome!", { description: `Logged in successfully as ${data.employeeName}` });
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Server Unreachable");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "employee" && empStep === "otp" && empOtp.length === 6) handleVerifyEmpOtp();
  }, [empOtp]);

  React.useEffect(() => {
    return () => {
      if (empTimerRef.current) clearInterval(empTimerRef.current);
    };
  }, []);

  const fmtCountdown = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleLock = () => {
    localStorage.removeItem("ts_system_unlocked");
    localStorage.removeItem("ts_active_user");
    window.dispatchEvent(new Event("ts_auth_changed"));
    toast.info("Console Locked", {
      description: "Secure session terminated."
    });
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden bg-background">
      {/* Background Decorative Gradients and Tech Patterns */}
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-command/5 blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-command/5 blur-[150px] pointer-events-none" />

      {/* Main Grid Layout */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex-1 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 w-full">
        
        {/* LEFT PANEL: Enterprise Branding & Tech Info */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 text-left max-w-xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3.5 py-1 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-green)] animate-pulse" />
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Digital Attendance System v4.2
            </span>
          </div>

          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden group hover:border-command/40 transition-colors">
            <img src="/assets/logo.png" alt="TechSys Corporate Logo" className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Digital <span className="text-command">Attendance</span> System Console.
          </h1>

          <p className="mt-6 text-base text-muted-foreground leading-relaxed">
            The professional grade operations platform engineered for zero-friction workforce tracking. 
            Designed strictly for enterprise environments with cryptographic access keys. 
            Free tier options are locked; input your system activation license to authenticate.
          </p>

          {/* Quick Contact Branding Info */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/60 pt-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/80 bg-card/60">
                <Phone className="h-4 w-4 text-command" />
              </div>
              <div>
                <div className="text-[9px] font-mono-tech uppercase tracking-widest text-muted-foreground">Support Lines</div>
                <div className="text-xs font-semibold font-mono-tech text-foreground">+91 8329893778</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/80 bg-card/60">
                <Mail className="h-4 w-4 text-command" />
              </div>
              <div>
                <div className="text-[9px] font-mono-tech uppercase tracking-widest text-muted-foreground">Communications</div>
                <a href="mailto:info@techsysservices.com" className="text-xs font-semibold font-mono-tech text-foreground hover:text-command transition-colors">
                  info@techsysservices.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg border border-border/80 bg-card/60">
                <Globe className="h-4 w-4 text-command" />
              </div>
              <div>
                <div className="text-[9px] font-mono-tech uppercase tracking-widest text-muted-foreground">Corporate Site</div>
                <a href="https://www.techsysservices.com" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold font-mono-tech text-foreground hover:text-command transition-colors">
                  www.techsysservices.com
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT PANEL: Sign In / Register Card OR Welcome back */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-[460px] shrink-0 flex flex-col gap-6"
        >
          {/* Large Dynamic Watch Component */}
          <div className="p-6 rounded-2xl border border-command/20 bg-command/5 backdrop-blur-md shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />
            <div className="flex justify-between items-center gap-4">
              <div>
                <span className="font-mono-tech text-[9px] uppercase tracking-[0.25em] text-command font-bold block mb-1">
                  // Real-Time System Clock
                </span>
                <div className="text-3xl font-black font-mono-tech text-foreground tracking-widest leading-none drop-shadow-[0_0_20px_rgba(59,130,246,0.35)] select-none">
                  {formattedTime}
                </div>
              </div>
              <div className="text-right border-l border-border/60 pl-4">
                <span className="font-mono-tech text-[9px] uppercase tracking-[0.2em] text-command font-bold block">
                  {formattedDay}
                </span>
                <span className="font-mono-tech text-[10px] font-bold text-muted-foreground tracking-wider block mt-1 uppercase">
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {unlocked ? (
              // WELCOME ACTIVE SESSION CARD
              <motion.div
                key="active-session"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-8 rounded-2xl border border-[var(--signal-green)]/20 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-32 w-32 bg-[var(--signal-green)]/5 rounded-full blur-2xl" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--signal-green)]/15 border border-[var(--signal-green)]/35 text-[var(--signal-green)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono-tech uppercase tracking-wider text-muted-foreground">Session Status</h3>
                    <p className="text-base font-semibold text-[var(--signal-green)] font-mono-tech">Securely Authenticated</p>
                  </div>
                </div>

                <div className="p-5 rounded-lg border border-border bg-card/80 mb-6">
                  <span className="font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">Active Profile</span>
                  <p className="text-lg font-bold mt-1 text-foreground">TechSys Administrator</p>
                  <p className="text-xs font-mono-tech text-muted-foreground mt-0.5">Key Level: Enterprise License Active</p>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    to="/dashboard"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 terminal-glow transition-all"
                  >
                    Enter Control Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/mark"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border bg-secondary/50 px-5 py-3 text-sm font-bold text-foreground hover:bg-secondary transition-colors"
                  >
                    Open Check-In Console
                  </Link>

                  <button
                    onClick={handleLock}
                    className="mt-2 text-xs font-mono-tech text-destructive hover:underline"
                  >
                    Disconnect & Lock Console
                  </button>
                </div>
              </motion.div>
            ) : (
              // DYNAMIC SIGN IN / REGISTER FORM CARD
              <motion.div
                key="form-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative rounded-2xl border border-border bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden"
              >
                {/* Tabs */}
                <div className="flex border-b border-border bg-card/60">
                  <button
                    onClick={() => { setActiveTab("signin"); resetEmpFlow(); }}
                    className={`flex-1 py-4 text-[9px] font-bold font-mono-tech uppercase tracking-widest border-r border-border transition-colors ${
                      activeTab === "signin" 
                        ? "text-command bg-transparent border-b-2 border-b-command" 
                        : "text-muted-foreground hover:text-foreground bg-secondary/20"
                    }`}
                  >
                    Admin Portal
                  </button>
                  <button
                    onClick={() => { setActiveTab("register"); resetEmpFlow(); }}
                    className={`flex-1 py-4 text-[9px] font-bold font-mono-tech uppercase tracking-widest transition-colors ${
                      activeTab === "register" 
                        ? "text-command bg-transparent border-b-2 border-b-command" 
                        : "text-muted-foreground hover:text-foreground bg-secondary/20"
                    }`}
                  >
                    Register Admin
                  </button>
                </div>

                {/* Form Container */}
                <div className="p-8">
                  {activeTab === "signin" && (
                    // SIGN IN FORM
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="text-center mb-6">
                        <h2 className="text-xl font-bold tracking-tight">Enterprise Credentials</h2>
                        <p className="text-xs text-muted-foreground mt-1">Authenticate to unlock full attendance system access.</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground mb-1.5">
                          Admin Email
                        </label>
                        <input
                          type="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="admin@techsys.com"
                          className="w-full rounded-md border border-border bg-background/80 px-3 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground mb-1.5">
                          Admin Password
                        </label>
                        <div className="relative">
                          <input
                            type={showSignInPassword ? "text" : "password"}
                            required
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-md border border-border bg-background/80 pl-3 pr-10 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignInPassword(!showSignInPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* ENTERPRISE ACCESS KEY FIELD (CRITICAL) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-command font-bold">
                            Enterprise Access Key
                          </label>
                          <span className="text-[9px] font-mono-tech uppercase text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> No Free Tier
                          </span>
                        </div>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-command/60" />
                          <input
                            type="text"
                            required
                            value={signInKey}
                            onChange={(e) => setSignInKey(e.target.value)}
                            placeholder="Enter Key TechSys#..."
                            className="w-full rounded-md border border-command/30 bg-command/5 pl-10 pr-3 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command text-command placeholder-command/40 font-bold tracking-widest transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 mt-6 cursor-pointer"
                      >
                        {loading ? "Decrypting Protocol..." : "Access Console"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </form>
                  )}

                  {activeTab === "register" && (
                    // ── MULTI-STEP REGISTER FLOW ──────────────────────────
                    <AnimatePresence mode="wait">

                      {/* STEP 1: Details Form */}
                      {regStep === "form" && (
                        <motion.form key="reg-form" onSubmit={handleSendRegOtp} className="space-y-4"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                          <div className="text-center mb-6">
                            <h2 className="text-xl font-bold tracking-tight">Register Administrator</h2>
                            <p className="text-xs text-muted-foreground mt-1">Step 1 of 3 · Fill details to receive OTP</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground mb-1.5">Company Name</label>
                            <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} placeholder="TechSys Services"
                              className="w-full rounded-md border border-border bg-background/80 px-3 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground mb-1.5">Email</label>
                            <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="admin@techsysservices.com"
                              className="w-full rounded-md border border-border bg-background/80 px-3 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
                            <div className="relative">
                              <input type={showRegPassword ? "text" : "password"} required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimum 6 characters"
                                className="w-full rounded-md border border-border bg-background/80 pl-3 pr-10 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command transition-all" />
                              <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <button type="submit" disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 mt-2 cursor-pointer">
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</> : <><Mail className="h-4 w-4" /> Send OTP to Email</>}
                          </button>
                        </motion.form>
                      )}

                      {/* STEP 2: OTP Verification */}
                      {regStep === "otp" && (
                        <motion.form key="reg-otp" onSubmit={handleVerifyRegOtp} className="space-y-5"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                          <div className="text-center mb-2">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-command/10 border border-command/20 mb-3">
                              <KeyRound className="h-6 w-6 text-command" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Verify Your Email</h2>
                            <p className="text-xs text-muted-foreground mt-1">Step 2 of 3 · Code sent to <span className="text-command font-bold">{regEmail}</span></p>
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">6-Digit Code</span>
                            <span className={`font-mono-tech text-xs font-bold px-2.5 py-1 rounded-lg ${
                              regCountdown < 60 ? "bg-destructive/10 text-destructive" : "bg-command/10 text-command"
                            }`}>{fmtCountdown(regCountdown)}</span>
                          </div>
                          <RegOtpInput value={regOtp} onChange={setRegOtp} disabled={loading} />
                          <button type="submit" disabled={loading || regOtp.length !== 6}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer">
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="h-4 w-4" /> Verify OTP</>}
                          </button>
                          <div className="flex items-center justify-between pt-1">
                            <button type="button" onClick={resetRegFlow}
                              className="text-xs text-muted-foreground hover:text-foreground font-mono-tech transition-colors">← Change Details</button>
                            <button type="button" disabled={loading} onClick={() => { setRegOtp(""); handleSendRegOtp(new Event("submit") as any); }}
                              className="text-xs text-command hover:opacity-75 font-mono-tech flex items-center gap-1 transition-colors disabled:opacity-40">
                              <RotateCcw className="h-3 w-3" /> Resend OTP
                            </button>
                          </div>
                          {regCountdown === 0 && (
                            <p className="text-[10px] font-mono-tech text-destructive text-center">OTP expired — click Resend OTP to get a new code.</p>
                          )}
                        </motion.form>
                      )}

                      {/* STEP 3: Enterprise Key */}
                      {regStep === "key" && (
                        <motion.form key="reg-key" onSubmit={handleRegister} className="space-y-5"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                          <div className="text-center mb-2">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--signal-green)]/10 border border-[var(--signal-green)]/25 mb-3">
                              <CheckCircle2 className="h-6 w-6 text-[var(--signal-green)]" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Almost There!</h2>
                            <p className="text-xs text-muted-foreground mt-1">Step 3 of 3 · Enter your Enterprise Access Key</p>
                          </div>
                          <div className="p-3 rounded-lg bg-[var(--signal-green)]/5 border border-[var(--signal-green)]/20 text-center">
                            <p className="text-xs font-mono-tech text-[var(--signal-green)] font-bold">✓ Email verified: {regEmail}</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-command font-bold">Enterprise Access Key</label>
                              <span className="text-[9px] font-mono-tech uppercase text-amber-500 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Required
                              </span>
                            </div>
                            <div className="relative">
                              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-command/60" />
                              <input type="text" required value={regKey} onChange={e => setRegKey(e.target.value)} placeholder="Enter Key TechSys#..."
                                className="w-full rounded-md border border-command/30 bg-command/5 pl-10 pr-3 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command text-command placeholder-command/40 font-bold tracking-widest transition-all" />
                            </div>
                          </div>
                          <button type="submit" disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer">
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating Account...</> : <><UserPlus className="h-4 w-4" /> Activate & Register</>}
                          </button>
                        </motion.form>
                      )}

                    </AnimatePresence>
                  )}

                  {activeTab === "employee" && (
                    // ── EMPLOYEE LOGIN FLOW ──────────────────────────
                    <AnimatePresence mode="wait">
                      {empStep === "form" && (
                        <motion.form key="emp-form" onSubmit={handleSendEmpOtp} className="space-y-4"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                          <div className="text-center mb-6">
                            <h2 className="text-xl font-bold tracking-tight">Employee Access Portal</h2>
                            <p className="text-xs text-muted-foreground mt-1">Enter your registered email to receive your secure login OTP.</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground mb-1.5">Employee Email</label>
                            <input type="email" required value={empEmail} onChange={e => setEmpEmail(e.target.value)} placeholder="employee@techsys.com"
                              className="w-full rounded-md border border-border bg-background/80 px-3 py-2.5 font-mono-tech text-sm focus:outline-none focus:ring-1 focus:ring-command focus:border-command transition-all" />
                          </div>
                          <button type="submit" disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 mt-4 cursor-pointer">
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying Email...</> : <><Mail className="h-4 w-4" /> Send OTP to Email</>}
                          </button>
                        </motion.form>
                      )}

                      {empStep === "otp" && (
                        <motion.form key="emp-otp" onSubmit={handleVerifyEmpOtp} className="space-y-5"
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                          <div className="text-center mb-2">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-command/10 border border-command/20 mb-3">
                              <KeyRound className="h-6 w-6 text-command" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">Verify Your Email</h2>
                            <p className="text-xs text-muted-foreground mt-1">OTP sent to <span className="text-command font-bold">{empEmail}</span></p>
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">6-Digit Code</span>
                            <span className={`font-mono-tech text-xs font-bold px-2.5 py-1 rounded-lg ${
                              empCountdown < 60 ? "bg-destructive/10 text-destructive" : "bg-command/10 text-command"
                            }`}>{fmtCountdown(empCountdown)}</span>
                          </div>
                          <RegOtpInput value={empOtp} onChange={setEmpOtp} disabled={loading} />
                          <button type="submit" disabled={loading || empOtp.length !== 6}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-command px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer">
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="h-4 w-4" /> Verify OTP</>}
                          </button>
                          <div className="flex items-center justify-between pt-1">
                            <button type="button" onClick={resetEmpFlow}
                              className="text-xs text-muted-foreground hover:text-foreground font-mono-tech transition-colors">← Change Details</button>
                            <button type="button" disabled={loading} onClick={() => { setEmpOtp(""); handleSendEmpOtp(new Event("submit") as any); }}
                              className="text-xs text-command hover:opacity-75 font-mono-tech flex items-center gap-1 transition-colors disabled:opacity-40">
                              <RotateCcw className="h-3 w-3" /> Resend OTP
                            </button>
                          </div>
                          {empCountdown === 0 && (
                            <p className="text-[10px] font-mono-tech text-destructive text-center">OTP expired — click Resend OTP to get a new code.</p>
                          )}
                        </motion.form>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>

      {/* FOOTER SECTION: Premium details only, no unnecessary lists */}
      <footer className="relative z-10 border-t border-border/40 py-8 bg-card/10 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src="/assets/techsys-logo.png" alt="TechSys Logo" className="h-7 w-7 object-contain" />
              <div>
                <div className="font-mono-tech text-[11px] font-bold tracking-tight text-foreground">TechSys Services</div>
                <div className="font-mono-tech text-[9px] text-muted-foreground tracking-widest">enterprise attendance os protocol</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
              <a href="tel:+918329893778" className="font-mono-tech text-[10px] tracking-[0.2em] text-muted-foreground hover:text-command transition-colors flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> +91 8329893778
              </a>
              <a href="mailto:info@techsysservices.com" className="font-mono-tech text-[10px] tracking-[0.2em] text-muted-foreground hover:text-command transition-colors flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> info@techsysservices.com
              </a>
              <a href="https://www.techsysservices.com" target="_blank" rel="noopener noreferrer" className="font-mono-tech text-[10px] tracking-[0.2em] text-muted-foreground hover:text-command transition-colors flex items-center gap-1.5">
                <Globe className="h-3 w-3" /> www.techsysservices.com
              </a>
              <span className="font-mono-tech text-[10px] tracking-[0.2em] text-muted-foreground/30">
                © 2026 TechSys Services
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
