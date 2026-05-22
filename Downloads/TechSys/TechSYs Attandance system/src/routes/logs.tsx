import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { List, Calendar, ChevronLeft, ChevronRight, Filter, Search, Mail, Send, Trash } from "lucide-react";
import { storage } from "@/lib/storage";
import { emailService, SentEmail } from "@/lib/notifications";

export const Route = createFileRoute("/logs")({
  component: AttendanceLogs,
});

function AttendanceLogs() {
  const [activeUser, setActiveUser] = useState<any>(() => JSON.parse(localStorage.getItem("ts_active_user") || "null"));
  const [date, setDate] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const load = () => {
    setLoading(true);
    
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    
    const employees = storage.getEmployees();
    const records = storage.getRecords();
    const holidays = storage.getHolidays();
    const holidayMap = new Map(holidays.filter(h => h.date >= startDate && h.date <= endDate).map(h => [h.date, h.name]));
    
    const recordMap = new Map();
    records.filter(r => r.date >= startDate && r.date <= endDate)
           .forEach(r => recordMap.set(`${r.employee_id}_${r.date}`, r));

    const result: any[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const softwareStartDate = "2026-05-01";
    
    for (let d = daysInMonth; d >= 1; d--) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = dateObj.toISOString().slice(0, 10);
      
      // Skip future dates and dates before software start
      if (dateStr > todayStr || dateStr < softwareStartDate) continue;

      const dayOfWeek = dateObj.getDay();
      const holidayName = holidayMap.get(dateStr);
      
      for (const emp of employees) {
        const rec = recordMap.get(`${emp.employee_id}_${dateStr}`);
        
        // If there's no record and it's a Sunday or Holiday, show it
        // Otherwise, only show if there's a record OR if it's the current date (to show who hasn't checked in yet)
        if (!rec && dayOfWeek !== 0 && !holidayName && dateStr !== todayStr) {
          // User doesn't want multiple 'absent' rows for old dates where no one used the system
          continue; 
        }

        let status = rec?.status || 'absent';
        if (dayOfWeek === 0) status = 'sunday';
        if (holidayName) status = 'holiday';
        
        result.push({
          date: dateStr,
          employee_id: emp.employee_id,
          name: emp.name,
          status,
          check_in: rec?.check_in || null,
          check_out: rec?.check_out || null,
          working_hours: rec?.working_hours || null
        });
      }
    }

    setLogs(result);
    setLoading(false);
  };

  const [activeTab, setActiveTab] = useState<'attendance' | 'emails'>('attendance');
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

  const loadEmails = () => {
    setSentEmails(emailService.getSentEmails());
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("ts_active_user") || "null");
    setActiveUser(user);
    if (user && user.role === "employee") {
      toast.error("Access Denied", { description: "You are not authorized to view this page." });
      return;
    }
    load();
    loadEmails();
  }, [month, year]);

  const nextMonth = () => {
    const next = new Date(year, month, 1);
    if (next <= new Date()) setDate(next);
  };
  const prevMonth = () => {
    const prev = new Date(year, month - 2, 1);
    if (prev >= new Date(2026, 4, 1)) setDate(prev); // May 2026 is month index 4
  };

  const filteredLogs = logs.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmails = sentEmails.filter(e => 
    e.employee_name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    e.to.toLowerCase().includes(search.toLowerCase()) ||
    e.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (activeUser && activeUser.role === "employee") {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground max-w-sm">This panel is restricted to administrative accounts only.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-command">// Audit Logs</span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {activeTab === 'attendance' ? "Daily Attendance" : "Email Communications"}
            </h1>
            {activeTab === 'attendance' && (
              <div className="mt-4 flex items-center gap-4">
                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-secondary transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                <span className="font-mono-tech text-sm uppercase tracking-widest font-semibold min-w-[150px] text-center">
                  {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-secondary transition-colors"><ChevronRight className="h-5 w-5" /></button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'emails' && sentEmails.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear the outbox logs?")) {
                    emailService.clearEmails();
                    loadEmails();
                  }
                }}
                className="px-3 py-2 bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white rounded-md text-xs font-mono-tech uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash className="h-3.5 w-3.5" /> Clear Outbox
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={activeTab === 'attendance' ? "Search Employee..." : "Search Recipient/Subject..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-card border border-border rounded-md text-xs font-mono-tech uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-command/50 transition-all w-64"
              />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 p-1 rounded-lg border border-border bg-card/40 max-w-md">
          <button
            onClick={() => {
              setActiveTab('attendance');
              setSearch("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded font-mono-tech text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? "bg-command text-white font-semibold shadow-md hover:brightness-95"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <List className="h-4 w-4" /> Attendance Logs
          </button>
          <button
            onClick={() => {
              setActiveTab('emails');
              loadEmails();
              setSearch("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded font-mono-tech text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'emails'
                ? "bg-command text-white font-semibold shadow-md hover:brightness-95"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <Mail className="h-4 w-4" /> Sent Emails
          </button>
        </div>

        {activeTab === 'attendance' ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 border-b border-border">
                  <tr>
                    <th className="text-left font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Date</th>
                    <th className="text-left font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Employee</th>
                    <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Status</th>
                    <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">In</th>
                    <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Out</th>
                    <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-20 text-muted-foreground animate-pulse">Loading logs…</td></tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-20 text-muted-foreground">No records found for this period.</td></tr>
                  ) : (
                    filteredLogs.map((l, i) => (
                      <tr 
                        key={`${l.date}-${l.employee_id}`} 
                        className={`transition-all duration-200 group hover:brightness-110 ${
                          l.status === "present" ? "bg-[var(--signal-green)]/5 hover:bg-[var(--signal-green)]/10" :
                          l.status === "late" ? "bg-[var(--signal-amber)]/5 hover:bg-[var(--signal-amber)]/10" :
                          l.status === "holiday" ? "bg-command/5 hover:bg-command/10" :
                          l.status === "sunday" ? "bg-sunday/5 hover:bg-sunday/10" :
                          l.status === "absent" ? "bg-destructive/5 hover:bg-destructive/10" :
                          "hover:bg-secondary/30"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono-tech text-xs whitespace-nowrap border-b border-border/40">
                          {new Date(l.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', weekday: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{l.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono-tech">{l.employee_id}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono-tech text-[9px] uppercase ${
                            l.status === "present" ? "bg-[var(--signal-green)]/15 text-signal" :
                            l.status === "late" ? "bg-[var(--signal-amber)]/15 text-[var(--signal-amber)]" :
                            l.status === "holiday" ? "bg-command/15 text-command" :
                            l.status === "sunday" ? "bg-sunday/15 text-sunday" :
                            l.status === "absent" ? "bg-destructive/15 text-destructive" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono-tech text-xs">{l.check_in ? new Date(l.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                        <td className="px-4 py-3 text-center font-mono-tech text-xs">{l.check_out ? new Date(l.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                        <td className="px-4 py-3 text-center font-mono-tech text-xs font-bold">{l.working_hours ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 border-b border-border">
                  <tr>
                    <th className="text-left font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Timestamp</th>
                    <th className="text-left font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Recipient</th>
                    <th className="text-left font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Subject</th>
                    <th className="text-left font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Message Body</th>
                    <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEmails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-20 text-muted-foreground font-mono-tech text-xs uppercase tracking-wider">
                        No automatic email notifications dispatched yet today.
                      </td>
                    </tr>
                  ) : (
                    filteredEmails.map((e) => (
                      <tr 
                        key={e.id} 
                        className="transition-all duration-200 hover:bg-secondary/10"
                      >
                        <td className="px-4 py-4 font-mono-tech text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(e.sent_at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-sm text-foreground">{e.employee_name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono-tech">{e.employee_id} · {e.to}</div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-xs text-command">
                          {e.subject}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground max-w-xs truncate md:max-w-md whitespace-normal">
                          {e.message}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-1.5 justify-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono-tech text-[9px] uppercase font-bold ${
                              e.status === "sent" ? "bg-[var(--signal-green)]/15 text-signal" :
                              e.status === "simulated" ? "bg-[var(--signal-amber)]/15 text-[var(--signal-amber)] font-medium" :
                              "bg-destructive/15 text-destructive"
                            }`}>
                              {e.status}
                            </span>
                            {e.previewUrl && (
                              <a 
                                href={e.previewUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[9px] font-mono-tech uppercase text-command hover:underline font-semibold tracking-wider"
                              >
                                View HTML
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </main>
  );
}
