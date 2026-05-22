
export type Employee = {
  id: string;
  employee_id: string;
  name: string;
  email: string | null;
  department: string | null;
  role: string | null;
  created_at?: string;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  working_hours: number | null;
  created_at?: string;
};

export type Holiday = {
  id: string;
  date: string;
  name: string;
  created_at?: string;
};

const EMPLOYEES_KEY = "ts_employees";
const RECORDS_KEY = "ts_records";
const HOLIDAYS_KEY = "ts_holidays";

export const storage = {
  getEmployees: (): Employee[] => {
    return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || "[]");
  },
  saveEmployee: (emp: Omit<Employee, "id">) => {
    const emps = storage.getEmployees();
    const id = emp.employee_id.trim().toUpperCase();
    if (emps.some(e => e.employee_id === id)) {
      throw new Error(`Employee ID ${id} already exists`);
    }
    const newEmp = { ...emp, employee_id: id, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    emps.push(newEmp);
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(emps));
    return newEmp;
  },
  getRecords: (date?: string): AttendanceRecord[] => {
    const all = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]") as AttendanceRecord[];
    if (date) return all.filter(r => r.date === date);
    return all;
  },
  saveRecord: (record: Omit<AttendanceRecord, "id">) => {
    const all = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]") as AttendanceRecord[];
    const newRecord = { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    all.push(newRecord);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(all));
    return newRecord;
  },
  updateRecord: (id: string, updates: Partial<AttendanceRecord>) => {
    const all = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]") as AttendanceRecord[];
    const index = all.findIndex(r => r.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], ...updates };
      localStorage.setItem(RECORDS_KEY, JSON.stringify(all));
      return all[index];
    }
    return null;
  },
  getHolidays: (): Holiday[] => {
    return JSON.parse(localStorage.getItem(HOLIDAYS_KEY) || "[]");
  },
  saveHoliday: (holiday: Omit<Holiday, "id">) => {
    const all = storage.getHolidays();
    const newHoliday = { ...holiday, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    all.push(newHoliday);
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(all));
    return newHoliday;
  },
  deleteHoliday: (id: string) => {
    const all = storage.getHolidays();
    const filtered = all.filter(h => h.id !== id);
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(filtered));
  },
  deleteEmployee: (idOrEmpId: string) => {
    const emps = storage.getEmployees();
    const emp = emps.find(e => e.id === idOrEmpId || e.employee_id === idOrEmpId);
    if (!emp) return;

    const filteredEmps = emps.filter(e => e.id !== emp.id && e.employee_id !== emp.employee_id);
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(filteredEmps));

    // Also delete associated records
    const allRecords = storage.getRecords();
    const filteredRecords = allRecords.filter(r => r.employee_id !== emp.employee_id);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(filteredRecords));
  },
  clearAll: () => {
    localStorage.removeItem(EMPLOYEES_KEY);
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(HOLIDAYS_KEY);
  }
};
