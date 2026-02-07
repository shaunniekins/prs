import nodemailer from "nodemailer";

/**
 * Generate professional HTML email template for account credentials
 */
function generateAccountCreationEmailTemplate(userData) {
  const { firstName, surname, username, email, accountType, role, password } =
    userData;

  const accountTypeDisplay = accountType === "patient" ? "Patient" : "Staff";
  const roleDisplay = role || accountTypeDisplay;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Baan KM-3 Health Center</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            margin: 20px;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .welcome-message {
            font-size: 18px;
            color: #495057;
            margin-bottom: 20px;
        }
        .credentials-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .credential-item {
            margin-bottom: 15px;
            padding: 10px;
            background-color: white;
            border-radius: 5px;
            border-left: 4px solid #007bff;
        }
        .credential-label {
            font-weight: bold;
            color: #495057;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .credential-value {
            font-family: 'Courier New', monospace;
            background-color: #e9ecef;
            padding: 8px 12px;
            border-radius: 4px;
            margin-top: 5px;
            word-break: break-all;
        }
        .important-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .important-note h4 {
            color: #856404;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 14px;
        }
        .login-button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
            opacity: 0.9;
        }
        .login-button:hover {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏥 Baan KM-3 Health Center</div>
            <h1>Welcome to Our System!</h1>
        </div>

        <div class="welcome-message">
            <p>Hello <strong>${firstName} ${surname}</strong>,</p>
            <p>Your account has been successfully created! You can now access our healthcare management system.</p>
        </div>

        <div class="credentials-box">
            <h3 style="margin-top: 0; color: #007bff;">Your Account Credentials</h3>

            <div class="credential-item">
                <div class="credential-label">Username</div>
                <div class="credential-value">${username}</div>
            </div>

            <div class="credential-item">
                <div class="credential-label">Email Address</div>
                <div class="credential-value">${email}</div>
            </div>

            <div class="credential-item">
                <div class="credential-label">Account Type</div>
                <div class="credential-value">${accountTypeDisplay}</div>
            </div>

            <div class="credential-item">
                <div class="credential-label">Role</div>
                <div class="credential-value">${roleDisplay}</div>
            </div>

            <div class="credential-item">
                <div class="credential-label">Temporary Password</div>
                <div class="credential-value">${password}</div>
            </div>
        </div>

        <div class="important-note">
            <h4>🔐 Security Notice</h4>
            <p><strong>Please change your password immediately after your first login.</strong> This temporary password is for initial access only.</p>
            <p>For security reasons, we recommend using a strong password.</p>
        </div>

        <div class="footer">
            <p><strong>Baan KM-3 Health Center Information System</strong></p>
            <p>If you have any questions or need assistance, please contact our support team.</p>
            <p style="font-size: 12px; margin-top: 10px;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Create a nodemailer transporter based on configuration
 */
const createTransporter = async () => {
  // 1. Production SMTP Configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 2. Gmail service (Simple Auth)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // 3. Fallback: Ethereal Email (Development / Test)
  // This creates a fake SMTP service with a preview URL
  console.log(
    "⚠️ No production email configured. Using Ethereal Email (Dev Mode)...",
  );
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (error) {
    console.error("Failed to create Ethereal account:", error);
    throw error;
  }
};

/**
 * Send account creation email
 */
export async function sendAccountCreationEmail(userData) {
  try {
    const transporter = await createTransporter();

    const { firstName, surname, username, email, accountType, role, password } =
      userData;

    const subject =
      "Welcome to Baan KM-3 Health Center - Your Account Credentials";
    const htmlContent = generateAccountCreationEmailTemplate(userData);
    const textContent = `
Hello ${firstName} ${surname},

Your account has been created successfully!

Username: ${username}
Email: ${email}
Account Type: ${accountType === "patient" ? "Patient" : "Staff"}
Role: ${role || (accountType === "patient" ? "Patient" : "Staff")}
Temporary Password: ${password}

Please change your password after first login.

Best regards,
Baan KM-3 Health Center Information System
    `.trim();

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"Baan KM-3 Health Center" <${process.env.SMTP_FROM || "noreply@baankm3.com"}>`, // sender address
      to: email, // list of receivers
      subject: subject, // Subject line
      text: textContent, // plain text body
      html: htmlContent, // html body
    });

    console.log("✅ Email sent: %s", info.messageId);

    // If using Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("📬 Preview URL: %s", previewUrl);
      console.log("   (Click the URL above to view the sent email)");
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw new Error(`Failed to send account creation email: ${error.message}`);
  }
}

/**
 * Generate appointment reminder email template
 */
function generateAppointmentReminderEmailTemplate(appointment) {
  const patientName = `${appointment.Patients.FirstName} ${appointment.Patients.Surname}`;
  const dateTime = new Date(appointment.DateTime).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Reminder</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .container { padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin-top: 20px; }
        .header { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Appointment Reminder</h2>
        </div>
        <p>Dear ${patientName},</p>
        <p>This is a friendly reminder about your upcoming appointment at <strong>Baan KM-3 Health Center</strong>.</p>
        
        <div class="details">
            <p><strong>Date & Time:</strong> ${dateTime}</p>
            <p><strong>Reason:</strong> ${appointment.Reason || "Check-up"}</p>
        </div>

        <p>Please arrive 10 minutes early. If you need to reschedule or cancel, please contact us immediately or manage your appointment through our online portal.</p>

        <p>Best regards,<br>Baan KM-3 Health Center Team</p>

        <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(appointment) {
  try {
    const transporter = await createTransporter();

    // Extract email from the nested Users object
    // Structure: appointment.Patients.Users.Email
    const email = appointment.Patients?.Users?.Email;

    if (!email) {
      console.warn(
        `⚠️ No email found for patient ${appointment.Patients?.FirstName} (ID: ${appointment.PatientID})`,
      );
      return { success: false, message: "No email found" };
    }

    const patientName = `${appointment.Patients.FirstName} ${appointment.Patients.Surname}`;
    const subject = "Appointment Reminder - Baan KM-3 Health Center";
    const htmlContent = generateAppointmentReminderEmailTemplate(appointment);
    const textContent = `Dear ${patientName}, This is a reminder for your appointment on ${new Date(appointment.DateTime).toLocaleString()}.`;

    const info = await transporter.sendMail({
      from: `"Baan KM-3 Health Center" <${process.env.SMTP_FROM || "noreply@baankm3.com"}>`,
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Reminder sent to ${email}: %s`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending reminder:", error.message);
    // Don't throw, just return failure so we can continue processing other reminders
    return { success: false, error: error.message };
  }
}

export default {
  sendAccountCreationEmail,
  sendAppointmentReminderEmail,
};
