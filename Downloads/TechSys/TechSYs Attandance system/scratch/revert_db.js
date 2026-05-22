import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../server/db.json');

try {
  if (fs.existsSync(DB_FILE)) {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    db.employees.forEach(emp => {
      if (emp.employee_id === 'TS01') {
        emp.email = 'shubhambhormaster@gmail.com';
      }
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    console.log('Database updated successfully! TS01 email set to shubhambhormaster@gmail.com.');
  }
} catch (e) {
  console.error('Failed to update database:', e);
}
