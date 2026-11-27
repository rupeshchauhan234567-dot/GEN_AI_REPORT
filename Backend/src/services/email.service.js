
async function verifyEmailTransport() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing.");
  }

  if (!process.env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL is missing.");
  }

  return true;
}

async function sendOtpEmail({ email, otp, purpose }) {
  if (!email || !otp) {
    throw new Error("Email and OTP are required.");
  }

  await verifyEmailTransport();

  const isReset = purpose === "reset_password";

  const subject = isReset
    ? "Reset your Career Learning Hub password"
    : "Verify your Career Learning Hub account";

  const heading = isReset
    ? "Password reset request"
    : "Verify your email";

  const description = isReset
    ? "Use the following OTP to reset your password."
    : "Use the following OTP to verify your email address.";

  const safeOtp = String(otp).replace(/[&<>"']/g, "");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:32px;background:#f4f5f7;font-family:Arial,sans-serif;">
        <div style="max-width:520px;margin:auto;background:#ffffff;padding:32px;border-radius:16px;">
          <h2 style="color:#171717;margin-top:0;">${heading}</h2>
          <p style="color:#525252;line-height:1.6;">${description}</p>
          <div style="margin:28px 0;padding:18px;text-align:center;background:#f4f4f5;border-radius:12px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">
              ${safeOtp}
            </span>
          </div>
          <p style="color:#737373;font-size:14px;">
            This OTP expires in 10 minutes. Never share it with anyone.
          </p>
          <p style="color:#a1a1aa;font-size:12px;margin-top:28px;">
            Career Learning Hub
          </p>
        </div>
      </body>
    </html>
  `;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "Career Learning Hub",
        email: process.env.BREVO_SENDER_EMAIL
      },
      to: [{ email }],
      subject,
      textContent:
        `${heading}\n\n${description}\n\nYour OTP is ${safeOtp}.\n\nThis OTP expires in 10 minutes. Do not share it with anyone.`,
      htmlContent
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error("Brevo API Error:", response.status, errorText);

    throw new Error(
      `Email sending failed. Brevo returned status ${response.status}.`
    );
  }

  const result = await response.json();

  console.log("OTP email accepted by Brevo:", result.messageId);

  return true;
}

module.exports = {
  sendOtpEmail,
  verifyEmailTransport
};
