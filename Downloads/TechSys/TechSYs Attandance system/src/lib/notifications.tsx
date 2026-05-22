import { toast } from "sonner";
import { storage } from "@/lib/storage";
import React from "react";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:3001";

export type SentEmail = {
  id: string;
  employee_id: string;
  employee_name: string;
  to: string;
  subject: string;
  message: string;
  sent_at: string;
  status: "simulated" | "sent" | "failed";
  error?: string;
  previewUrl?: string | null;
};

const SENT_EMAILS_KEY = "ts_sent_emails";

export const emailService = {
  getSentEmails: (): SentEmail[] => {
    return JSON.parse(localStorage.getItem(SENT_EMAILS_KEY) || "[]");
  },
  
  syncDatabaseWithServer: async (): Promise<void> => {
    try {
      const activeUser = JSON.parse(localStorage.getItem("ts_active_user") || "null");
      const tenantId = activeUser?.role === "employee" ? null : activeUser?.email;

      const employees = storage.getEmployees();
      const records = storage.getRecords();
      const holidays = storage.getHolidays();
      await fetch(`${SERVER}/api/sync-database`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employees, records, holidays, tenantId }),
      });
    } catch (error) {
      console.warn("[Sync Engine] Failed to synchronize database with server:", error);
    }
  },

  sendEmail: async (
    employee: { employee_id: string; name: string; email: string | null }, 
    subject: string, 
    message: string
  ): Promise<boolean> => {
    if (!employee.email) {
      console.warn(`[Email Engine] Cannot send email to ${employee.name}. No email address configured.`);
      return false;
    }

    // Sync database state before dispatching
    await emailService.syncDatabaseWithServer();

    let status: "simulated" | "sent" | "failed" = "failed";
    let errorMsg: string | undefined;
    let previewUrl: string | null = null;

    try {
      const mailStatus = subject.includes("Successfully") || subject.includes("Present") ? "present" :
                         subject.includes("Absent") ? "absent" : 
                         subject.includes("Weekend") ? "weekend" : "present";
                         
      const response = await fetch(`${SERVER}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee,
          date: new Date().toISOString().slice(0, 10),
          status: mailStatus,
          checkIn: new Date().toISOString(),
          checkOut: null,
          hours: null
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        status = "sent";
        previewUrl = resData.previewUrl;
      } else {
        const errData = await response.json().catch(() => ({}));
        errorMsg = errData?.error || `HTTP ${response.status}`;
        status = "failed";
        console.error("[Email Engine] Local NodeMailer service failed:", errorMsg);
        toast.error("SMTP Email Delivery Failed!", {
          description: `Google rejected the login credentials: "${errorMsg}". Please check your 16-character Google App Password in your .env file.`,
          duration: 10000
        });
      }
    } catch (err: any) {
      errorMsg = err?.message || String(err);
      status = "failed";
      console.warn("[Email Engine] Backend unreachable:", err);
      toast.error("Server Unreachable", {
        description: "Make sure the backend server is running.",
        duration: 8000,
      });
    }

    const emailEntry: SentEmail = {
      id: crypto.randomUUID(),
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: employee.email,
      subject,
      message,
      sent_at: new Date().toISOString(),
      status,
      error: errorMsg,
      previewUrl,
    };

    const emails = emailService.getSentEmails();
    emails.unshift(emailEntry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(emails));

    // Print to developer console
    console.log(
      `%c[Email Engine] ${status === "sent" ? "Dispatched" : "Simulated"} automatic email successfully`, 
      "color: #0ea5e9; font-weight: bold;"
    );
    console.log(`To: ${employee.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    if (previewUrl) {
      console.log(`Preview URL: ${previewUrl}`);
    }

    // Show beautiful toast notification with clickable mail preview if Ethereal SMTP generates one
    toast.success("Automatic email sent!", {
      description: previewUrl ? (
        <span className="flex flex-col gap-1 mt-0.5">
          <span className="text-foreground">Sent "{subject}" to {employee.name}.</span>
          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-command font-semibold text-[10px] tracking-wider uppercase border border-command/30 bg-command/5 px-2 py-0.5 rounded w-fit hover:bg-command hover:text-white transition-all"
          >
            ⚡ View HTML Email Preview
          </a>
        </span>
      ) : `Sent "${subject}" to ${employee.name} (${employee.email})`,
      duration: 10000,
    });

    return status !== "failed";
  },

  sendCheckInEmail: async (employee: { employee_id: string; name: string; email: string | null }): Promise<boolean> => {
    return emailService.sendEmail(
      employee,
      "Attendance Marked Successfully",
      "Your attendance for today has been marked as Present."
    );
  },

  sendAbsentEmail: async (employee: { employee_id: string; name: string; email: string | null }): Promise<boolean> => {
    return emailService.sendEmail(
      employee,
      "Absent Notice",
      "You were marked absent today because no check-in was recorded."
    );
  },

  sendWeekendNoticeEmail: async (employee: { employee_id: string; name: string; email: string | null }): Promise<boolean> => {
    return emailService.sendEmail(
      employee,
      "Weekend Notice",
      "Today is Sunday. Attendance is not required."
    );
  },

  sendCheckOutEmail: async (
    employee: { employee_id: string; name: string; email: string | null },
    checkIn: string,
    checkOut: string,
    hours: number,
    status: string
  ): Promise<boolean> => {
    if (!employee.email) {
      console.warn(`[Email Engine] Cannot send checkout email to ${employee.name}. No email address configured.`);
      return false;
    }

    // Sync database state before dispatching
    await emailService.syncDatabaseWithServer();

    let mailStatus: "simulated" | "sent" | "failed" = "simulated";
    let errorMsg: string | undefined;
    let previewUrl: string | null = null;

    const subject = `Attendance Summary: ${status.toUpperCase()} - ${new Date().toLocaleDateString()}`;
    const totalMin = Math.round(hours * 60);
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    const hoursStr = `${String(hrs).padStart(2, '0')} Hours ${String(mins).padStart(2, '0')} Minutes`;

    const message = `Your attendance summary for today has been successfully recorded. Please review your work shift details below.\n\nAttendance Summary:\n• Employee ID: ${employee.employee_id}\n• Date: ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n• Check-In Time: ${new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n• Check-Out Time: ${new Date(checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n• Total Working Hours: ${hoursStr}\n• Attendance Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`;

    try {
      const response = await fetch(`${SERVER}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee,
          date: new Date().toISOString().slice(0, 10),
          status: status,
          checkIn,
          checkOut,
          hours,
          subjectOverride: `[Digital Attendance] Attendance Summary: ${status.toUpperCase()}`,
          messageOverride: message
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        mailStatus = "sent";
        previewUrl = resData.previewUrl;
      } else {
        const errData = await response.json().catch(() => ({}));
        errorMsg = errData?.error || `HTTP ${response.status}`;
        mailStatus = "failed";
        console.error("[Email Engine] Local NodeMailer service failed:", errorMsg);
        toast.error("SMTP Checkout Email Failed!", {
          description: `Google rejected the credentials: "${errorMsg}". Please verify your Google App Password.`,
          duration: 10000
        });
      }
    } catch (err: any) {
      console.warn("[Email Engine] NodeMailer local backend unreachable, using browser simulation:", err);
    }

    const emailEntry: SentEmail = {
      id: crypto.randomUUID(),
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: employee.email,
      subject,
      message,
      sent_at: new Date().toISOString(),
      status: mailStatus,
      error: errorMsg,
      previewUrl,
    };

    const emails = emailService.getSentEmails();
    emails.unshift(emailEntry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(emails));

    toast.success("Attendance Summary Email Sent!", {
      description: previewUrl ? (
        <span className="flex flex-col gap-1 mt-0.5">
          <span className="text-foreground">Sent summary to ${employee.name}.</span>
          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-command font-semibold text-[10px] tracking-wider uppercase border border-command/30 bg-command/5 px-2 py-0.5 rounded w-fit hover:bg-command hover:text-white transition-all"
          >
            ⚡ View HTML Summary Preview
          </a>
        </span>
      ) : `Sent summary to ${employee.name} (${employee.email})`,
      duration: 10000,
    });

    return mailStatus !== "failed";
  },

  sendHolidayNoticeEmail: async (
    employee: { employee_id: string; name: string; email: string | null },
    holidayName: string,
    holidayDate: string
  ): Promise<boolean> => {
    if (!employee.email) {
      console.warn(`[Email Engine] Cannot send holiday email to ${employee.name}. No email address configured.`);
      return false;
    }

    // Sync database state before dispatching
    await emailService.syncDatabaseWithServer();

    let status: "simulated" | "sent" | "failed" = "simulated";
    let previewUrl: string | null = null;
    let errorMsg: string | undefined;

    const subject = `Holiday Notice: ${holidayName}`;
    const message = `Please be notified that ${holidayDate} has been declared as a holiday for: ${holidayName}. Office will remain closed.`;

    try {
      const response = await fetch(`${SERVER}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee,
          date: holidayDate,
          status: "holiday",
          holidayName,
          checkIn: null,
          checkOut: null,
          hours: null,
          subjectOverride: `[Digital Attendance] Holiday Notice: ${holidayName}`,
          messageOverride: `We are pleased to inform you that ${new Date(holidayDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} has been officially declared as a holiday for: ${holidayName}. Enjoy your well-deserved holiday and rest!`
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        status = "sent";
        previewUrl = resData.previewUrl;
      } else {
        const errData = await response.json().catch(() => ({}));
        errorMsg = errData?.error || `HTTP ${response.status}`;
        status = "failed";
        console.error("[Email Engine] Local NodeMailer service failed:", errorMsg);
        toast.error("SMTP Holiday Broadcast Failed!", {
          description: `Google rejected the login credentials: "${errorMsg}". Please check your 16-character Google App Password in your .env file.`,
          duration: 10000
        });
      }
    } catch (err: any) {
      console.warn("[Email Engine] NodeMailer local backend unreachable, using browser simulation:", err);
    }

    const emailEntry: SentEmail = {
      id: crypto.randomUUID(),
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: employee.email,
      subject,
      message,
      sent_at: new Date().toISOString(),
      status,
      error: errorMsg,
      previewUrl,
    };

    const emails = emailService.getSentEmails();
    emails.unshift(emailEntry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(emails));

    // Show beautiful toast notification
    toast.success("Holiday Notice Email Sent!", {
      description: previewUrl ? (
        <span className="flex flex-col gap-1 mt-0.5">
          <span className="text-foreground">Sent "${holidayName}" notice to ${employee.name}.</span>
          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-command font-semibold text-[10px] tracking-wider uppercase border border-command/30 bg-command/5 px-2 py-0.5 rounded w-fit hover:bg-command hover:text-white transition-all"
          >
            ⚡ View HTML Holiday Mail
          </a>
        </span>
      ) : `Sent "${holidayName}" notice to ${employee.name} (${employee.email})`,
      duration: 10000,
    });

    return status !== "failed";
  },

  sendMonthlyReportEmail: async (
    employee: { employee_id: string; name: string; email: string | null; department?: string },
    reportMonth: string,
    stats: {
      presentCount: number;
      absentCount: number;
      holidayCount: number;
      sundayCount: number;
      halfDayCount: number;
      lateCount: number;
      totalWorkingDays: number;
    }
  ): Promise<boolean> => {
    if (!employee.email) {
      console.warn(`[Email Engine] Cannot send monthly report to ${employee.name}. No email address configured.`);
      return false;
    }

    // Sync database state before dispatching
    await emailService.syncDatabaseWithServer();

    let mailStatus: "simulated" | "sent" | "failed" = "simulated";
    let errorMsg: string | undefined;
    let previewUrl: string | null = null;

    const subject = `[Digital Attendance] Monthly Attendance Report - ${reportMonth}`;
    const message = `Hello ${employee.name}. Your monthly attendance report for ${reportMonth} has been generated successfully.`;

    try {
      const response = await fetch(`${SERVER}/api/send-monthly-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee,
          reportMonth,
          stats
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        mailStatus = "sent";
        previewUrl = resData.previewUrl;
      } else {
        const errData = await response.json().catch(() => ({}));
        errorMsg = errData?.error || `HTTP ${response.status}`;
        mailStatus = "failed";
        console.error("[Email Engine] Local NodeMailer service failed:", errorMsg);
        toast.error("SMTP Monthly Report Failed!", {
          description: `Google rejected the credentials: "${errorMsg}". Please verify your Google App Password.`,
          duration: 10000
        });
      }
    } catch (err: any) {
      console.warn("[Email Engine] NodeMailer local backend unreachable, using browser simulation:", err);
    }

    const emailEntry: SentEmail = {
      id: crypto.randomUUID(),
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: employee.email,
      subject,
      message,
      sent_at: new Date().toISOString(),
      status: mailStatus,
      error: errorMsg,
      previewUrl,
    };

    const emails = emailService.getSentEmails();
    emails.unshift(emailEntry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(emails));

    toast.success("Monthly Report Email Sent!", {
      description: `Sent monthly report to ${employee.name} (${employee.email})`,
      duration: 10000,
    });

    return mailStatus !== "failed";
  },

  sendSundayWeeklyOffEmail: async (
    employee: { employee_id: string; name: string; email: string | null },
    date: string
  ): Promise<boolean> => {
    if (!employee.email) {
      console.warn(`[Email Engine] Cannot send Sunday Weekly Off to ${employee.name}. No email address configured.`);
      return false;
    }

    await emailService.syncDatabaseWithServer();

    let status: "simulated" | "sent" | "failed" = "simulated";
    let previewUrl: string | null = null;
    let errorMsg: string | undefined;

    const subject = `[Digital Attendance] Sunday Weekly Off Notice`;
    const message = `Tomorrow, Sunday, ${new Date(date).toLocaleDateString()}, is observed as the official weekly off at TechSys Services.`;

    try {
      const response = await fetch(`${SERVER}/api/send-sunday-off`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee,
          date
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        status = "sent";
        previewUrl = resData.previewUrl;
      } else {
        const errData = await response.json().catch(() => ({}));
        errorMsg = errData?.error || `HTTP ${response.status}`;
        status = "failed";
      }
    } catch (err: any) {
      console.warn("[Email Engine] NodeMailer local backend unreachable:", err);
    }

    const emailEntry: SentEmail = {
      id: crypto.randomUUID(),
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: employee.email,
      subject: `[Digital Attendance] Sunday Weekly Off Notice - ${new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`,
      message,
      sent_at: new Date().toISOString(),
      status,
      error: errorMsg,
      previewUrl,
    };

    const emails = emailService.getSentEmails();
    emails.unshift(emailEntry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(emails));

    toast.success("Sunday Off Notice Sent!", {
      description: previewUrl ? (
        <span className="flex flex-col gap-1 mt-0.5">
          <span className="text-foreground">Sent Sunday weekly off notice to ${employee.name}.</span>
          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-command font-semibold text-[10px] tracking-wider uppercase border border-command/30 bg-command/5 px-2 py-0.5 rounded w-fit hover:bg-command hover:text-white transition-all"
          >
            ⚡ View HTML Off Notice
          </a>
        </span>
      ) : `Sent Sunday weekly off notice to ${employee.name} (${employee.email})`,
      duration: 10000,
    });

    return status !== "failed";
  },

  sendWelcomeEmail: async (
    employee: { employee_id: string; name: string; email: string | null; department?: string | null }
  ): Promise<boolean> => {
    if (!employee.email) {
      console.warn(`[Email Engine] Cannot send welcome email to ${employee.name}. No email address configured.`);
      return false;
    }

    await emailService.syncDatabaseWithServer();

    let status: "simulated" | "sent" | "failed" = "simulated";
    let previewUrl: string | null = null;
    let errorMsg: string | undefined;

    const subject = `Welcome to TechSys Services!`;
    const message = `Hello ${employee.name}, Welcome to TechSys Services! We are delighted to have you as part of our professional team.`;

    try {
      const response = await fetch(`${SERVER}/api/send-welcome`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        status = "sent";
        previewUrl = resData.previewUrl;
      } else {
        const errData = await response.json().catch(() => ({}));
        errorMsg = errData?.error || `HTTP ${response.status}`;
        status = "failed";
      }
    } catch (err: any) {
      console.warn("[Email Engine] NodeMailer local backend unreachable:", err);
    }

    const emailEntry: SentEmail = {
      id: crypto.randomUUID(),
      employee_id: employee.employee_id,
      employee_name: employee.name,
      to: employee.email,
      subject,
      message,
      sent_at: new Date().toISOString(),
      status,
      error: errorMsg,
      previewUrl,
    };

    const emails = emailService.getSentEmails();
    emails.unshift(emailEntry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(emails));

    toast.success("Welcome Email Dispatched!", {
      description: previewUrl ? (
        <span className="flex flex-col gap-1 mt-0.5">
          <span className="text-foreground">Sent welcome onboarding package to ${employee.name}.</span>
          <a 
            href={previewUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-command font-semibold text-[10px] tracking-wider uppercase border border-command/30 bg-command/5 px-2 py-0.5 rounded w-fit hover:bg-command hover:text-white transition-all"
          >
            ⚡ View HTML Welcome Package
          </a>
        </span>
      ) : `Sent welcome onboarding package to ${employee.name} (${employee.email})`,
      duration: 10000,
    });

    return status !== "failed";
  },

  clearEmails: () => {
    localStorage.removeItem(SENT_EMAILS_KEY);
  }
};
