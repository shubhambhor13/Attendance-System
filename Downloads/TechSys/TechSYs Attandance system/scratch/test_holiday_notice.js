console.log("Testing live Holiday Email dispatch...");

const employee = {
  employee_id: "TS01",
  name: "Kalyani",
  email: "shubhambhormaster@gmail.com",
};

fetch("http://localhost:3001/api/send-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    employee,
    date: "2026-05-19",
    status: "holiday",
    holidayName: "Diwali",
  }),
})
.then(async res => {
  const data = await res.json();
  if (res.ok) {
    console.log("Success! Holiday email sent successfully.");
    console.log("Transaction Info:", data);
  } else {
    console.error("Failed to send email:", data);
  }
})
.catch(err => {
  console.error("Network Error:", err);
});
