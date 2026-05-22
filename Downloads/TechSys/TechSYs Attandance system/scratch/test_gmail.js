import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "techsysservices9294@gmail.com",
    pass: "krpyedyjyshzlltv",
  },
});

console.log("Sending test email using Gmail SMTP...");

transporter.sendMail({
  from: '"TechSys Services Live Mailer" <techsysservices9294@gmail.com>',
  to: "shubhambhormaster@gmail.com",
  subject: "TechSys SMTP Live Connection Success!",
  text: "Hello! This email confirms that your Google App Password for techsysservices9294@gmail.com is 100% correct and live emails are active!",
  html: "<h3>Hello!</h3><p>This email confirms that your Google App Password for <b>techsysservices9294@gmail.com</b> is 100% correct and live emails are active!</p>",
})
.then(info => {
  console.log("Email sent successfully!");
  console.log("Message ID:", info.messageId);
})
.catch(err => {
  console.error("Failed to send email:", err);
});
