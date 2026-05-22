import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Loader2, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { storage, Employee } from "@/lib/storage";
import { emailService } from "@/lib/notifications";

export const Route = createFileRoute("/employees")({
  component: EmployeesPage,
});

const PAGE_SIZE = 10;

function EmployeesPage() {
  const [activeUser, setActiveUser] = useState<any>(() => JSON.parse(localStorage.getItem("ts_active_user") || "null"));
  const [emps, setEmps] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employee_id: "", name: "", email: "", department: "", role: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const data = storage.getEmployees();
    setEmps(data.sort((a, b) => a.employee_id.localeCompare(b.employee_id)));
    setLoading(false);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("ts_active_user") || "null");
    setActiveUser(user);
    if (user && user.role === "employee") {
      toast.error("Access Denied", { description: "You are not authorized to view this page." });
      return;
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return emps;
    return emps.filter(e =>
      e.employee_id.toLowerCase().includes(term) ||
      e.name.toLowerCase().includes(term) ||
      (e.department ?? "").toLowerCase().includes(term)
    );
  }, [emps, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id.trim() || !form.name.trim()) {
      toast.error("Employee ID and name are required");
      return;
    }
    setSaving(true);
    try {
      const newEmp = storage.saveEmployee({
        employee_id: form.employee_id.trim().toUpperCase(),
        name: form.name.trim(),
        email: form.email.trim() || null,
        department: form.department.trim() || null,
        role: form.role.trim() || null,
      });
      emailService.syncDatabaseWithServer().catch(console.error);
      
      // Automatically send Welcome Onboarding Email if email exists
      if (newEmp.email) {
        emailService.sendWelcomeEmail(newEmp).catch(console.error);
      }

      toast.success("Employee added");
      setForm({ employee_id: "", name: "", email: "", department: "", role: "" });
      setShowAdd(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (idOrEmpId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        storage.deleteEmployee(idOrEmpId);
        emailService.syncDatabaseWithServer().catch(console.error);
        toast.success("Employee deleted");
        load();
      } catch (err) {
        toast.error("Failed to delete employee");
      }
    }
  };

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
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-command">// Roster</span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Employees</h1>
            <div className="mt-1 font-mono-tech text-xs text-muted-foreground">{emps.length} total</div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-md bg-command px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by ID, name, department…"
            className="w-full rounded-md border border-border bg-card pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-command"
          />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  {["ID", "Name", "Email", "Department", "Role", "Actions"].map((h) => (
                    <th key={h} className="text-left font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center p-12 text-muted-foreground text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-12 text-muted-foreground text-sm">No employees match.</td></tr>
                ) : paged.map((e) => (
                  <tr key={e.id || e.employee_id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono-tech text-xs text-command">{e.employee_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.email ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{e.department ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.role ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <button 
                        onClick={() => handleDelete(e.id || e.employee_id, e.name)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                        title="Delete Employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border p-4 flex items-center justify-between">
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-md border border-border text-xs disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-md border border-border text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
            <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Add Employee</h2>
                <button type="button" onClick={() => setShowAdd(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                {([
                  ["employee_id", "Employee ID *", "EMP006"],
                  ["name", "Full Name *", "John Doe"],
                  ["email", "Email", "john@techsys.com"],
                  ["department", "Department", "Engineering"],
                  ["role", "Role", "Developer"],
                ] as const).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
                    <input
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-command"
                    />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={saving} className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-md bg-command py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Employee"}
              </button>
            </form>
          </div>
        )}
    </main>
  );
}