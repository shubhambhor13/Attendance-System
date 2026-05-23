import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

console.log(`[Mail Server] Resend API Config - Key: ${process.env.RESEND_API_KEY ? '***SET***' : 'NOT SET'}`);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseConfigured =
  supabaseUrl &&
  supabaseKey &&
  /^https?:\/\//i.test(supabaseUrl) &&
  !supabaseUrl.includes("your-supabase");
let supabase = null;

if (supabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("[Database] Supabase client initialized");
} else {
  console.warn("[Database] Supabase not configured. Using in-memory OTP store.");
}

const dbPath = path.join(__dirname, "db.json");

const readDb = () => {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (e) {
    console.error("[Database] Error reading db.json:", e);
  }
  return { employees: [], records: [], logs: [], tenants: {}, users: [] };
};

const writeDb = (db) => {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Running");
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "API Working Successfully",
  });
});

const PORT = process.env.PORT || 3001;

// Initialize Resend API
const resend = new Resend(process.env.RESEND_API_KEY);

console.log(`[Mail Server] Resend API Config - Key: ${process.env.RESEND_API_KEY ? '***SET***' : 'NOT SET'}`);

const mailFrom = () =>
  process.env.EMAIL_USER
    ? `"Digital Attendance System" <${process.env.EMAIL_USER}>`
    : '"Digital Attendance System" <notifications@techsys.services>';

const logOtpMailError = (context, err) => {
  console.error(`[OTP] ${context} — send failed:`, {
    message: err?.message,
    code: err?.code,
    response: err?.response,
    responseCode: err?.responseCode,
    command: err?.command,
    emailUser: process.env.EMAIL_USER || "(missing)",
    passLength: process.env.EMAIL_PASS ? String(process.env.EMAIL_PASS).length : 0,
  });
};

const otpApiError = (err) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return {
      status: 503,
      error:
        "Email service is not configured on the server. Set EMAIL_USER and EMAIL_PASS in Render environment variables.",
    };
  }
  if (err?.code === "EAUTH" || err?.responseCode === 535) {
    return {
      status: 503,
      error:
        "Gmail authentication failed. Verify EMAIL_USER and EMAIL_PASS (16-character app password) on Render.",
    };
  }
  if (err?.code === "ECONNECTION" || err?.code === "ETIMEDOUT") {
    return {
      status: 503,
      error: "Could not connect to Gmail SMTP. Please try again in a moment.",
    };
  }
  return {
    status: 500,
    error: err?.message || "Failed to send OTP email. Please try again.",
  };
};

// In-memory OTP fallback when Supabase is unavailable
const otpStore = new Map();

