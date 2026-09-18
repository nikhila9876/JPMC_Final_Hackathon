/**
 * Brevo Email Service for sending OTP verification emails
 * Uses Brevo Transactional Email API (v3/smtp/email)
 */

export const sendVerificationEmail = async ({ toEmail, toName, otp, expiryMinutes = 10 }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'MERN Auth System';
  const appName = process.env.APP_NAME || 'MERN Hackathon Auth';

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_brevo_api_key')) {
    console.error('⚠️ [Brevo Service] BREVO_API_KEY is missing or unconfigured in .env');
    throw new Error('Email verification service is not configured. Please set BREVO_API_KEY in backend/.env');
  }

  if (!senderEmail || senderEmail.trim() === '') {
    console.error('⚠️ [Brevo Service] BREVO_SENDER_EMAIL is missing in .env');
    throw new Error('Email verification service is not configured. Please set BREVO_SENDER_EMAIL in backend/.env');
  }

  const subject = 'Verify Your Email';

  const textContent = `Hello ${toName || 'User'},

Thank you for registering.

Your verification code is:

${otp}

This code will expire in ${expiryMinutes} minutes.

If you did not create this account, you can ignore this email.

Thanks,
${appName}`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 36px 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background: #eef2ff; color: #4f46e5; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; }
    h1 { font-size: 22px; color: #0f172a; margin: 12px 0 6px; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 8px 0; }
    .otp-box { margin: 28px 0; text-align: center; padding: 20px; background: #f1f5f9; border-radius: 10px; border: 2px dashed #cbd5e1; }
    .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace; }
    .otp-note { font-size: 13px; color: #64748b; margin-top: 8px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">${appName}</span>
      <h1>Verify Your Email</h1>
    </div>
    <p>Hello <strong>${toName || 'User'}</strong>,</p>
    <p>Thank you for registering. Please use the verification code below to verify your email address and activate your account:</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-note">Valid for ${expiryMinutes} minutes</div>
    </div>
    <p>If you did not create an account with ${appName}, you can safely ignore this email.</p>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail.trim(),
        },
        to: [
          {
            email: toEmail.trim(),
            name: toName ? toName.trim() : undefined,
          },
        ],
        subject,
        htmlContent,
        textContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Brevo API Error]', response.status, errorData.message || 'Brevo request failed');
      throw new Error(errorData.message || `Brevo request failed with status ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    return { success: true, messageId: data.messageId };
  } catch (error) {
    // Sanitize error to prevent leaking secrets in logs or responses
    console.error('❌ [EmailService Error]:', error.message);
    throw new Error('Failed to send verification email. Brevo service encountered an error.');
  }
};

export default { sendVerificationEmail };
