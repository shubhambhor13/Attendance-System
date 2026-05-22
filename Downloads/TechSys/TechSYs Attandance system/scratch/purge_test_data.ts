import { supabase } from '../src/integrations/supabase/client';

async function purgeTestData() {
  console.log('Purging test data...');
  
  const { error: attError } = await supabase
    .from('attendance_records')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (attError) console.error('Error clearing attendance:', attError);
  else console.log('Attendance records cleared.');

  const { error: holError } = await supabase
    .from('holidays')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (holError) console.error('Error clearing holidays:', holError);
  else console.log('Holidays cleared.');

  console.log('Test data purge complete.');
}

purgeTestData();
