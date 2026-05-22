import { createClient } from '@supabase/supabase-js';
// No dotenv import needed, environment variables passed via command line


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function deleteAll() {
  console.log('Deleting all employees (this will cascade to attendance and leaves)...');
  
  const { error } = await supabase
    .from('employees')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

  if (error) {
    console.error('Error deleting data:', error);
  } else {
    console.log('Successfully deleted all data.');
  }
}

deleteAll();
