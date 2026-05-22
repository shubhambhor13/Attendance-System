import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://igwsjfafblkjbmigebvi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnd3NqZmFmYmxramJtaWdlYnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzQ5NjMsImV4cCI6MjA5MzQ1MDk2M30.jjKTlRLd5jtCKCLBTE4h-rw83bqIiRxOSPdvipgVdBA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fullPurge() {
  console.log('Initiating Full System Purge...');
  
  // 1. Attendance Records
  const { error: e1 } = await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e1) console.error('Records Purge Error:', e1);
  else console.log('✓ Attendance Records purged.');

  // 2. Holidays
  const { error: e2 } = await supabase.from('holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (e2) console.error('Holidays Purge Error:', e2);
  else console.log('✓ Holidays purged.');

  // 3. Employees
  const { error: e3 } = await supabase.from('employees').delete().neq('employee_id', '0');
  if (e3) console.error('Employees Purge Error:', e3);
  else console.log('✓ Employee Directory purged.');

  console.log('Full Database Clean Complete.');
}

fullPurge();
