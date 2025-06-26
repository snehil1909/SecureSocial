import { sendEmail } from "./lib/email";

async function testEmail() {
  try {
    await sendEmail({
      to: "snehil22503@iiitd.ac.in", // Replace with your email
      subject: "Test Email",
      text: "This is a test email from the OTP system.",
    });
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

testEmail();