import { createServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { notifyAttendance } from './notifications.server';

export const markAbsences = createServerFn({ method: 'POST' }, async (opts: any) => {
  const data = opts.data as { date: string };
  try {
    const { data: holiday } = await supabase.from('holidays').select('name').eq('date', data.date).maybeSingle();
    if (holiday) return { success: true, count: 0, isHoliday: true, holidayName: holiday.name };
    const today = new Date(data.date);
    if (today.getDay() === 0) return { success: true, count: 0, isSunday: true };
    const { data: employees } = await supabase.from('employees').select('employee_id');
    if (!employees) return { success: false, error: 'no_employees' };
    const { data: records } = await supabase.from('attendance_records').select('employee_id').eq('date', data.date);
    const presentIds = new Set(records?.map(r => r.employee_id) || []);
    const absentEmployees = employees.filter(e => !presentIds.has(e.employee_id));
    if (absentEmployees.length === 0) return { success: true, count: 0 };
    const { error } = await supabase.from('attendance_records').insert(absentEmployees.map(e => ({ employee_id: e.employee_id, date: data.date, status: 'absent' })));
    if (error) throw error;

    // Notify absent employees
    for (const emp of absentEmployees) {
      notifyAttendance({ data: { employeeId: emp.employee_id, status: 'absent', date: data.date } }).catch(console.error);
    }
    return { success: true, count: absentEmployees.length };
  } catch (error) {
    return { success: false, error };
  }
});

export const getMonthlyReport = createServerFn({ method: 'GET' }, async (opts: any) => {
  const data = opts.data as { month: number; year: number };
  try {
    const startDate = new Date(data.year, data.month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(data.year, data.month, 0).toISOString().slice(0, 10);
    const { data: employees } = await supabase.from('employees').select('employee_id, name, department');
    const { data: records } = await supabase.from('attendance_records').select('employee_id, date, status').gte('date', startDate).lte('date', endDate);
    const { data: holidays } = await supabase.from('holidays').select('date').gte('date', startDate).lte('date', endDate);
    const holidayDates = new Set(holidays?.map(h => h.date) || []);
    
    // Optimization: Create a lookup map for records
    const recordMap = new Map();
    records?.forEach(r => recordMap.set(`${r.employee_id}_${r.date}`, r));

    const report = (employees ?? []).map(emp => {
      const stats = { present: 0, absent: 0, late: 0, holiday: 0, sunday: 0, totalWorkingDays: 0 };
      const daysInMonth = new Date(data.year, data.month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = new Date(data.year, data.month - 1, d).toISOString().slice(0, 10);
        const dayOfWeek = new Date(data.year, data.month - 1, d).getDay();
        const record = recordMap.get(`${emp.employee_id}_${dateStr}`);
        
        if (dayOfWeek === 0) stats.sunday++;
        else if (holidayDates.has(dateStr)) stats.holiday++;
        else {
          stats.totalWorkingDays++;
          if (record) {
            if (record.status === 'present') stats.present++;
            else if (record.status === 'late') { stats.present++; stats.late++; }
            else if (record.status === 'half-day') { stats.present += 0.5; }
            else if (record.status === 'absent') stats.absent++;
          } else {
            if (dateStr < new Date().toISOString().slice(0, 10)) stats.absent++;
          }
        }
      }
      return { ...emp, ...stats };
    });
    return { success: true, data: report };
  } catch (error) {
    return { success: false, error };
  }
});

export const getDateWiseLogs = createServerFn({ method: 'GET' }, async (opts: any) => {
  const data = opts.data as { month: number; year: number };
  try {
    const startDate = new Date(data.year, data.month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(data.year, data.month, 0).toISOString().slice(0, 10);
    const { data: employees } = await supabase.from('employees').select('employee_id, name');
    const { data: records } = await supabase.from('attendance_records').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
    const { data: holidays } = await supabase.from('holidays').select('date, name').gte('date', startDate).lte('date', endDate);
    const holidayMap = new Map(holidays?.map(h => [h.date, h.name]) || []);
    
    // Optimization: Pre-map records for instant lookup
    const recordMap = new Map();
    records?.forEach(r => recordMap.set(`${r.employee_id}_${r.date}`, r));

    const logs: any[] = [];
    const daysInMonth = new Date(data.year, data.month, 0).getDate();
    for (let d = daysInMonth; d >= 1; d--) {
      const dateStr = new Date(data.year, data.month - 1, d).toISOString().slice(0, 10);
      const dayOfWeek = new Date(data.year, data.month - 1, d).getDay();
      const holidayName = holidayMap.get(dateStr);
      for (const emp of (employees || [])) {
        const rec = recordMap.get(`${emp.employee_id}_${dateStr}`);
        let status = rec?.status || 'absent';
        if (dayOfWeek === 0) status = 'sunday';
        if (holidayName) status = 'holiday';
        logs.push({ date: dateStr, employee_id: emp.employee_id, name: emp.name, status, check_in: rec?.check_in || null, check_out: rec?.check_out || null, working_hours: rec?.working_hours || null });
      }
    }
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error };
  }
});

export const getEmployeeCalendar = createServerFn({ method: 'GET' }, async (opts: any) => {
  const data = opts.data as { employeeId: string; month: number; year: number };
  try {
    const startDate = new Date(data.year, data.month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(data.year, data.month, 0).toISOString().slice(0, 10);
    const { data: employee } = await supabase.from('employees').select('name').eq('employee_id', data.employeeId).single();
    if (!employee) return { success: false, error: 'not_found' };
    const { data: records } = await supabase.from('attendance_records').select('date, status').eq('employee_id', data.employeeId).gte('date', startDate).lte('date', endDate);
    const { data: holidays } = await supabase.from('holidays').select('date').gte('date', startDate).lte('date', endDate);
    const holidayDates = holidays?.map(h => h.date) || [];
    const recordMap = Object.fromEntries(records?.map(r => [r.date, r.status]) || []);
    return { success: true, name: employee.name, data: { holidayDates, recordMap } };
  } catch (error) {
    return { success: false, error };
  }
});

export const resetDatabase = createServerFn({ method: 'POST' }, async (opts: any) => {
  try {
    // Factory Reset: Clear all data
    await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('employees').delete().neq('employee_id', '0');
    return { success: true };
  } catch (error) {
    console.error('Reset Error:', error);
    return { success: false, error };
  }
});
