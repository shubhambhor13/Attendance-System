import { supabase } from './supabase';

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
  getEmployees: async (): Promise<Employee[]> => {
    try {
      const { data, error } = await supabase.from('employees').select('*').order('employee_id');
      if (error) {
        console.error('[Storage] Error fetching employees from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || "[]");
      }
      return data || [];
    } catch (err) {
      console.error('[Storage] Error fetching employees:', err);
      // Fallback to localStorage if Supabase fails
      return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || "[]");
    }
  },
  saveEmployee: async (emp: Omit<Employee, "id">) => {
    try {
      const id = emp.employee_id.trim().toUpperCase();
      
      // Check if employee already exists in Supabase
      const { data: existing } = await supabase.from('employees').select('*').eq('employee_id', id).single();
      
      if (existing) {
        throw new Error(`Employee ID ${id} already exists`);
      }
      
      const newEmp = { ...emp, employee_id: id, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      
      // Insert into Supabase
      const { data, error } = await supabase.from('employees').insert([newEmp]).select().single();
      
      if (error) {
        console.error('[Storage] Error saving employee to Supabase:', error);
        // Fallback to localStorage if Supabase fails
        const emps = await storage.getEmployees();
        if (emps.some((e: Employee) => e.employee_id === id)) {
          throw new Error(`Employee ID ${id} already exists`);
        }
        emps.push(newEmp);
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(emps));
        return newEmp;
      }
      
      return data;
    } catch (err: any) {
      console.error('[Storage] Error saving employee:', err);
      throw err;
    }
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
  deleteEmployee: async (idOrEmpId: string) => {
    try {
      const emps = await storage.getEmployees();
      const emp = emps.find((e: Employee) => e.id === idOrEmpId || e.employee_id === idOrEmpId);
      if (!emp) return;

      // Delete from Supabase
      const { error } = await supabase.from('employees').delete().eq('employee_id', emp.employee_id);
      
      if (error) {
        console.error('[Storage] Error deleting employee from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        const filteredEmps = emps.filter((e: Employee) => e.id !== emp.id && e.employee_id !== emp.employee_id);
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(filteredEmps));
      }

      // Also delete associated records from localStorage
      const allRecords = storage.getRecords();
      const filteredRecords = allRecords.filter(r => r.employee_id !== emp.employee_id);
      localStorage.setItem(RECORDS_KEY, JSON.stringify(filteredRecords));
    } catch (err) {
      console.error('[Storage] Error deleting employee:', err);
      throw err;
    }
  },
  clearAll: () => {
    localStorage.removeItem(EMPLOYEES_KEY);
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(HOLIDAYS_KEY);
  }
};
