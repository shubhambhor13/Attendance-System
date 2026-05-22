const nodemailer = require("nodemailer");

console.log("Testing live Monthly Attendance Report dispatch...");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "techsysservices9294@gmail.com",
    pass: "krpy edyj yshz lltv", // Verified active Google App Password
  },
});

const createMonthlyReportBrandedTemplate = (employeeName, employeeId, department, reportMonth, stats) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Attendance Report - TechSys Services</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          color: #334155;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #0f172a;
          padding: 36px 32px;
          text-align: center;
          border-bottom: 4px solid #3b82f6;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .header p {
          color: #94a3b8;
          margin: 6px 0 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }
        .content {
          padding: 40px 36px;
        }
        .welcome {
          font-size: 16px;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 20px;
          color: #0f172a;
        }
        .message-body {
          font-size: 14px;
          line-height: 1.65;
          color: #334155;
          margin-bottom: 20px;
        }
        .details-card {
          background-color: #f8fafc;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #f1f5f9;
          margin: 28px 0;
        }
        .details-title {
          font-size: 12px;
          font-weight: 700;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          text-align: center;
        }
        .details-grid {
          display: table;
          width: 100%;
        }
        .details-row {
          display: table-row;
        }
        .details-label {
          display: table-cell;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          width: 50%;
          border-bottom: 1px dashed #e2e8f0;
        }
        .details-val {
          display: table-cell;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          text-align: right;
          border-bottom: 1px dashed #e2e8f0;
        }
        .divider {
          margin: 16px 0;
          border: none;
          border-top: 2px dashed #cbd5e1;
        }
        .signature {
          font-size: 14px;
          color: #334155;
          line-height: 1.65;
          margin-top: 28px;
        }
        .signature-title {
          font-weight: 700;
          color: #0f172a;
        }
        .signature-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
        }
        .footer {
          background-color: #f8fafc;
          padding: 28px 36px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
        }
        .footer p {
          margin: 6px 0;
          line-height: 1.5;
        }
        .footer-brand {
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.05em;
          margin-bottom: 8px !important;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TECHSYS SERVICES</h1>
          <p>Enterprise Attendance & Workforce Management</p>
        </div>
        <div class="content">
          <p class="welcome">Hello Kalyani,</p>
          
          <p class="message-body">
            Your monthly attendance report for May 2026 has been generated successfully. Please find the attendance summary below.
          </p>

          <div class="details-card">
            <div class="details-title">MONTHLY ATTENDANCE REPORT</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Employee Name</div>
                <div class="details-val">Kalyani</div>
              </div>
              <div class="details-row">
                <div class="details-label">Employee ID</div>
                <div class="details-val">TS02</div>
              </div>
              <div class="details-row">
                <div class="details-label">Department</div>
                <div class="details-val">HR Department</div>
              </div>
              <div class="details-row">
                <div class="details-label">Report Month</div>
                <div class="details-val">May 2026</div>
              </div>
            </div>
            
            <hr class="divider">

            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Present Days</div>
                <div class="details-val" style="color: #10b981;">22</div>
              </div>
              <div class="details-row">
                <div class="details-label">Absent Days</div>
                <div class="details-val" style="color: #ef4444;">02</div>
              </div>
              <div class="details-row">
                <div class="details-label">Holiday Count</div>
                <div class="details-val" style="color: #3b82f6;">03</div>
              </div>
              <div class="details-row">
                <div class="details-label">Sunday Count</div>
                <div class="details-val" style="color: #8b5cf6;">04</div>
              </div>
              <div class="details-row">
                <div class="details-label">Half Days</div>
                <div class="details-val" style="color: #f97316;">01</div>
              </div>
              <div class="details-row">
                <div class="details-label">Late Marks</div>
                <div class="details-val" style="color: #f59e0b;">02</div>
              </div>
              <div class="details-row" style="font-weight: bold; font-size: 14px;">
                <div class="details-label" style="padding-top: 14px; border-bottom: none;">Total Working Days</div>
                <div class="details-val" style="padding-top: 14px; border-bottom: none; color: #0f172a;">31</div>
              </div>
            </div>
          </div>

          <p class="message-body">
            Thank you for your dedication and contribution towards TechSys Services.
          </p>

          <div class="signature">
            Best Regards,<br>
            <span class="signature-title">TechSys Services</span><br>
            <a href="https://techsysservices.com" target="_blank" class="signature-link">techsysservices.com</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-brand">TECHSYS SERVICES</p>
          <p>Confidentiality Notice: This is an automated email communication. Please do not reply to this email.</p>
          <p>&copy; 2026 TechSys Services. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const html = createMonthlyReportBrandedTemplate();

transporter.sendMail({
  from: '"TechSys Services Notifications" <notifications@techsys.services>',
  to: "shubhambhormaster@gmail.com",
  subject: "[TechSys] Monthly Attendance Report - May 2026",
  html: html,
  text: "Hello Kalyani. Your monthly attendance report for May 2026 is ready.",
}).then(info => {
  console.log("Success! Monthly Attendance Report sent successfully.");
  console.log("Message Info:", info.messageId);
}).catch(err => {
  console.error("Error sending email:", err);
});
