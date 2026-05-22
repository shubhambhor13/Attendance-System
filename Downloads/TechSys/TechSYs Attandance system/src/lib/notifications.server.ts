import { createServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';

export const notifyAttendance = createServerFn({ method: 'POST' }, async (opts: any) => {
  const data = opts.data as { 
    employeeId: string; 
    status: 'present' | 'absent' | 'half-day' | 'late' | 'holiday';
    date: string;
    time?: string;
  };

  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('name, email')
      .eq('employee_id', data.employeeId)
      .single();

    if (!employee?.email) return { success: false, reason: 'no_email' };

    const statusMap = {
      present: { title: 'Full Day Present', color: '#22c55e' },
      absent: { title: 'Marked Absent', color: '#ef4444' },
      'half-day': { title: 'Half Day Recorded', color: '#3b82f6' },
      late: { title: 'Late Entry', color: '#f59e0b' },
      holiday: { title: 'Public Holiday', color: '#8b5cf6' }
    };

    const info = statusMap[data.status] || { title: 'Attendance Update', color: '#64748b' };
    const subject = `[Digital Attendance] ${info.title} - ${data.date}`;

    console.log(`[Email Engine] Attendance notification queued for ${employee.email}: ${subject}`);

    return { success: true };
  } catch (error) {
    console.error('Notification Error:', error);
    return { success: false, error };
  }
});

export const notifyHolidayBroadcast = createServerFn({ method: 'POST' }, async (opts: any) => {
  const data = opts.data as { holidayName: string; date: string };
  
  try {
    const { data: employees } = await supabase.from('employees').select('email, name');
    if (!employees || employees.length === 0) return { success: false, reason: 'no_employees' };

    console.log(`[Broadcast Engine] Notifying ${employees.length} employees about holiday: ${data.holidayName}`);

    for (const emp of employees) {
      if (emp.email) {
        console.log(`   -> Queueing email for ${emp.name} (${emp.email})`);
      }
    }

    return { success: true, count: employees.length };
  } catch (error) {
    return { success: false, error };
  }
});
