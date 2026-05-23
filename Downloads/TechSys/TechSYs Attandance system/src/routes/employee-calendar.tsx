import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from "lucide-react";
import { storage, Employee } from "@/lib/storage";

export const Route = createFileRoute("/employee-calendar")({
  head: () => ({
    meta: [
      { title: "Personal Calendar — Digital Attendance System" },
    ],
  }),
  component: EmployeeCalendar,
});

function EmployeeCalendar() {
  const [activeUser, setActiveUser] = useState<any>(() => JSON.parse(localStorage.getItem("ts_active_user") || "null"));
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [empName, setEmpName] = useState("");

  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const load = async (targetId?: string) => {
    const idToUse = targetId || employeeId;
    if (!idToUse) return;
    setLoading(true);
    
    const id = idToUse.trim().toUpperCase();
    const employees = await storage.getEmployees();
    const employee = employees.find((e: Employee) => e.employee_id === id);
    
    if (!employee) {
      setCalendarData(null);
      setEmpName("");
      setLoading(false);
      return;
    }

    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    
    const records = storage.getRecords().filter(r => r.employee_id === id && r.date >= startDate && r.date <= endDate);
    const holidays = storage.getHolidays().filter(h => h.date >= startDate && h.date <= endDate);
    
    const holidayDates = holidays.map(h => h.date);
    const recordMap = Object.fromEntries(records.map(r => [r.date, r.status]));
    
    setCalendarData({ holidayDates, recordMap });
    setEmpName(employee.name);
    setLoading(false);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("ts_active_user") || "null");
    setActiveUser(user);
    if (user && user.role === "employee") {
      setEmployeeId(user.employee_id);
      load(user.employee_id);
    }
  }, []);

  useEffect(() => {
    if (employeeId) load();
  }, [month, year, employeeId]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  const renderStatus = (d: number) => {
    if (!calendarData) return null;
    const dateStr = new Date(year, month - 1, d).toISOString().slice(0, 10);
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    
    const recordStatus = calendarData.recordMap[dateStr];
    const isHoliday = calendarData.holidayDates.includes(dateStr);

    // Priority: Holiday > Sunday > Present > Absent
    if (isHoliday) return <span className="text-command font-bold">H</span>;
    if (dayOfWeek === 0) return <span className="text-sunday font-bold">S</span>;
    if (recordStatus === "present" || recordStatus === "late" || recordStatus === "half-day") return <span className="text-signal font-bold">P</span>;
    
    // Check if date is in the past for Absent mark
    const todayStr = new Date().toISOString().slice(0, 10);
    if (recordStatus === "absent" || (dateStr < todayStr && !recordStatus)) return <span className="text-destructive font-bold">A</span>;
    
    return null;
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-8">
          <div>
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-command">// Individual View</span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Personal Calendar</h1>
          </div>

          {!activeUser || activeUser.role !== "employee" ? (
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter Employee ID..."
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                  className="w-full pl-10 pr-4 py-2 bg-secondary/50 border-none rounded-md text-sm font-mono-tech uppercase tracking-wider focus:ring-1 focus:ring-command/50 outline-none"
                />
              </div>
              <button onClick={() => load()} className="px-6 py-2 bg-command text-primary-foreground rounded-md text-xs font-mono-tech uppercase tracking-widest hover:bg-command/90 transition-colors">
                Fetch
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-[var(--signal-green)]/30 bg-[var(--signal-green)]/5 font-mono-tech text-xs text-[var(--signal-green)] font-bold">
              ✓ Locked to Personal Account Sync: {activeUser.employee_id}
            </div>
          )}

          {calendarData && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-command/10 flex items-center justify-center text-command">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">{empName}</h2>
                    <p className="text-xs font-mono-tech text-muted-foreground uppercase">{employeeId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setDate(new Date(year, month - 2, 1))} className="p-1.5 rounded hover:bg-secondary transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                  <span className="font-mono-tech text-xs uppercase tracking-widest font-semibold">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => setDate(new Date(year, month, 1))} className="p-1.5 rounded hover:bg-secondary transition-colors"><ChevronRight className="h-5 w-5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-px bg-border/60 border border-border rounded-lg overflow-hidden bg-card">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="bg-secondary/30 py-2 text-center text-[9px] font-mono-tech uppercase tracking-widest text-muted-foreground border-b border-border">
                    {day}
                  </div>
                ))}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-card h-24 p-2 opacity-20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <div key={i + 1} className="bg-card h-24 p-2 border-r border-b border-border/40 relative">
                    <span className="text-[10px] font-mono-tech text-muted-foreground">{i + 1}</span>
                    <div className="absolute inset-0 flex items-center justify-center text-xl">
                      {renderStatus(i + 1)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-center gap-8 p-4 bg-secondary/20 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider">
                  <span className="text-signal font-bold text-base">P</span>
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider">
                  <span className="text-destructive font-bold text-base">A</span>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider">
                  <span className="text-command font-bold text-base">H</span>
                  <span>Holiday</span>
                </div>
                <div className="flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider">
                  <span className="text-sunday font-bold text-base">S</span>
                  <span>Sunday</span>
                </div>
              </div>
            </motion.div>
          )}

          {!calendarData && !loading && employeeId && (
            <div className="text-center py-20 text-muted-foreground font-mono-tech text-xs uppercase tracking-widest animate-pulse">
              Search to load calendar
            </div>
          )}
        </div>
    </main>
  );
}
