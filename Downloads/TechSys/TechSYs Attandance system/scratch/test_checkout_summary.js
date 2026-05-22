console.log("Testing live Daily Attendance Summary shift checkout dispatch...");

const employee = {
  employee_id: "TS02",
  name: "Kalyani",
  email: "shubhambhormaster@gmail.com",
};

// 9 Hours and 22 Minutes equals exactly 9.3666 hours
const hours = 9.3666; 

fetch("http://localhost:3001/api/send-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    employee,
    date: "2026-05-19",
    status: "present",
    checkIn: "2026-05-19T09:12:00.000Z",
    checkOut: "2026-05-19T18:34:00.000Z",
    hours: hours,
  }),
})
.then(async res => {
  const data = await res.json();
  if (res.ok) {
    console.log("Success! Daily Attendance Summary email sent successfully.");
    console.log("Transaction Info:", data);
  } else {
    console.error("Failed to send email:", data);
  }
})
.catch(err => {
  console.error("Network Error:", err);
});
