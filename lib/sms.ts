// This is a mock implementation for SMS sending
// In a real application, you would use a service like Twilio, Nexmo, etc.

interface SMSOptions {
  to: string
  message: string
}

export async function sendSMS(options: SMSOptions): Promise<void> {
  // In development, log the SMS instead of sending it
  if (process.env.NODE_ENV === "development") {
    // console.log("SMS sent:", {
    //   to: options.to,
    //   message: options.message,
    // })
    return
  }

  // In production, you would use an SMS service
  // Example with Twilio:
  // const twilio = require('twilio');
  // const client = twilio(
  //   process.env.TWILIO_ACCOUNT_SID,
  //   process.env.TWILIO_AUTH_TOKEN
  // );
  // await client.messages.create({
  //   body: options.message,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: options.to,
  // });

  // For now, just simulate a delay
  await new Promise((resolve) => setTimeout(resolve, 500))
}

