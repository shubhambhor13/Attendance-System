const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../server/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Rename brands
code = code.replace(/DIGITAL ATTENDANCE SYSTEM/g, 'TECHSYS SERVICES');
code = code.replace(/Digital Attendance System/g, 'TechSys Services');

// 2. Add Role to createWelcomeBrandedTemplate
code = code.replace(
  'const createWelcomeBrandedTemplate = (employeeName, employeeId, department) => {',
  'const createWelcomeBrandedTemplate = (employeeName, employeeId, department, role) => {'
);
code = code.replace(
  /createWelcomeBrandedTemplate\(employee\.name, employee\.employee_id, employee\.department\)/g,
  'createWelcomeBrandedTemplate(employee.name, employee.employee_id, employee.department, employee.role)'
);
const roleWelcomeRow = `
              <div class="details-row">
                <div class="details-label">Role</div>
                <div class="details-val">\${role || "-"}</div>
              </div>`;
code = code.replace(
  /(\s*<div class="details-row">\s*<div class="details-label">Department<\/div>\s*<div class="details-val">\${department \|\| "-"\}<\/div>\s*<\/div>)/,
  `$1${roleWelcomeRow}`
);

// 3. Add Role to createMonthlyReportBrandedTemplate
code = code.replace(
  'const createMonthlyReportBrandedTemplate = (employeeName, employeeId, department, reportMonth, stats) => {',
  'const createMonthlyReportBrandedTemplate = (employeeName, employeeId, department, role, reportMonth, stats) => {'
);
code = code.replace(
  /createMonthlyReportBrandedTemplate\(\s*employee\.name,\s*employee\.employee_id,\s*employee\.department,\s*reportMonth,\s*stats\s*\)/g,
  'createMonthlyReportBrandedTemplate(employee.name, employee.employee_id, employee.department, employee.role, reportMonth, stats)'
);
const roleMonthlyRow = `
              <div class="details-row">
                <div class="details-label">Role</div>
                <div class="details-val">\${role || "-"}</div>
              </div>`;
code = code.replace(
  /(\s*<div class="details-row">\s*<div class="details-label">Department<\/div>\s*<div class="details-val">\${department \|\| "General"\}<\/div>\s*<\/div>)/,
  `$1${roleMonthlyRow}`
);

// 4. Add Employee Details with Role to createHolidayBrandedTemplate
code = code.replace(
  'const createHolidayBrandedTemplate = (employeeName, holidayName, date) => {',
  'const createHolidayBrandedTemplate = (employeeName, employeeId, department, role, holidayName, date) => {'
);
code = code.replace(
  /createHolidayBrandedTemplate\(employee\.name, holidayName, date\)/g,
  'createHolidayBrandedTemplate(employee.name, employee.employee_id, employee.department, employee.role, holidayName, date)'
);
const holidayEmployeeDetails = `
          <div class="details-card">
            <div class="details-title">EMPLOYEE DETAILS</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Employee Name</div>
                <div class="details-val">\${employeeName}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Employee ID</div>
                <div class="details-val">\${employeeId}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Department</div>
                <div class="details-val">\${department || "-"}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Role</div>
                <div class="details-val">\${role || "-"}</div>
              </div>
            </div>
          </div>
`;
code = code.replace(
  /(\s*<div class="details-card">\s*<div class="details-title">Holiday Details<\/div>)/,
  `${holidayEmployeeDetails}$1`
);

// 5. Add Employee Details with Role to createSundayWeeklyOffBrandedTemplate
code = code.replace(
  'const createSundayWeeklyOffBrandedTemplate = (employeeName, date) => {',
  'const createSundayWeeklyOffBrandedTemplate = (employeeName, employeeId, department, role, date) => {'
);
code = code.replace(
  /createSundayWeeklyOffBrandedTemplate\(employee\.name, date\)/g,
  'createSundayWeeklyOffBrandedTemplate(employee.name, employee.employee_id, employee.department, employee.role, date)'
);
code = code.replace(
  /createSundayWeeklyOffBrandedTemplate\(employee\.name, tomorrowStr\)/g,
  'createSundayWeeklyOffBrandedTemplate(employee.name, employee.employee_id, employee.department, employee.role, tomorrowStr)'
);
const sundayEmployeeDetails = `
          <div class="details-card">
            <div class="details-title">EMPLOYEE DETAILS</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Employee Name</div>
                <div class="details-val">\${employeeName}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Employee ID</div>
                <div class="details-val">\${employeeId}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Department</div>
                <div class="details-val">\${department || "-"}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Role</div>
                <div class="details-val">\${role || "-"}</div>
              </div>
            </div>
          </div>
`;
code = code.replace(
  /(\s*<div class="details-card">\s*<div class="details-title">Weekly Off Details<\/div>)/,
  `${sundayEmployeeDetails}$1`
);

// 6. Add Employee Details with Role to createBrandedTemplate
code = code.replace(
  'const createBrandedTemplate = (employeeName, employeeId, date, status, checkIn, checkOut, hours, subjectOverride, messageOverride) => {',
  'const createBrandedTemplate = (employeeName, employeeId, department, role, date, status, checkIn, checkOut, hours, subjectOverride, messageOverride) => {'
);
code = code.replace(
  /createBrandedTemplate\(\s*employee\.name,\s*employee\.employee_id,\s*date,\s*status,\s*checkIn,\s*checkOut,\s*hours,\s*subjectOverride,\s*messageOverride\s*\)/g,
  'createBrandedTemplate(employee.name, employee.employee_id, employee.department, employee.role, date, status, checkIn, checkOut, hours, subjectOverride, messageOverride)'
);
code = code.replace(
  /createBrandedTemplate\(\s*emp\.name,\s*emp\.employee_id,\s*dateStr,\s*status,\s*rec\?\.check_in\s*\|\|\s*null,\s*rec\?\.check_out\s*\|\|\s*null,\s*rec\?\.working_hours\s*\?\?\s*null\s*\)/g,
  'createBrandedTemplate(emp.name, emp.employee_id, emp.department, emp.role, dateStr, status, rec?.check_in || null, rec?.check_out || null, rec?.working_hours ?? null)'
);
const brandedEmployeeDetails = `
            <div class="details-card">
              <div class="details-title">EMPLOYEE DETAILS</div>
              <div class="details-grid">
                <div class="details-row">
                  <div class="details-label">Employee Name</div>
                  <div class="details-val">\${employeeName}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Employee ID</div>
                  <div class="details-val">\${employeeId}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Department</div>
                  <div class="details-val">\${department || "-"}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Role</div>
                  <div class="details-val">\${role || "-"}</div>
                </div>
              </div>
            </div>
`;
code = code.replace(
  /(\s*<div class="details-card">\s*<div class="details-title">ATTENDANCE AUDIT CARD<\/div>)/,
  `${brandedEmployeeDetails}$1`
);


fs.writeFileSync(serverFile, code, 'utf8');
console.log('Update complete!');
