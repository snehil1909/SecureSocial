import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const transporter = nodemailer.createTransport({
    service: "gmail", // Use your email service provider
    auth: {
      user: "snehil22503@iiitd.ac.in", // Replace with your email
      pass: "gyzm xmwg sihy yxyt ", // Replace with your email password or app-specific password
    },
  });

  await transporter.sendMail({
    from: "snehil22503@iiitd.ac.in", // Replace with your email
    to,
    subject,
    text,
  });
}