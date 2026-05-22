import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env variables
const envPath = path.resolve(__dirname, "../.env");
const processEnv = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        processEnv[key] = val;
      }
    }
  });
}

console.log("Using SMTP User:", processEnv.SMTP_USER);
console.log("Using SMTP Host:", processEnv.SMTP_HOST);

const transporter = nodemailer.createTransport({
  host: processEnv.SMTP_HOST,
  port: parseInt(processEnv.SMTP_PORT || "587"),
  secure: processEnv.SMTP_SECURE === "true",
  auth: {
    user: processEnv.SMTP_USER,
    pass: processEnv.SMTP_PASS,
  },
});

const html = `
  <!DOCTYPE html>
  <html>
  <body>
    <h1>Sunday Weekly Off Notice - Test</h1>
    <p>Hello Kalyani,</p>
    <p>Tomorrow, Sunday, will be observed as the official weekly off at TechSys Services.</p>
  </body>
  </html>
`;

transporter.sendMail({
  from: '"TechSys Test" <notifications@techsys.services>',
  to: "shubhambhormaster@gmail.com",
  subject: "[TechSys] Sunday Weekly Off Notice Test",
  html: html
})
.then(info => {
  console.log("SUCCESS! Mail sent successfully:", info);
})
.catch(err => {
  console.error("FAILURE! NodeMailer failed to send mail:", err);
});
