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

const RECORDS_KEY = "ts_records";
const HOLIDAYS_KEY = "ts_holidays";

export const storage = {
  getEmployees: async (): Promise<Employee[]> => {
    if (!supabase) {
      throw new Error("Supabase is not configured. Please check your environment variables.");
    }
    
    try {
      const { data, error } = await supabase.from('employees').select('*').order('employee_id');
      if (error) {
        console.error('[Storage] Error fetching employees from Supabase:', error);
        throw new Error(error.message || "Failed to fetch employees from database");
      }
      return data || [];
    } catch (err) {
      console.error('[Storage] Error fetching employees:', err);
      throw err;
    }
  },
  saveEmployee: async (emp: Omit<Employee, "id">) => {
    if (!supabase) {
      throw new Error("Supabase is not configured. Please check your environment variables.");
    }
    
    const id = emp.employee_id.trim().toUpperCase();
    
    try {
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
        throw new Error(error.message || "Failed to save employee to database");
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
    if (!supabase) {
      throw new Error("Supabase is not configured. Please check your environment variables.");
    }

    try {
      // We don't need to fetch all employees first, we can just delete by employee_id or id.
      // But we need to know the employee_id to delete their local records.
      // Let's delete by ID or employee_id.
      
      let empIdToDelete = idOrEmpId;
      
      // If it looks like a UUID, we can find the employee_id first to clean up records
      // Alternatively, just delete from supabase.
      
      const { data: emp, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .or(`id.eq.${idOrEmpId},employee_id.eq.${idOrEmpId}`)
        .single();
        
      if (!emp) return;

      const { error } = await supabase.from('employees').delete().eq('id', emp.id);
      
      if (error) {
        console.error('[Storage] Error deleting employee from Supabase:', error);
        throw new Error(error.message || "Failed to delete employee from database");
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
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(HOLIDAYS_KEY);
  }
};
