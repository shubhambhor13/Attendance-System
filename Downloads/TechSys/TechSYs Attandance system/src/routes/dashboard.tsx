import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserCheck, UserX, Clock, TrendingUp, Calendar, X, Trash2, FileText, Loader2 } from "lucide-react";
import { storage, Employee, AttendanceRecord, Holiday } from "@/lib/storage";
import { emailService } from "@/lib/notifications";
import { toast } from "sonner";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Label, BarChart, Bar, XAxis, YAxis } from 'recharts';

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type RecRow = {
  id: string;
  employee_id: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  working_hours: number | null;
  employees: { name: string; department: string | null } | null;
};

function Dashboard() {
  const [activeUser, setActiveUser] = useState<any>(() => JSON.parse(localStorage.getItem("ts_active_user") || "null"));
  const [totalEmp, setTotalEmp] = useState(0);
  const [records, setRecords] = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "present" | "late" | "absent" | "holiday" | "sunday">("all");
  const [todayHoliday, setTodayHoliday] = useState<string | null>(null);
  const [isSunday, setIsSunday] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [hols, setHols] = useState<Holiday[]>([]);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) });
  const [broadcasting, setBroadcasting] = useState(false);

  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name.trim() || !holidayForm.date) {
      toast.error("Please enter a holiday reason and date");
      return;
    }
    setBroadcasting(true);
    try {
      storage.saveHoliday({ date: holidayForm.date, name: holidayForm.name.trim() });
      
      const emps = storage.getEmployees();
      let sentCount = 0;
      for (const emp of emps) {
        if (emp.email) {
          await emailService.sendHolidayNoticeEmail(emp, holidayForm.name.trim(), holidayForm.date);
          sentCount++;
        }
      }

      toast.success("Holiday broadcast completed!", {
        description: `Successfully added and sent holiday notifications to ${sentCount} employees.`,
      });
      setHolidayForm({ name: "", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) });
      setShowAddHoliday(false);
      loadHols();
      load();
    } catch (err) {
      toast.error("Failed to broadcast holiday");
    } finally {
      setBroadcasting(false);
    }
  };

  const load = () => {
    setLoading(true);
    const date = todayStr();
    
    const emps = storage.getEmployees();
    const recs = storage.getRecords(date);
    const holiday = storage.getHolidays().find(h => h.date === date);
    
    const dateObj = new Date(date);
    const sun = dateObj.getDay() === 0;
    
    setTodayHoliday(holiday?.name ?? null);
    setIsSunday(sun);
    
    const currentUser = JSON.parse(localStorage.getItem("ts_active_user") || "null");
    const isEmployee = currentUser?.role === "employee";
    
    const filteredEmps = isEmployee
      ? emps.filter(e => e.employee_id === currentUser.employee_id)
      : emps;
      
    setTotalEmp(filteredEmps.length);
    
    const recordMap = new Map(recs.map(r => [r.employee_id, r]));

    const merged: RecRow[] = filteredEmps.map(emp => {
      const rec = recordMap.get(emp.employee_id);
      
      let status = rec?.status || 'absent';
      if (sun) status = 'sunday';
      if (holiday) status = 'holiday';

      if (rec) {
        return {
          ...rec,
          status,
          employees: { name: emp.name, department: emp.department }
        } as RecRow;
      }
      return {
        id: `auto-${emp.employee_id}`,
        employee_id: emp.employee_id,
        check_in: null,
        check_out: null,
        status,
        working_hours: null,
        employees: { name: emp.name, department: emp.department }
      };
    });

    merged.sort((a, b) => {
      if (a.status === 'absent' && b.status !== 'absent') return 1;
      if (a.status !== 'absent' && b.status === 'absent') return -1;
      return 0;
    });

    setRecords(merged);
    setLoading(false);
  };

  const loadHols = () => {
    setHols(storage.getHolidays().sort((a, b) => a.date.localeCompare(b.date)));
  };

  useEffect(() => {
    setActiveUser(JSON.parse(localStorage.getItem("ts_active_user") || "null"));
    load();
    // Real-time sync removed as it depends on Supabase
  }, []);

  useEffect(() => {
    if (showHolidays) loadHols();
  }, [showHolidays]);

  const present = records.filter((r) => r.check_in).length;
  const onSite = records.filter((r) => r.check_in && !r.check_out).length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const holidayCount = todayHoliday ? 1 : 0;
  const sundayCount = isSunday ? 1 : 0;

  const stats = [
    { label: activeUser?.role === "employee" ? "My Attendance Today" : "Total Present", value: present, icon: UserCheck, color: "from-signal/20 to-signal/5", border: "border-signal/30", text: "text-signal" },
    { label: activeUser?.role === "employee" ? "My Absence Today" : "Total Absent", value: absent, icon: UserX, color: "from-destructive/20 to-destructive/5", border: "border-destructive/30", text: "text-destructive" },
    { label: "Holidays & Sundays", value: holidayCount + sundayCount, icon: Calendar, color: "from-command/20 to-command/5", border: "border-command/30", text: "text-command" },
    { label: activeUser?.role === "employee" ? "Am I Checked In?" : "On Site Now", value: onSite, icon: TrendingUp, color: "from-foreground/10 to-foreground/5", border: "border-border", text: "text-foreground" },
  ];

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-command">
              {activeUser?.role === "employee" ? `// Employee Workspace · ${activeUser.employee_id}` : "// Live Feed"}
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {activeUser?.role === "employee" ? "My Dashboard" : "Dashboard"}
            </h1>
            <div className="mt-1 font-mono-tech text-xs text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeUser?.role === "employee" ? (
              <div className="flex gap-2">
                <Link to="/mark" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--signal-green)] text-slate-950 rounded-md text-xs font-mono-tech uppercase tracking-widest font-bold hover:brightness-95 transition-all shadow-lg shadow-emerald-500/20">
                  Check-in Console
                </Link>
                <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-command text-white rounded-md text-xs font-mono-tech uppercase tracking-widest hover:brightness-95 transition-all shadow-lg shadow-command/20">
                  My Monthly Reports
                </Link>
              </div>
            ) : (
              <>
                <div className="flex gap-1.5 p-1 rounded-lg border border-border bg-card/50">
                  <button
                    onClick={() => {
                      const date = todayStr();
                      const holiday = storage.getHolidays().find(h => h.date === date);
                      const isSun = new Date(date).getDay() === 0;

                      if (holiday) {
                        toast.success(`Holiday: ${holiday.name}`, { 
                          description: "No absences marked for today." 
                        });
                        return;
                      }

                      if (isSun) {
                        const emps = storage.getEmployees();
                        const sentEmails = emailService.getSentEmails();
                        const todayPrefix = new Date().toISOString().slice(0, 10);
                        
                        let sentCount = 0;
                        emps.forEach(e => {
                          const alreadySent = sentEmails.some(mail => 
                            mail.employee_id === e.employee_id && 
                            mail.subject === "Weekend Notice" && 
                            mail.sent_at.startsWith(todayPrefix)
                          );
                          
                          if (!alreadySent) {
                            emailService.sendWeekendNoticeEmail(e).catch(console.error);
                            sentCount++;
                          }
                        });
                        
                        toast.success("Today is Sunday", { 
                          description: sentCount > 0 
                            ? `Weekend notice sent to ${sentCount} employees.` 
                            : "Weekend notice already sent for today."
                        });
                        return;
                      }

                      const emps = storage.getEmployees();
                      const recs = storage.getRecords(date);
                      const presentIds = new Set(recs.map(r => r.employee_id));
                      
                      const absentEmps = emps.filter(e => !presentIds.has(e.employee_id));
                      absentEmps.forEach(e => {
                        storage.saveRecord({
                          employee_id: e.employee_id,
                          date,
                          check_in: null,
                          check_out: null,
                          status: 'absent',
                          working_hours: null
                        });
                        emailService.sendAbsentEmail(e).catch(console.error);
                      });

                      toast.success("Absences marked", { description: `${absentEmps.length} employees marked as absent.` });
                      load();
                    }}
                    className="px-3 py-1 text-[9px] font-mono-tech uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                  >
                    Mark Absences
                  </button>
                  <div className="w-px h-4 bg-border self-center" />
                  <button
                    onClick={() => setShowHolidays(true)}
                    className="px-3 py-1 text-[9px] font-mono-tech uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                  >
                    Manage Holidays
                  </button>
                  <div className="w-px h-4 bg-border self-center" />
                  <button
                    onClick={() => setShowAddHoliday(true)}
                    className="px-3 py-1 text-[9px] font-mono-tech uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                  >
                    Broadcast Holiday
                  </button>
                  <div className="w-px h-4 bg-border self-center" />
                  <button
                    onClick={async () => {
                      const today = new Date();
                      const daysToSunday = (7 - today.getDay()) % 7;
                      const nextSunday = new Date();
                      nextSunday.setDate(today.getDate() + (daysToSunday === 0 ? 7 : daysToSunday));
                      const nextSundayStr = nextSunday.toISOString().slice(0, 10);

                      const emps = storage.getEmployees();
                      if (emps.length === 0) {
                        toast.error("No employees found to notify.");
                        return;
                      }

                      let sentCount = 0;
                      for (const emp of emps) {
                        const success = await emailService.sendSundayWeeklyOffEmail(emp, nextSundayStr);
                        if (success) sentCount++;
                      }
                    }}
                    className="px-3 py-1 text-[9px] font-mono-tech uppercase tracking-[0.2em] text-muted-foreground hover:text-[var(--signal-green)] hover:bg-secondary rounded transition-colors"
                  >
                    Broadcast Sunday Off
                  </button>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-glow" />
                  <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Realtime sync</span>
                </div>
                <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-command text-white rounded-md text-[10px] font-mono-tech uppercase tracking-widest hover:brightness-90 transition-all duration-300 shadow-lg shadow-command/20">
                  <FileText className="h-4 w-4" /> View Full Report
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => {
                if (s.label === "Total Absent") setFilter("absent");
                if (s.label === "Total Present") setFilter("present");
                if (s.label === "Holidays & Sundays") setFilter("holiday");
              }}
              className={`relative group cursor-pointer overflow-hidden rounded-2xl border ${s.border} bg-gradient-to-br ${s.color} p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:brightness-110 ${
                (s.label === "Total Absent" && filter === "absent") ||
                (s.label === "Total Present" && filter === "present") ||
                (s.label === "Holidays & Sundays" && filter === "holiday") ? "ring-2 ring-command ring-offset-2 ring-offset-background" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg bg-background/50 p-2 ${s.text}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">{s.label}</span>
              </div>
              <div className={`mt-4 text-3xl font-bold tracking-tight ${s.text}`}>{s.value}</div>
              <div className="absolute -bottom-2 -right-2 opacity-10 transition-transform group-hover:scale-110 group-hover:rotate-12">
                <s.icon className="h-20 w-20" />
              </div>
            </motion.div>
          ))}
        </div>


        {filter === "absent" && absent > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 mb-3 text-destructive">
              <UserX className="h-4 w-4" />
              <span className="font-mono-tech text-xs uppercase tracking-wider font-semibold">Absentees detected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {records.filter(r => r.status === 'absent').map(r => (
                <div key={r.employee_id} className="px-3 py-1.5 rounded bg-card border border-border text-xs flex flex-col">
                  <span className="font-medium">{r.employees?.name}</span>
                  <span className="font-mono-tech text-[10px] text-muted-foreground">{r.employee_id}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="mt-10 rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border p-5 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {todayHoliday ? `Today's Activity — ${todayHoliday}` : (isSunday ? "Today's Activity — Sunday" : "Today's Activity")}
            </h2>
            <div className="flex gap-2">
              {["all", "present", "late", "absent", "holiday", "sunday"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-2 py-1 rounded font-mono-tech text-[9px] uppercase tracking-wider transition-colors ${
                    filter === f ? "bg-command text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  {["Employee", "Department", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                    <th key={h} className="text-left font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-12 text-muted-foreground text-sm">Loading…</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-12 text-muted-foreground text-sm">No check-ins yet today.</td></tr>
                ) : (
                  records
                    .filter(r => filter === 'all' ? true : r.status === filter)
                    .map((r) => (
                    <tr 
                      key={r.id} 
                      className={`border-b border-border/40 transition-all duration-200 group hover:brightness-110 ${
                        r.status === "present" ? "bg-[var(--signal-green)]/5 hover:bg-[var(--signal-green)]/10" :
                        r.status === "late" ? "bg-[var(--signal-amber)]/5 hover:bg-[var(--signal-amber)]/10" :
                        r.status === "holiday" ? "bg-command/5 hover:bg-command/10" :
                        r.status === "sunday" ? "bg-sunday/5 hover:bg-sunday/10" :
                        r.status === "absent" ? "bg-destructive/5 hover:bg-destructive/10" :
                        "hover:bg-secondary/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{r.employees?.name ?? "—"}</div>
                        <div className="font-mono-tech text-[10px] text-muted-foreground">{r.employee_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.employees?.department ?? "—"}</td>
                      <td className="px-4 py-3 font-mono-tech text-xs">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : "—"}</td>
                      <td className="px-4 py-3 font-mono-tech text-xs">{r.check_out ? new Date(r.check_out).toLocaleTimeString() : "—"}</td>
                      <td className="px-4 py-3 font-mono-tech text-xs">{r.working_hours ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono-tech text-[10px] uppercase ${
                          r.status === "present" ? "bg-[var(--signal-green)]/15 text-signal" :
                          r.status === "late" ? "bg-[var(--signal-amber)]/15 text-[var(--signal-amber)]" :
                          r.status === "half-day" ? "bg-command/15 text-command" :
                          r.status === "short-shift" ? "bg-muted text-muted-foreground border border-border" :
                          r.status === "holiday" ? "bg-command/15 text-command" :
                          r.status === "sunday" ? "bg-sunday/15 text-sunday" :
                          r.status === "absent" ? "bg-destructive/15 text-destructive" :
                          "bg-muted text-muted-foreground"
                        }`} style={
                          r.status === "late" ? { color: "var(--signal-amber)", backgroundColor: "color-mix(in oklab, var(--signal-amber) 15%, transparent)" } : 
                          r.status === "absent" ? { color: "var(--destructive)", backgroundColor: "color-mix(in oklab, var(--destructive) 15%, transparent)" } :
                          r.status === "holiday" ? { color: "var(--command-blue)", backgroundColor: "color-mix(in oklab, var(--command-blue) 15%, transparent)" } :
                          r.status === "sunday" ? { color: "var(--sunday-purple)", backgroundColor: "color-mix(in oklab, var(--sunday-purple) 15%, transparent)" } :
                          undefined
                        }>
                          {r.status.replace('-', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showHolidays && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHolidays(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-lg p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-command" />
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Holiday Schedule</h2>
                </div>
                <button onClick={() => setShowHolidays(false)} className="rounded-full p-1 hover:bg-secondary transition-colors"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {hols.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm font-mono-tech uppercase tracking-wider border border-dashed border-border rounded-lg">No holidays defined</div>
                ) : (
                  hols.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border/60 group hover:border-command/40 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{h.name}</span>
                        <span className="font-mono-tech text-[10px] text-muted-foreground">{h.date}</span>
                      </div>
                      <button onClick={() => {
                        storage.deleteHoliday(h.id);
                        loadHols();
                        load();
                        toast.success("Holiday deleted");
                      }} className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showAddHoliday && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddHoliday(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-2xl relative"
            >
              <form onSubmit={handleHolidaySubmit}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-command" />
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Holiday Broadcaster</h2>
                  </div>
                  <button type="button" onClick={() => setShowAddHoliday(false)} className="rounded-full p-1 hover:bg-secondary transition-colors">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-1">Holiday Reason / Festival Name *</label>
                    <input
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      placeholder="e.g. Festival Celebration, Independence Day"
                      required
                      disabled={broadcasting}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-command"
                    />
                  </div>
                  
                  <div>
                    <label className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground block mb-1">Holiday Date *</label>
                    <input
                      type="date"
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                      required
                      disabled={broadcasting}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-command"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={broadcasting} 
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-md bg-command py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {broadcasting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span>Broadcasting Emails...</span>
                    </>
                  ) : (
                    <span>🚀 Broadcast Holiday Emails</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}