const createOtpEmailTemplate = (employeeName, otp) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Attendance System – OTP Verification</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; margin: 0; padding: 0; color: #334155; }
    .wrapper { padding: 40px 16px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.10); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px 32px; text-align: center; border-bottom: 4px solid #3b82f6; }
    .header h1 { color: #ffffff; margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: 0.06em; }
    .header p { color: #3b82f6; margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; }
    .content { padding: 44px 40px 36px; }
    .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 10px; }
    .description { font-size: 14px; line-height: 1.7; color: #64748b; margin: 0 0 36px; }
    .otp-block { text-align: center; margin: 0 0 36px; }
    .otp-divider { color: #94a3b8; font-size: 16px; letter-spacing: 0.08em; margin: 0 0 18px; font-family: monospace; }
    .otp-code { font-family: 'Courier New', monospace; font-size: 52px; font-weight: 900; color: #1e40af; letter-spacing: 0.25em; margin: 0 0 18px; line-height: 1; display: block; }
    .otp-validity { font-size: 13px; color: #64748b; font-weight: 500; margin: 20px 0 0; }
    .security-note { font-size: 13px; color: #64748b; font-style: italic; margin: 0 0 36px; line-height: 1.65; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
    .signature { font-size: 14px; color: #334155; line-height: 1.9; }
    .signature strong { color: #0f172a; font-weight: 700; }
    .signature a { color: #3b82f6; text-decoration: none; font-weight: 600; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 5px 0; font-size: 11px; color: #94a3b8; line-height: 1.6; }
    .footer-brand { font-weight: 700; color: #475569; font-size: 12px !important; margin-bottom: 8px !important; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">

      <div class="header">
        <h1>DIGITAL ATTENDANCE SYSTEM</h1>
        <p>Secure Employee Verification System</p>
      </div>

      <div class="content">
        <p class="greeting">Hello ${employeeName},</p>
        <p class="description">
          Your One-Time Password (OTP) for secure verification is:
        </p>

        <div class="otp-block">
          <div class="otp-divider">━━━━━━━━━━━━━━━━━━━</div>
          <span class="otp-code">${otp}</span>
          <div class="otp-divider">━━━━━━━━━━━━━━━━━━━</div>
          <p class="otp-validity">This OTP is valid for the next <strong>5 minutes</strong>.</p>
        </div>

        <p class="security-note">
          If you did not request this verification, please ignore this email.
        </p>

        <hr class="divider">

        <div class="signature">
          Best Regards,<br>
          <strong>Digital Attendance System</strong><br>
          <a href="https://www.techsysservices.com">techsysservices.com</a>
        </div>
      </div>

      <div class="footer">
        <p>Confidentiality Notice: This is an automated email communication. Please do not reply to this email.</p>
        <p>&copy; 2026 TechSys Services. All rights reserved.</p>
      </div>

    </div>
  </div>
</body>
</html>
`;

const sendOtpEmail = async (to, name, otp, subjectLine) => {
  if (!process.env.RESEND_API_KEY) {
    const err = new Error("RESEND_API_KEY is not set");
    err.code = "ENOTCONFIGURED";
    throw err;
  }
  const html = createOtpEmailTemplate(name, otp);
  console.log(`[OTP] Sending email to ${to} via Resend`);
  try {
    const info = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: subjectLine,
      html,
    });
    console.log(`[OTP] Email sent via Resend: messageId=${info.id}`);
    return info;
  } catch (err) {
    logOtpMailError(`send to ${to}`, err);
    throw err;
  }
};

// POST /api/send-otp  { email }
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: "Email is required." });

  try {
    const employee = await getEmployeeByEmail(email);

    if (!employee) {
      return res.status(404).json({ success: false, error: "No employee found with that email address." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await saveOtp(email, otp, employee.employee_id);
    await sendOtpEmail(
      email,
      employee.name,
      otp,
      `[Digital Attendance] Your Attendance OTP: ${otp}`
    );

    console.log(`[OTP] Sent OTP to ${email} for employee ${employee.name}`);
    res.json({ success: true, employeeName: employee.name, employeeId: employee.employee_id });
  } catch (error) {
    logOtpMailError(`employee OTP for ${email}`, error);
    const { status, error: msg } = otpApiError(error);
    return res.status(status).json({ success: false, error: msg });
  }
});

// POST /api/verify-otp  { email, otp }
app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, error: "Email and OTP are required." });

  const record = await getOtp(email);
  if (!record) return res.status(400).json({ success: false, error: "No OTP found for this email. Please request a new one." });

  if (new Date(record.expires_at) < new Date()) {
    await deleteOtp(email);
    return res.status(400).json({ success: false, error: "OTP has expired. Please request a new one." });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ success: false, error: "Invalid OTP. Please check the code and try again." });
  }

  await deleteOtp(email);
  const employee = await getEmployeeByEmail(email);
  res.json({ success: true, employeeId: record.employee_id, employeeName: employee?.name || "" });
});

// GET /api/employee-data?email=...
app.get("/api/employee-data", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, error: "Email is required." });

  const employee = await getEmployeeByEmail(email);

  if (!employee) {
    return res.status(404).json({ success: false, error: "Employee profile not found on server." });
  }

  const records = await getAttendanceRecords();
  const employeeRecords = records.filter(r => r.employee_id === employee.employee_id);

  res.json({
    success: true,
    employee,
    records: employeeRecords,
    holidays: []
  });
});

// GET /api/admin-data
app.get("/api/admin-data", async (req, res) => {
  const employees = await getEmployees();
  const records = await getAttendanceRecords();
  
  res.json({
    success: true,
    employees: employees || [],
    records: records || [],
    holidays: []
  });
});

// POST /api/send-admin-otp  { email, name }  — used for admin registration (no employee DB check)
app.post("/api/send-admin-otp", async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ success: false, error: "Email and name are required." });

  try {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await saveOtp(email, otp, null);
    await sendOtpEmail(
      email,
      name,
      otp,
      `[Digital Attendance] Admin Registration OTP: ${otp}`
    );
    console.log(`[OTP] Admin registration OTP sent to ${name} <${email}>`);
    res.json({ success: true });
  } catch (err) {
    logOtpMailError(`admin OTP for ${email}`, err);
    const { status, error: msg } = otpApiError(err);
    res.status(status).json({ success: false, error: msg });
  }
});

// Database Operations using Supabase
const getEmployees = async () => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('employees').select('*');
  if (error) {
    console.error('[Database] Error fetching employees:', error);
    return [];
  }
  return data || [];
};

const getAttendanceRecords = async () => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('attendance_records').select('*');
  if (error) {
    console.error('[Database] Error fetching attendance records:', error);
    return [];
  }
  return data || [];
};

const getEmployeeByEmail = async (email) => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('employees').select('*').eq('email', email).single();
  if (error) {
    console.error('[Database] Error fetching employee by email:', error);
    return null;
  }
  return data;
};

const saveAttendanceRecord = async (record) => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('attendance_records').upsert(record).select();
  if (error) {
    console.error('[Database] Error saving attendance record:', error);
    return null;
  }
  return data;
};

// OTP storage: Supabase in production, in-memory fallback for local dev
const saveOtp = async (email, otp, employeeId) => {
  const key = email.toLowerCase();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  if (supabase) {
    const { error } = await supabase.from("otp_codes").upsert({
      email: key,
      otp,
      employee_id: employeeId,
      expires_at: expiresAt,
    });
    if (error) console.error("[Database] Error saving OTP:", error);
    return;
  }
  otpStore.set(key, { otp, expires_at: expiresAt, employee_id: employeeId });
};

const getOtp = async (email) => {
  const key = email.toLowerCase();
  if (supabase) {
    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", key)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) {
      console.error("[Database] Error fetching OTP:", error);
      return null;
    }
    return data;
  }
  return otpStore.get(key) || null;
};

const deleteOtp = async (email) => {
  const key = email.toLowerCase();
  if (supabase) {
    const { error } = await supabase.from("otp_codes").delete().eq("email", key);
    if (error) console.error("[Database] Error deleting OTP:", error);
    return;
  }
  otpStore.delete(key);
};

// Professional TechSys Services Email Branding Template Creator
const createBrandedTemplate = (employeeName, employeeId, date, status, checkIn, checkOut, hours, subjectOverride, messageOverride) => {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Dynamic check for professional Daily Attendance Summary template on check-out
  if (checkOut) {
    let statusBg = "#10b981"; // present
    if (status.toLowerCase() === "late") statusBg = "#f59e0b";
    else if (status.toLowerCase() === "absent") statusBg = "#f43f5e";

    const totalMin = Math.round((hours || 0) * 60);
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    const formattedHours = `${String(hrs).padStart(2, '0')} Hours ${String(mins).padStart(2, '0')} Minutes`;

    const formattedCheckIn = checkIn ? new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—";
    const formattedCheckOut = checkOut ? new Date(checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Attendance Summary - Digital Attendance System</title>
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
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
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
            padding: 10px 0;
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            width: 45%;
            border-bottom: 1px dashed #f1f5f9;
          }
          .details-val {
            display: table-cell;
            padding: 10px 0;
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            text-align: right;
            border-bottom: 1px dashed #f1f5f9;
          }
          .details-row:last-child .details-label,
          .details-row:last-child .details-val {
            border-bottom: none;
          }
          .status-badge {
            display: inline-block;
            background-color: ${statusBg};
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
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
            <h1>DIGITAL ATTENDANCE SYSTEM</h1>
            <p>Enterprise Attendance & Workforce Management</p>
          </div>
          <div class="content">
            <p class="welcome">Hello ${employeeName},</p>
            
            <p class="message-body">
              Your attendance summary for ${formattedDate} has been successfully recorded. Please review your daily work shift details below.
            </p>

            <div class="details-card">
              <div class="details-title">ATTENDANCE AUDIT CARD</div>
              <div class="details-grid">
                <div class="details-row">
                  <div class="details-label">Employee ID</div>
                  <div class="details-val">${employeeId}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Date</div>
                  <div class="details-val">${formattedDate}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Check-In Time</div>
                  <div class="details-val">${formattedCheckIn}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Check-Out Time</div>
                  <div class="details-val">${formattedCheckOut}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Total Working Hours</div>
                  <div class="details-val">${formattedHours}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Attendance Status</div>
                  <div class="details-val">
                    <span class="status-badge">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <p class="message-body">
              Thank you for your contribution and dedication towards Digital Attendance System. We appreciate your commitment and professionalism.
            </p>

            <div class="signature">
              Best Regards,<br>
              <span class="signature-title">Digital Attendance System</span><br>
              <a href="https://techsysservices.com" target="_blank" class="signature-link">techsysservices.com</a>
            </div>
          </div>
          <div class="footer">
            <p class="footer-brand">DIGITAL ATTENDANCE SYSTEM</p>
            <p>Confidentiality Notice: This is an automated email communication. Please do not reply to this email.</p>
            <p>&copy; 2026 TechSys Services. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Harmonized Status Colors matching our Web UI
  let statusBg = "#10b981"; // present
  let statusText = "#ffffff";
  let statusDesc = "Your attendance has been marked as Present for today. Thank you for your punctuality!";

  if (status.toLowerCase() === "late") {
    statusBg = "#f59e0b";
    statusDesc = "You checked in after the standard office hours and have been marked as Late.";
  } else if (status.toLowerCase() === "absent") {
    statusBg = "#f43f5e";
    statusDesc = "No check-in or attendance records were detected for your profile today. You have been marked as Absent.";
  } else if (status.toLowerCase() === "weekend" || status.toLowerCase() === "sunday") {
    statusBg = "#06b6d4";
    statusDesc = "Today is a scheduled weekend day. Attendance is not required.";
  } else if (status.toLowerCase() === "holiday") {
    statusBg = "#6366f1";
    statusDesc = messageOverride || "Today is an official company holiday. Rest and enjoy your day!";
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Digital Attendance System Update</title>
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
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #0f172a;
          padding: 32px;
          text-align: center;
          border-bottom: 4px solid #0ea5e9;
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
          margin: 4px 0 0 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }
        .content {
          padding: 32px;
        }
        .welcome {
          font-size: 18px;
          font-weight: 600;
          margin-top: 0;
          color: #0f172a;
        }
        .status-badge {
          display: inline-block;
          background-color: ${statusBg};
          color: ${statusText};
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 16px 0;
        }
        .description {
          font-size: 14px;
          line-height: 1.6;
          color: #64748b;
          margin-bottom: 24px;
        }
        .details-card {
          background-color: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #f1f5f9;
        }
        .details-title {
          font-size: 12px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
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
          width: 40%;
        }
        .details-val {
          display: table-cell;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          text-align: right;
        }
        .footer {
          background-color: #f1f5f9;
          padding: 24px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 4px 0;
        }
        .footer-brand {
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.05em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>DIGITAL ATTENDANCE SYSTEM</h1>
          <p>Enterprise Attendance & Notifications</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${employeeName},</p>
          <p class="description">Your daily attendance update from Digital Attendance System is ready. Please find the audit details for the recorded shifts below.</p>
          
          <div style="text-align: center;">
            <div class="status-badge">${status}</div>
          </div>
          
          <p class="description" style="text-align: center; font-style: italic;">
            "${statusDesc}"
          </p>

          <div class="details-card">
            <div class="details-title">Shift Audit Card</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Employee ID</div>
                <div class="details-val">${employeeId}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Date</div>
                <div class="details-val">${formattedDate}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Check-In</div>
                <div class="details-val">${checkIn ? new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Check-Out</div>
                <div class="details-val">${checkOut ? new Date(checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Working Hours</div>
                <div class="details-val">${hours !== null ? `${hours} hrs` : "—"}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="footer">
          <p class="footer-brand">TECHSYS SERVICES LLC</p>
          <p>Confidentiality Notice: This is an automated email communication. Do not reply to this address.</p>
          <p>&copy; 2026 TechSys Services. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Professional Branded Company Holiday Email Template
const createHolidayBrandedTemplate = (employeeName, holidayName, date) => {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Company Holiday Notification - Digital Attendance System</title>
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
          margin: 4px 0 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.25em;
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
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
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
          width: 40%;
          border-bottom: 1px dashed #f1f5f9;
        }
        .details-val {
          display: table-cell;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          text-align: right;
          border-bottom: 1px dashed #f1f5f9;
        }
        .details-row:last-child .details-label,
        .details-row:last-child .details-val {
          border-bottom: none;
        }
        .status-badge {
          display: inline-block;
          background-color: #3b82f6;
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
          <h1>DIGITAL ATTENDANCE SYSTEM</h1>
          <p>Official Holiday Notification</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${employeeName},</p>
          
          <p class="message-body">
            We are pleased to inform you that <strong>${formattedDate}</strong> has been officially declared as a company holiday on the occasion of <strong>${holidayName}</strong>.
          </p>
          
          <p class="message-body">
            We hope you enjoy the holiday and have a wonderful celebration with your family and loved ones.
          </p>

          <div class="details-card">
            <div class="details-title">Holiday Details</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Holiday Name</div>
                <div class="details-val">${holidayName}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Date</div>
                <div class="details-val">${formattedDate}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Status</div>
                <div class="details-val">
                  <span class="status-badge">Holiday</span>
                </div>
              </div>
            </div>
          </div>

          <p class="message-body">
            Thank you for being a valued part of Digital Attendance System.
          </p>

          <div class="signature">
            Best Regards,<br>
            <span class="signature-title">Digital Attendance System</span><br>
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

// Professional Branded Sunday Weekly Off Email Template
const createSundayWeeklyOffBrandedTemplate = (employeeName, date) => {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Off Notice - Digital Attendance System</title>
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
          margin: 4px 0 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.25em;
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
          color: #94a3b8;
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
          width: 40%;
          border-bottom: 1px dashed #f1f5f9;
        }
        .details-val {
          display: table-cell;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          text-align: right;
          border-bottom: 1px dashed #f1f5f9;
        }
        .details-row:last-child .details-label,
        .details-row:last-child .details-val {
          border-bottom: none;
        }
        .status-badge {
          display: inline-block;
          background-color: #3b82f6;
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
          <h1>DIGITAL ATTENDANCE SYSTEM</h1>
          <p>Enterprise Attendance & Workforce Management</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${employeeName},</p>
          
          <p class="message-body">
            We would like to inform you that tomorrow, <strong>${formattedDate}</strong>, will be observed as the official weekly off at Digital Attendance System.
          </p>
          
          <p class="message-body">
            We hope you enjoy a relaxing and refreshing weekend with your family and loved ones.
          </p>

          <div class="details-card">
            <div class="details-title">WEEKLY OFF NOTICE</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Weekly Off</div>
                <div class="details-val">Sunday</div>
              </div>
              <div class="details-row">
                <div class="details-label">Date</div>
                <div class="details-val">${formattedDate}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Status</div>
                <div class="details-val">
                  <span class="status-badge">Weekly Off</span>
                </div>
              </div>
            </div>
          </div>

          <p class="message-body">
            Thank you for your continued dedication and contribution towards Digital Attendance System.
          </p>

          <div class="signature">
            Best Regards,<br>
            <span class="signature-title">Digital Attendance System</span><br>
            <a href="https://techsysservices.com" target="_blank" class="signature-link">techsysservices.com</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-brand">DIGITAL ATTENDANCE SYSTEM</p>
          <p>Confidentiality Notice: This is an automated email communication. Please do not reply to this email.</p>
          <p>&copy; 2026 TechSys Services. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Professional Branded Welcome Onboarding Email Template
const createWelcomeBrandedTemplate = (employeeName, employeeId, department) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Digital Attendance System!</title>
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
          margin: 4px 0 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.25em;
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
          color: #94a3b8;
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
          width: 40%;
          border-bottom: 1px dashed #f1f5f9;
        }
        .details-val {
          display: table-cell;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          text-align: right;
          border-bottom: 1px dashed #f1f5f9;
        }
        .details-row:last-child .details-label,
        .details-row:last-child .details-val {
          border-bottom: none;
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
          <h1>DIGITAL ATTENDANCE SYSTEM</h1>
          <p>Enterprise Workforce Management</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${employeeName},</p>
          
          <p class="message-body">
            Welcome to Digital Attendance System!
          </p>
          
          <p class="message-body">
            We are delighted to have you as a part of our professional team. Your talent, dedication, and contribution are highly valued, and we look forward to achieving great success together.
          </p>

          <div class="details-card">
            <div class="details-title">EMPLOYEE DETAILS</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Employee Name</div>
                <div class="details-val">${employeeName}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Employee ID</div>
                <div class="details-val">${employeeId}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Department</div>
                <div class="details-val">${department || "—"}</div>
              </div>
            </div>
          </div>

          <p class="message-body">
            We wish you a successful and rewarding journey with Digital Attendance System.
          </p>

          <div class="signature">
            Best Regards,<br>
            <span class="signature-title">Digital Attendance System</span><br>
            <a href="https://techsysservices.com" target="_blank" class="signature-link">techsysservices.com</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-brand">DIGITAL ATTENDANCE SYSTEM</p>
          <p>Confidentiality Notice: This is an automated email communication. Please do not reply to this email.</p>
          <p>&copy; 2026 TechSys Services. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Professional Branded Monthly Attendance Report Email Template
const createMonthlyReportBrandedTemplate = (employeeName, employeeId, department, reportMonth, stats) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Attendance Report - Digital Attendance System</title>
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
          <h1>DIGITAL ATTENDANCE SYSTEM</h1>
          <p>Enterprise Attendance & Workforce Management</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${employeeName},</p>
          
          <p class="message-body">
            Your monthly attendance report for ${reportMonth} has been generated successfully. Please find the attendance summary below.
          </p>

          <div class="details-card">
            <div class="details-title">MONTHLY ATTENDANCE REPORT</div>
            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Employee Name</div>
                <div class="details-val">${employeeName}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Employee ID</div>
                <div class="details-val">${employeeId}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Department</div>
                <div class="details-val">${department || "General"}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Report Month</div>
                <div class="details-val">${reportMonth}</div>
              </div>
            </div>
            
            <hr class="divider">

            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Present Days</div>
                <div class="details-val" style="color: #10b981;">${String(stats.presentCount).padStart(2, '0')}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Absent Days</div>
                <div class="details-val" style="color: #ef4444;">${String(stats.absentCount).padStart(2, '0')}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Holiday Count</div>
                <div class="details-val" style="color: #3b82f6;">${String(stats.holidayCount).padStart(2, '0')}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Sunday Count</div>
                <div class="details-val" style="color: #8b5cf6;">${String(stats.sundayCount).padStart(2, '0')}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Half Days</div>
                <div class="details-val" style="color: #f97316;">${String(stats.halfDayCount).padStart(2, '0')}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Late Marks</div>
                <div class="details-val" style="color: #f59e0b;">${String(stats.lateCount).padStart(2, '0')}</div>
              </div>
              <div class="details-row" style="font-weight: bold; font-size: 14px;">
                <div class="details-label" style="padding-top: 14px; border-bottom: none;">Total Working Days</div>
                <div class="details-val" style="padding-top: 14px; border-bottom: none; color: #0f172a;">${stats.totalWorkingDays}</div>
              </div>
            </div>
          </div>

          <p class="message-body">
            Thank you for your dedication and contribution towards Digital Attendance System.
          </p>

          <div class="signature">
            Best Regards,<br>
            <span class="signature-title">Digital Attendance System</span><br>
            <a href="https://techsysservices.com" target="_blank" class="signature-link">techsysservices.com</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-brand">DIGITAL ATTENDANCE SYSTEM</p>
          <p>Confidentiality Notice: This is an automated email communication. Please do not reply to this email.</p>
          <p>&copy; 2026 TechSys Services. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// API: Sync local storage database to Server
app.post("/api/sync-database", (req, res) => {
  const { employees, records, holidays, tenantId } = req.body;
  if (!employees || !records) {
    return res.status(400).json({ success: false, error: "Missing payload data" });
  }

  const db = readDb();
  const id = tenantId ? tenantId.toString().toLowerCase() : "default";
  
  if (!db.tenants) {
    db.tenants = {};
  }
  
  db.tenants[id] = {
    employees,
    records,
    holidays: holidays || []
  };
  
  // For backward compatibility, also write to the root of db if it is default
  if (id === "default") {
    db.employees = employees;
    db.records = records;
    if (holidays) db.holidays = holidays;
  }
  
  writeDb(db);

  console.log(`[Mail Server] Database synchronized successfully for tenant [${id}]: ${employees.length} employees, ${records.length} records, ${(holidays || []).length} holidays.`);
  res.json({ success: true, message: `Database synchronized on server for tenant ${id}.` });
});

// API: Send branded email for an employee
app.post("/api/send-email", async (req, res) => {
  const { employee, date, status, holidayName, checkIn, checkOut, hours, subjectOverride, messageOverride } = req.body;
  if (!employee || !date || !status) {
    return res.status(400).json({ success: false, error: "Missing required parameters" });
  }

  if (!employee.email) {
    return res.status(400).json({ success: false, error: `Employee ${employee.name} has no email configured.` });
  }

  // Server-Side Roster Migration Interceptor Guard:
  // Dynamically reroute any testing mail targeting the invalid email
  // shubhambhor1320@gmail.com to the active test inbox shubhambhormaster@gmail.com
  let targetEmail = employee.email;
  if (targetEmail === "shubhambhor1320@gmail.com") {
    targetEmail = "shubhambhormaster@gmail.com";
  }

  try {
    let html;
    if (status.toLowerCase() === "holiday") {
      html = createHolidayBrandedTemplate(
        employee.name,
        holidayName || "Company Holiday",
        date
      );
    } else {
      html = createBrandedTemplate(
        employee.name,
        employee.employee_id,
        date,
        status,
        checkIn,
        checkOut,
        hours,
        subjectOverride,
        messageOverride
      );
    }

    const subject = subjectOverride || `[TechSys] Daily Shift Audit - ${status.toUpperCase()} - ${date}`;

    const info = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: targetEmail,
      subject: subject,
      html: html,
    });

    const previewUrl = null;

    // Log the transaction
    const db = readDb();
    const logEntry = {
      id: info.id || `nod_${Date.now()}`,
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: targetEmail,
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      previewUrl,
    };
    db.logs.unshift(logEntry);
    writeDb(db);

    console.log(`[Mail Server] Email sent to ${employee.name} via Resend!`);

    res.json({
      success: true,
      messageId: info.messageId,
      previewUrl,
    });
  } catch (error) {
    console.error("[Mail Server] Email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Send Monthly Attendance Report email for an employee
app.post("/api/send-monthly-report", async (req, res) => {
  const { employee, reportMonth, stats } = req.body;
  if (!employee || !reportMonth || !stats) {
    return res.status(400).json({ success: false, error: "Missing required parameters" });
  }

  if (!employee.email) {
    return res.status(400).json({ success: false, error: `Employee ${employee.name} has no email configured.` });
  }

  // Server-Side Roster Migration Interceptor Guard:
  // Dynamically reroute any testing mail targeting the invalid email
  // shubhambhor1320@gmail.com to the active test inbox shubhambhormaster@gmail.com
  let targetEmail = employee.email;
  if (targetEmail === "shubhambhor1320@gmail.com") {
    targetEmail = "shubhambhormaster@gmail.com";
  }

  try {
    const html = createMonthlyReportBrandedTemplate(
      employee.name,
      employee.employee_id,
      employee.department,
      reportMonth,
      stats
    );

    const subject = `[TechSys] Monthly Attendance Report - ${reportMonth}`;

    const info = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: targetEmail,
      subject: subject,
      html: html,
    });

    const previewUrl = null;

    // Log the transaction
    const db = readDb();
    const logEntry = {
      id: info.id || `nod_${Date.now()}`,
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: targetEmail,
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      previewUrl,
    };
    db.logs.unshift(logEntry);
    writeDb(db);

    console.log(`[Mail Server] Monthly report email sent to ${employee.name} via Resend!`);

    res.json({
      success: true,
      messageId: info.messageId,
      previewUrl,
    });
  } catch (error) {
    console.error("[Mail Server] Monthly report email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Fetch sent email logs from server
app.get("/api/emails", (req, res) => {
  const db = readDb();
  res.json(db.logs || []);
});

// API: Clear email logs from server
app.delete("/api/emails", (req, res) => {
  const db = readDb();
  db.logs = [];
  writeDb(db);
  res.json({ success: true, message: "Logs cleared on server." });
});

// API: Send Date-wise automatic attendance notifications
app.get("/api/send-date-notifications", async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, error: "Date parameter is required (YYYY-MM-DD)" });
  }

  const db = readDb();
  const dateStr = date.toString();
  const dayOfWeek = new Date(dateStr).getDay();
  
  // Find holiday
  const holiday = db.records.find(r => r.date === dateStr && r.status === "holiday");

  console.log(`[Mail Server] Running automated date-wise notifications for: ${dateStr}`);
  
  const results = [];
  let successCount = 0;

  for (const emp of db.employees) {
    // Look up attendance record
    const rec = db.records.find(r => r.employee_id === emp.employee_id && r.date === dateStr);
    
    let status = rec?.status || "absent";
    if (dayOfWeek === 0) status = "weekend";

    // Skip if employee doesn't have an email
    if (!emp.email) continue;

    try {
      let html;
      if (status.toLowerCase() === "holiday") {
        html = createHolidayBrandedTemplate(
          emp.name,
          holiday?.name || "Company Holiday",
          dateStr
        );
      } else {
        html = createBrandedTemplate(
          emp.name,
          emp.employee_id,
          dateStr,
          status,
          rec?.check_in || null,
          rec?.check_out || null,
          rec?.working_hours ?? null
        );
      }

      const subject = `[TechSys] Shift Audit Notification - ${status.toUpperCase()} - ${dateStr}`;

      const info = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: emp.email,
        subject: subject,
        html: html,
      });

      const previewUrl = null;

      // Log transaction
      const logEntry = {
        id: info.id || `nod_${Date.now()}`,
        employee_id: emp.employee_id,
        employee_name: emp.name,
        to: emp.email,
        subject: subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        previewUrl,
      };
      
      const latestDb = readDb();
      latestDb.logs.unshift(logEntry);
      writeDb(latestDb);

      successCount++;
      results.push({
        employee_id: emp.employee_id,
        name: emp.name,
        status: "success",
        previewUrl,
      });
    } catch (err) {
      console.error(`[Mail Server] Failed sending to ${emp.name}:`, err);
      results.push({
        employee_id: emp.employee_id,
        name: emp.name,
        status: "failed",
        error: err.message,
      });
    }
  }

  res.json({
    success: true,
    date: dateStr,
    total_processed: db.employees.length,
    sent_successfully: successCount,
    details: results,
  });
});

// API: Trigger Sunday Weekly Off Notifications manually or individually
app.post("/api/send-sunday-off", async (req, res) => {
  const { employee, date } = req.body;
  if (!employee || !date) {
    return res.status(400).json({ success: false, error: "Missing required parameters" });
  }

  if (!employee.email) {
    return res.status(400).json({ success: false, error: `Employee ${employee.name} has no email configured.` });
  }

  // Server-Side Roster Migration Interceptor Guard:
  let targetEmail = employee.email;
  if (targetEmail === "shubhambhor1320@gmail.com") {
    targetEmail = "shubhambhormaster@gmail.com";
  }

  try {
    const html = createSundayWeeklyOffBrandedTemplate(employee.name, date);
    const subject = `[TechSys] Sunday Weekly Off Notice - ${new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`;

    const info = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: targetEmail,
      subject: subject,
      html: html,
    });

    const previewUrl = null;

    // Log the transaction
    const db = readDb();
    const logEntry = {
      id: info.id || `nod_${Date.now()}`,
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: targetEmail,
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      previewUrl,
    };
    db.logs.unshift(logEntry);
    writeDb(db);

    console.log(`[Mail Server] Sunday off sent to ${employee.name} via Resend!`);
    res.json({ success: true, previewUrl });
  } catch (error) {
    console.error("[Mail Server] Email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Send Welcome Email for a newly registered employee
app.post("/api/send-welcome", async (req, res) => {
  const { employee } = req.body;
  if (!employee) {
    return res.status(400).json({ success: false, error: "Missing required employee data" });
  }

  if (!employee.email) {
    return res.status(400).json({ success: false, error: `Employee ${employee.name} has no email configured.` });
  }

  // Server-Side Roster Migration Interceptor Guard:
  let targetEmail = employee.email;
  if (targetEmail === "shubhambhor1320@gmail.com") {
    targetEmail = "shubhambhormaster@gmail.com";
  }

  try {
    const html = createWelcomeBrandedTemplate(employee.name, employee.employee_id, employee.department);
    const subject = `Welcome to TechSys Services!`;

    const info = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: targetEmail,
      subject: subject,
      html: html,
    });

    const previewUrl = null;

    // Log the transaction
    const db = readDb();
    const logEntry = {
      id: info.id || `nod_${Date.now()}`,
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: targetEmail,
      subject: subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      previewUrl,
    };
    db.logs.unshift(logEntry);
    writeDb(db);

    console.log(`[Mail Server] Welcome email sent to ${employee.name} via Resend!`);
    res.json({ success: true, previewUrl });
  } catch (error) {
    console.error("[Mail Server] Email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scheduler to automatically dispatch Sunday Weekly Off emails on Saturdays at 6:00 PM (18:00)
const startSundayWeeklyOffScheduler = () => {
  console.log("[Scheduler] Initializing Sunday Weekly Off Auto-Dispatcher...");
  
  setInterval(async () => {
    try {
      const now = new Date();
      // 6 is Saturday
      if (now.getDay() === 6 && now.getHours() === 18) {
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        
        const db = readDb();
        const tomorrowFormatted = new Date(tomorrowStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
        const alreadySent = db.logs.some(log => 
          log.subject.includes("[TechSys] Sunday Weekly Off Notice") && 
          log.subject.includes(tomorrowFormatted)
        );

        if (!alreadySent) {
          console.log(`[Scheduler] Auto-Triggering Sunday Weekly Off notifications for ${tomorrowStr}...`);
          
          const employees = db.employees || [];
          for (const employee of employees) {
            if (!employee.email) continue;
            
            let targetEmail = employee.email;
            if (targetEmail === "shubhambhor1320@gmail.com") {
              targetEmail = "shubhambhormaster@gmail.com";
            }

            try {
              const html = createSundayWeeklyOffBrandedTemplate(employee.name, tomorrowStr);
              const subject = `[TechSys] Sunday Weekly Off Notice - ${new Date(tomorrowStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`;

              const info = await resend.emails.send({
                from: "onboarding@resend.dev",
                to: targetEmail,
                subject: subject,
                html: html,
              });

              const previewUrl = null;
              const logEntry = {
                id: info.id || `nod_${Date.now()}`,
                employee_id: employee.employee_id,
                employee_name: employee.name,
                to: targetEmail,
                subject: subject,
                status: "sent",
                sent_at: new Date().toISOString(),
                previewUrl,
              };
              db.logs.unshift(logEntry);
            } catch (err) {
              console.error(`[Scheduler] Failed sending to ${employee.name}:`, err);
            }
          }
          writeDb(db);
          console.log("[Scheduler] Sunday Weekly Off Auto-Dispatcher successfully completed.");
        }
      }
    } catch (e) {
      console.error("[Scheduler] Error in Sunday Weekly Off Scheduler:", e);
    }
  }, 1000 * 60 * 60); // Check once an hour
};

// Start scheduler on startup
startSundayWeeklyOffScheduler();

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`📡 TechSys Attendance Server Active on Port ${PORT}`);
  console.log(`🌐 API Service: http://localhost:${PORT}`);
  console.log(`📧 Send Date-wise: http://localhost:${PORT}/api/send-date-notifications?date=2026-05-18`);
  console.log(`======================================================\n`);
});
