import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Download, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  Loader2
} from "lucide-react";
import { storage } from "@/lib/storage";
import { emailService } from "@/lib/notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  component: Reports,
});

function Reports() {
  const [activeUser, setActiveUser] = useState<any>(() => JSON.parse(localStorage.getItem("ts_active_user") || "null"));
  const [date, setDate] = useState(new Date());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Immersive Individual Report modal state
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [dateWiseLogs, setDateWiseLogs] = useState<any[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthName = date.toLocaleString('default', { month: 'long' });
  const reportMonthStr = `${monthName} ${year}`;

  const load = () => {
    setLoading(true);
    
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    
    const employees = storage.getEmployees();
    const records = storage.getRecords(); // Get all records and filter locally
    const holidays = storage.getHolidays();
    const holidayDates = new Set(holidays.filter(h => h.date >= startDate && h.date <= endDate).map(h => h.date));
    
    const recordMap = new Map();
    records.filter(r => r.date >= startDate && r.date <= endDate)
           .forEach(r => recordMap.set(`${r.employee_id}_${r.date}`, r));

    const currentUser = JSON.parse(localStorage.getItem("ts_active_user") || "null");
    const isEmployee = currentUser?.role === "employee";
    
    const filteredEmps = isEmployee
      ? employees.filter(e => e.employee_id === currentUser.employee_id)
      : employees;

    const report = filteredEmps.map(emp => {
      const stats = { present: 0, absent: 0, late: 0, holiday: 0, sunday: 0, halfDay: 0, totalWorkingDays: 0 };
      const daysInMonth = new Date(year, month, 0).getDate();
      const todayStr = new Date().toISOString().slice(0, 10);
      const softwareStartDate = "2026-05-01";

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const dayOfWeek = dateObj.getDay();
        
        // Skip future dates and dates before software start
        if (dateStr > todayStr || dateStr < softwareStartDate) continue;

        const record = recordMap.get(`${emp.employee_id}_${dateStr}`);
        
        if (dayOfWeek === 0) stats.sunday++;
        else if (holidayDates.has(dateStr)) stats.holiday++;
        else {
          stats.totalWorkingDays++;
          if (record) {
            if (record.status === 'present') stats.present++;
            else if (record.status === 'late') { stats.present++; stats.late++; }
            else if (record.status === 'half-day') { stats.halfDay++; }
            else if (record.status === 'absent') stats.absent++;
          } else {
            stats.absent++;
          }
        }
      }
      return { ...emp, ...stats };
    });

    setReportData(report);
    setLoading(false);
  };

  useEffect(() => {
    setActiveUser(JSON.parse(localStorage.getItem("ts_active_user") || "null"));
    
    // Roster migration: replace Kalyani's original invalid testing email
    // shubhambhor1320@gmail.com with the active test target shubhambhormaster@gmail.com
    const employees = storage.getEmployees();
    let migrated = false;
    const updated = employees.map(emp => {
      if (emp.employee_id === "TS02" && emp.email === "shubhambhor1320@gmail.com") {
        emp.email = "shubhambhormaster@gmail.com";
        migrated = true;
      }
      return emp;
    });
    if (migrated) {
      localStorage.setItem("ts_employees", JSON.stringify(updated));
      emailService.syncDatabaseWithServer().then(() => {
        load();
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [month, year]);

  const nextMonth = () => {
    const next = new Date(year, month, 1);
    if (next <= new Date()) setDate(next);
  };
  const prevMonth = () => {
    const prev = new Date(year, month - 2, 1);
    if (prev >= new Date(2026, 4, 1)) setDate(prev);
  };

  // Compile detailed date-wise attendance sheet for a selected employee
  const openDetailReport = (emp: any) => {
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    
    const records = storage.getRecords();
    const holidays = storage.getHolidays();
    const holidayDates = new Map(holidays.map(h => [h.date, h.name]));
    
    const recordMap = new Map();
    records.filter(r => r.employee_id === emp.employee_id && r.date >= startDate && r.date <= endDate)
           .forEach(r => recordMap.set(r.date, r));

    const logs: any[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const softwareStartDate = "2026-05-01";
    
    let presentCount = 0;
    let absentCount = 0;
    let holidayCount = 0;
    let sundayCount = 0;
    let halfDayCount = 0;
    let lateCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = dateObj.toISOString().slice(0, 10);
      const dayOfWeek = dateObj.getDay();
      
      const formattedDate = dateObj.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const record = recordMap.get(dateStr);
      let status = "absent";
      let details = { check_in: null, check_out: null, hours: null };

      if (dateStr < softwareStartDate) {
        continue; // Don't list dates before tracking began
      }

      if (dayOfWeek === 0) {
        status = "sunday";
        sundayCount++;
      } else if (holidayDates.has(dateStr)) {
        status = "holiday";
        holidayCount++;
      } else if (record) {
        status = record.status;
        details = {
          check_in: record.check_in,
          check_out: record.check_out,
          hours: record.working_hours,
        };
        if (record.status === "present") presentCount++;
        else if (record.status === "late") {
          presentCount++;
          lateCount++;
        }
        else if (record.status === "half-day") halfDayCount++;
        else if (record.status === "absent") absentCount++;
      } else {
        if (dateStr > todayStr) {
          status = "scheduled";
        } else {
          status = "absent";
          absentCount++;
        }
      }

      logs.push({
        date: dateStr,
        formattedDate,
        status,
        ...details,
        holidayName: holidayDates.get(dateStr) || "",
      });
    }

    setSelectedEmp({
      ...emp,
      presentCount,
      absentCount,
      holidayCount,
      sundayCount,
      halfDayCount,
      lateCount,
      totalWorkingDays: daysInMonth,
    });
    setDateWiseLogs(logs);
  };

  // Trigger Monthly Report Broadcast
  const handleSendMonthlyReport = async () => {
    if (!selectedEmp) return;
    setSendingEmail(true);

    try {
      const success = await emailService.sendMonthlyReportEmail(
        selectedEmp,
        reportMonthStr,
        {
          presentCount: selectedEmp.presentCount,
          absentCount: selectedEmp.absentCount,
          holidayCount: selectedEmp.holidayCount,
          sundayCount: selectedEmp.sundayCount,
          halfDayCount: selectedEmp.halfDayCount,
          lateCount: selectedEmp.lateCount,
          totalWorkingDays: selectedEmp.totalWorkingDays
        }
      );
      if (success) {
        toast.success("Monthly Report Email Dispatched!", {
          description: `Successfully delivered to ${selectedEmp.name} (${selectedEmp.email})`
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to send monthly report email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Employee ID", "Name", "Department", "Present", "Absent", "Late", "Holiday", "Sunday", "Total Working Days"];
    const rows = reportData.map(r => [
      r.employee_id,
      r.name,
      r.department || "—",
      r.present,
      r.absent,
      r.late,
      r.holiday,
      r.sunday,
      r.totalWorkingDays
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // Status-badge styling maps
  const statusStyles: Record<string, string> = {
    present: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    absent: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
    holiday: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    sunday: "bg-purple-500/10 text-purple-500 border border-purple-500/20",
    "half-day": "bg-orange-500/10 text-orange-500 border border-orange-500/20",
    late: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    scheduled: "bg-slate-500/10 text-slate-500 border border-slate-500/20",
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 relative">
      <div className={selectedEmp ? "print:hidden" : ""}>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-command">
              {activeUser?.role === "employee" ? `// Employee Workspace · ${activeUser.employee_id}` : "// Reports Engine"}
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {activeUser?.role === "employee" ? "My Monthly Report" : "Monthly Attendance"}
            </h1>
            <div className="mt-4 flex items-center gap-4">
              <button onClick={prevMonth} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-mono-tech text-sm uppercase tracking-widest font-semibold min-w-[150px] text-center">
                {reportMonthStr}
              </span>
              <button onClick={nextMonth} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-xs font-mono-tech uppercase tracking-wider hover:brightness-90 transition-all duration-300 print:hidden">
              <Printer className="h-4 w-4" /> Print PDF
            </button>
            <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-command text-white rounded-md text-xs font-mono-tech uppercase tracking-wider hover:brightness-90 transition-all duration-300 shadow-lg shadow-command/20 print:hidden">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  <th className="text-left font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Employee</th>
                  <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Present</th>
                  <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Absent</th>
                  <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Late</th>
                  <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Holiday</th>
                  <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Sunday</th>
                  <th className="text-center font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4 bg-secondary/20">Working Days</th>
                  <th className="text-right font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-muted-foreground animate-pulse">Generating report data…</td>
                  </tr>
                ) : reportData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-muted-foreground">No employees found in the database.</td>
                  </tr>
                ) : (
                  reportData.map((r, i) => (
                    <motion.tr 
                      key={r.employee_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono-tech uppercase">{r.employee_id} • {r.department || "General"}</div>
                      </td>
                      <td className="px-4 py-4 text-center font-mono-tech font-bold text-[var(--signal-green)]">{r.present}</td>
                      <td className="px-4 py-4 text-center font-mono-tech text-destructive">{r.absent}</td>
                      <td className="px-4 py-4 text-center font-mono-tech text-[var(--signal-amber)]">{r.late}</td>
                      <td className="px-4 py-4 text-center font-mono-tech text-command">{r.holiday}</td>
                      <td className="px-4 py-4 text-center font-mono-tech text-sunday">{r.sunday}</td>
                      <td className="px-4 py-4 text-center font-mono-tech font-bold bg-secondary/10 border-l border-border">{r.totalWorkingDays}</td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => openDetailReport(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-command/10 text-command rounded border border-command/20 text-xs font-mono-tech uppercase tracking-wide hover:bg-command hover:text-white transition-all duration-300"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Report
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-lg border border-border bg-secondary/20 font-mono-tech text-[10px] text-muted-foreground uppercase leading-relaxed">
          <p className="mb-2 tracking-widest font-bold text-foreground">// Calculation Notes</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Present Days include Full Days (1.0) and Late Days (1.0). Half-days are counted separately.</li>
            <li>Total Working Days represent the sum of all tracked roster calendar days for this billing cycle.</li>
            <li>Click the <strong>View Report</strong> action next to any employee to review, print, or dispatch their detailed monthly report sheet.</li>
          </ul>
        </div>
      </div>

      {/* IMMERSIVE MONTHLY REPORT MODAL OVERLAY */}
      <AnimatePresence>
        {selectedEmp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:p-0">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-card rounded-none sm:rounded-xl border border-border overflow-hidden shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh] print:border-none print:shadow-none print:max-h-none"
            >
              {/* Header Panel */}
              <div className="border-b border-border p-6 flex justify-between items-start bg-secondary/20 print:hidden">
                <div>
                  <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-command">// Individual Record Sheet</span>
                  <h2 className="text-2xl font-bold tracking-tight mt-1">Monthly Attendance Audit</h2>
                </div>
                <div className="flex gap-2">
                  {/* Send Monthly Report Email Action Button */}
                  <button 
                    onClick={handleSendMonthlyReport}
                    disabled={sendingEmail}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--signal-green)] text-slate-950 font-bold rounded-md text-xs font-mono-tech uppercase tracking-wider hover:brightness-90 transition-all duration-300 disabled:opacity-50 shadow-md shadow-emerald-500/10"
                  >
                    {sendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send Monthly Report
                  </button>
                  <button 
                    onClick={() => window.print()} 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-xs font-mono-tech uppercase tracking-wider hover:brightness-90 transition-all duration-300"
                  >
                    <Printer className="h-4 w-4" /> Download PDF / Print
                  </button>
                  <button 
                    onClick={() => setSelectedEmp(null)} 
                    className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Printable Body Content */}
              <div className="overflow-y-auto p-6 sm:p-8 flex-1 print:overflow-visible print:p-0">
                {/* TechSys Branded Header Block */}
                <div className="text-center border-b-2 border-slate-900 pb-6 mb-6">
                  <h1 className="text-3xl font-black tracking-[0.06em] text-slate-900">TECHSYS SERVICES</h1>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-mono-tech mt-1">Enterprise Attendance & Workforce Management</p>
                </div>

                {/* Employee Info Block */}
                <div className="bg-secondary/15 rounded-lg border border-border p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 print:border print:bg-slate-50">
                  <div>
                    <span className="font-mono-tech text-[10px] uppercase text-muted-foreground tracking-wider">Employee Name</span>
                    <p className="text-base font-bold text-foreground mt-1">{selectedEmp.name}</p>
                  </div>
                  <div>
                    <span className="font-mono-tech text-[10px] uppercase text-muted-foreground tracking-wider">Employee ID</span>
                    <p className="text-base font-mono-tech font-bold text-command mt-1">{selectedEmp.employee_id}</p>
                  </div>
                  <div>
                    <span className="font-mono-tech text-[10px] uppercase text-muted-foreground tracking-wider">Department</span>
                    <p className="text-base font-bold text-foreground mt-1">{selectedEmp.department || "General"}</p>
                  </div>
                  <div>
                    <span className="font-mono-tech text-[10px] uppercase text-muted-foreground tracking-wider">Report Month</span>
                    <p className="text-base font-bold text-foreground mt-1">{reportMonthStr}</p>
                  </div>
                </div>

                {/* High-fidelity summary cards grid */}
                <h3 className="text-sm font-mono-tech uppercase tracking-widest text-foreground font-bold mb-4">// Monthly Summary Metrics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 mb-8">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center">
                    <span className="text-[10px] font-mono-tech uppercase text-emerald-500 font-bold block mb-1">Present</span>
                    <span className="text-3xl font-black font-mono-tech text-emerald-600 block">{String(selectedEmp.presentCount).padStart(2, '0')}</span>
                  </div>
                  <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg text-center">
                    <span className="text-[10px] font-mono-tech uppercase text-rose-500 font-bold block mb-1">Absent</span>
                    <span className="text-3xl font-black font-mono-tech text-rose-600 block">{String(selectedEmp.absentCount).padStart(2, '0')}</span>
                  </div>
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-center">
                    <span className="text-[10px] font-mono-tech uppercase text-blue-500 font-bold block mb-1">Holidays</span>
                    <span className="text-3xl font-black font-mono-tech text-blue-600 block">{String(selectedEmp.holidayCount).padStart(2, '0')}</span>
                  </div>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg text-center">
                    <span className="text-[10px] font-mono-tech uppercase text-purple-500 font-bold block mb-1">Sundays</span>
                    <span className="text-3xl font-black font-mono-tech text-purple-600 block">{String(selectedEmp.sundayCount).padStart(2, '0')}</span>
                  </div>
                  <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg text-center">
                    <span className="text-[10px] font-mono-tech uppercase text-orange-500 font-bold block mb-1">Half Days</span>
                    <span className="text-3xl font-black font-mono-tech text-orange-600 block">{String(selectedEmp.halfDayCount).padStart(2, '0')}</span>
                  </div>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg text-center">
                    <span className="text-[10px] font-mono-tech uppercase text-amber-500 font-bold block mb-1">Late Marks</span>
                    <span className="text-3xl font-black font-mono-tech text-amber-600 block">{String(selectedEmp.lateCount).padStart(2, '0')}</span>
                  </div>
                  <div className="p-4 bg-slate-500/5 border border-slate-500/20 rounded-lg text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono-tech uppercase text-slate-500 font-bold block mb-1">Total Days</span>
                    <span className="text-3xl font-black font-mono-tech text-slate-700 block">{selectedEmp.totalWorkingDays}</span>
                  </div>
                </div>

                {/* Date-wise Attendance table */}
                <h3 className="text-sm font-mono-tech uppercase tracking-widest text-foreground font-bold mb-4">// Date-wise Audit Log</h3>
                <div className="rounded-lg border border-border overflow-hidden bg-card print:border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/30 border-b border-border">
                      <tr>
                        <th className="text-left font-mono-tech text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-3">Date</th>
                        <th className="text-center font-mono-tech text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-3">Check-In</th>
                        <th className="text-center font-mono-tech text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-3">Check-Out</th>
                        <th className="text-center font-mono-tech text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-3">Shift Hours</th>
                        <th className="text-right font-mono-tech text-[9px] uppercase tracking-widest text-muted-foreground px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {dateWiseLogs.map((log) => (
                        <tr key={log.date} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <div>{log.formattedDate}</div>
                            {log.holidayName && (
                              <span className="text-[9px] text-blue-500 font-mono-tech uppercase tracking-wider mt-0.5 block">
                                🎉 {log.holidayName}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">
                            {log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">
                            {log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-tech font-semibold">
                            {log.hours !== null ? `${log.hours} hrs` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono-tech text-[9px] uppercase font-bold tracking-wider ${statusStyles[log.status] || ""}`}>
                              {log.status === "scheduled" ? "No Entry" : log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer notes */}
                <div className="mt-8 text-center text-[10px] text-muted-foreground font-mono-tech border-t border-border pt-6 print:mt-12">
                  <p>TechSys Services · www.techsysservices.com</p>
                  <p className="mt-1">Confidentiality Notice: This is an automated email communication. Please do not reply to this email.</p>
                  <p className="mt-1">&copy; 2026 TechSys Services. All rights reserved.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}