import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn, LogOut, CheckCircle2,
  Clock, ShieldCheck, RotateCcw, ArrowRight, UserCircle, Search, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { storage, Employee, AttendanceRecord } from "@/lib/storage";
import { emailService } from "@/lib/notifications";

export const Route = createFileRoute("/mark")({
  component: MarkPage,
});

type Step = "search" | "attendance";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function MarkPage() {
  const [now, setNow] = useState(new Date());

  // Search state
  const [step, setStep] = useState<Step>("search");
  const [searchId, setSearchId] = useState("");

  // Check-in state (unlocked after search)
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("ts_active_user") || "null");
    setActiveUser(user);
    if (user && user.role === "employee") {
      const emps = storage.getEmployees();
      const emp = emps.find(e => e.employee_id === user.employee_id);
      if (emp) {
        setEmployee(emp);
        const recs = storage.getRecords(todayStr());
        setRecord(recs.find(r => r.employee_id === emp.employee_id) ?? null);
        setStep("attendance");
      }
    }
  }, []);

  // ── Search Employee ───────────────────────────────────────────────────────
  const searchEmployee = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchId.trim()) return;
    
    const emps = storage.getEmployees();
    const emp = emps.find(e => e.employee_id.toLowerCase() === searchId.trim().toLowerCase());
    
    if (!emp) {
      toast.error("Employee Not Found", { description: `No employee matches the ID: ${searchId}` });
      return;
    }
    
    setEmployee(emp);
    const recs = storage.getRecords(todayStr());
    setRecord(recs.find(r => r.employee_id === emp.employee_id) ?? null);
    setStep("attendance");
    toast.success("Identity Verified ✓", {
      description: `Welcome, ${emp.name}. You may now mark your attendance.`,
    });
  };

  // ── Attendance actions ────────────────────────────────────────────────────
  const checkIn = () => {
    if (!employee) return;
    setLoading(true);
    const recs = storage.getRecords(todayStr());
    if (recs.find(r => r.employee_id === employee.employee_id)) {
      toast.error("Already Checked In", { description: "You have already checked in today." });
      setLoading(false);
      return;
    }
    const checkInTime = new Date();
    const status = checkInTime.getHours() >= 10 ? "late" : "present";
    const newRecord = storage.saveRecord({
      employee_id: employee.employee_id,
      date: todayStr(),
      check_in: checkInTime.toISOString(),
      check_out: null,
      status,
      working_hours: null,
    });
    setRecord(newRecord);
    toast.success(`Welcome, ${employee.name}`, {
      description: `Checked in at ${checkInTime.toLocaleTimeString()}`,
    });

    // Send check-in confirmation email
    emailService.sendCheckInEmail(employee).catch(console.error);

    setLoading(false);
  };

  const checkOut = () => {
    if (!employee || !record) return;
    setLoading(true);
    if (record.check_out) {
      toast.error("Already Checked Out", { description: "You have already checked out today." });
      setLoading(false);
      return;
    }
    const checkOutTime = new Date();
    const checkInTime = record.check_in ? new Date(record.check_in) : null;
    const hours = checkInTime
      ? Math.round(((checkOutTime.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100
      : null;
    const updatedStatus =
      hours === null ? record.status
      : hours >= 7.5 ? "present"
      : hours >= 4.5 ? "half-day"
      : "short-shift";
    const updated = storage.updateRecord(record.id, {
      check_out: checkOutTime.toISOString(),
      working_hours: hours,
      status: updatedStatus,
    });
    if (updated) {
      setRecord(updated);
      toast.success(`Goodbye, ${employee.name}`, { description: `Worked ${hours} hours` });
      if (record.check_in && updated.check_out) {
        emailService.sendCheckOutEmail(employee, record.check_in, updated.check_out, hours || 0, updatedStatus)
          .catch(console.error);
      }
    }
    setLoading(false);
  };

  // ── Reset to start over ───────────────────────────────────────────────────
  const reset = () => {
    if (activeUser?.role === "employee") {
      const recs = storage.getRecords(todayStr());
      setRecord(recs.find(r => r.employee_id === employee?.employee_id) ?? null);
      toast.success("Refreshed Console Status ✓");
      return;
    }
    setStep("search");
    setSearchId("");
    setEmployee(null);
    setRecord(null);
  };

  return (
    <main className="mx-auto max-w-xl px-4 sm:px-6 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-command">
          // Secure Terminal
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Check-in Console</h1>
        <div className="mt-2 font-mono-tech text-xs text-muted-foreground">
          {now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {now.toLocaleTimeString()}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Search Employee ─────────────────────────────────────── */}
        {step === "search" && (
          <motion.div
            key="search-step"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Card Header */}
              <div className="p-6 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-command/10 border border-command/20 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-command" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">Employee Verification</h2>
                    <p className="text-xs text-muted-foreground font-mono-tech mt-0.5">
                      Enter your Employee ID to access the check-in console
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={searchEmployee} className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground mb-2">
                    Employee ID
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={searchId}
                      onChange={e => setSearchId(e.target.value)}
                      placeholder="e.g. EMP001"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background font-mono-tech text-sm focus:outline-none focus:ring-2 focus:ring-command focus:border-command transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!searchId.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-command text-primary-foreground px-5 py-3 text-sm font-bold tracking-wide hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowRight className="h-4 w-4" /> Find Employee
                </button>
              </form>
            </div>

            {/* Info box */}
            <div className="mt-4 rounded-xl border border-border/60 bg-secondary/30 p-4 flex gap-3 items-start">
              <AlertCircle className="h-4 w-4 text-command mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground font-mono-tech leading-relaxed">
                Check-ins after 10:00 AM are flagged as <span className="text-amber-500">late</span>. Ensure your employee ID matches exactly as provided by HR.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Attendance Console ──────────────────────────────────── */}
        {step === "attendance" && employee && (
          <motion.div
            key="checkin-step"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Verified badge */}
            <div className="rounded-xl border border-[var(--signal-green)]/30 bg-[var(--signal-green)]/5 p-3 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--signal-green)] flex-shrink-0" />
              <p className="text-xs font-mono-tech text-[var(--signal-green)] font-bold">
                Identity verified · {employee.employee_id}
              </p>
              <button
                onClick={reset}
                className="ml-auto text-[10px] font-mono-tech text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> {activeUser?.role === "employee" ? "Refresh Sync" : "New Session"}
              </button>
            </div>

            {/* Employee Card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border p-6 flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-command">
                    {employee.employee_id}
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">{employee.name}</h2>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {employee.role} · {employee.department}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</div>
                  <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono-tech text-xs uppercase ${
                    record?.check_out ? "bg-muted text-muted-foreground"
                    : record?.check_in ? "bg-[var(--signal-green)]/15 text-[var(--signal-green)]"
                    : "bg-destructive/15 text-destructive"
                  }`}>
                    {record?.check_out ? "Completed" : record?.check_in ? "On Site" : "Not Checked In"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-border/60">
                <div className="bg-card p-4">
                  <div className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Check In</div>
                  <div className="mt-1 font-mono-tech text-lg">
                    {record?.check_in ? new Date(record.check_in).toLocaleTimeString() : "—"}
                  </div>
                </div>
                <div className="bg-card p-4">
                  <div className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Check Out</div>
                  <div className="mt-1 font-mono-tech text-lg">
                    {record?.check_out ? new Date(record.check_out).toLocaleTimeString() : "—"}
                  </div>
                </div>
              </div>

              {record?.check_in && record?.check_out && (
                <div className="mx-6 my-4 p-4 rounded-lg border border-[var(--signal-green)]/20 bg-[var(--signal-green)]/5 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[var(--signal-green)] mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold font-mono-tech text-foreground uppercase tracking-wider">Shift Completed</h4>
                    <p className="text-xs text-muted-foreground font-mono-tech mt-1 leading-relaxed">
                      Your attendance for today has been recorded. One shift per day is permitted.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-6 pt-2 flex gap-3">
                <button
                  onClick={checkIn}
                  disabled={loading || !!record?.check_in}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--signal-green)] text-slate-950 px-4 py-3 text-sm font-bold uppercase tracking-widest hover:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--signal-green)]/20"
                >
                  <LogIn className="h-4 w-4" /> Check In
                </button>
                <button
                  onClick={checkOut}
                  disabled={loading || !record?.check_in || !!record?.check_out}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-destructive text-white px-4 py-3 text-sm font-bold uppercase tracking-widest hover:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-destructive/20"
                >
                  <LogOut className="h-4 w-4" /> Check Out
                </button>
              </div>

              {record?.working_hours !== null && record?.working_hours !== undefined && (
                <div className="border-t border-border px-6 py-3 flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-command" />
                  <span className="font-mono-tech text-muted-foreground">Working Hours:</span>
                  <span className="font-mono-tech text-foreground font-bold">{record.working_hours}h</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}