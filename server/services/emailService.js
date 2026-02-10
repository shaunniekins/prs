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

    // console.log("✅ Email sent: %s", info.messageId);

    // If using Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    // if (previewUrl) {
    //   console.log("📬 Preview URL: %s", previewUrl);
    //   console.log("   (Click the URL above to view the sent email)");
    // }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    // console.error("❌ Error sending email:", error.message);
    throw new Error(`Failed to send account creation email: ${error.message}`);
  }
}

/**
 * Generate appointment reminder email template
 */
function generateAppointmentReminderEmailTemplate(appointment) {
  const patient = appointment.Patients || {};
  const staff = appointment.Staff || {};
  const patientName =
    `${patient.FirstName || ""} ${patient.Surname || ""}`.trim() || "Patient";
  const staffName = staff.FirstName
    ? `${staff.FirstName} ${staff.Surname || ""}`.trim()
    : null;
  const specialization = staff.Specialization || null;

  const dateTime = new Date(appointment.DateTime).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const endDateTime = appointment.EndDateTime
    ? new Date(appointment.EndDateTime).toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const status = appointment.Status || "Pending";
  const reason = appointment.Reason || "General Check-up";
  const notes = appointment.Notes || null;
  const appointmentId = appointment.AppointmentID;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Reminder</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; }
        .container { background-color: white; margin: 20px; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 15px; margin-bottom: 25px; }
        .header h2 { color: #007bff; margin: 0; }
        .header .logo { font-size: 20px; font-weight: bold; color: #007bff; margin-bottom: 5px; }
        .greeting { font-size: 16px; margin-bottom: 15px; }
        .details-box { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; margin-bottom: 12px; padding: 8px 10px; background-color: white; border-radius: 5px; border-left: 4px solid #007bff; }
        .detail-label { font-weight: bold; color: #495057; min-width: 140px; font-size: 14px; }
        .detail-value { color: #212529; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; }
        .status-confirmed { background-color: #d4edda; color: #155724; }
        .status-pending { background-color: #fff3cd; color: #856404; }
        .status-default { background-color: #e2e3e5; color: #383d41; }
        .notes-box { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 12px 15px; margin: 15px 0; font-size: 14px; }
        .reminder-note { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 12px 15px; margin: 20px 0; color: #0c5460; }
        .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏥 Baan KM-3 Health Center</div>
            <h2>Appointment Reminder</h2>
        </div>

        <div class="greeting">
            <p>Dear <strong>${patientName}</strong>,</p>
            <p>This is a friendly reminder about your upcoming appointment <strong>tomorrow</strong> at Baan KM-3 Health Center.</p>
        </div>

        <div class="details-box">
            <h3 style="margin-top: 0; color: #007bff;">📋 Appointment Details</h3>

            <div class="detail-row">
                <span class="detail-label">Appointment ID:</span>
                <span class="detail-value">#${appointmentId}</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Date & Time:</span>
                <span class="detail-value">${dateTime}${endDateTime ? " - " + endDateTime : ""}</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                    <span class="status-badge ${status.toLowerCase() === "confirmed" ? "status-confirmed" : status.toLowerCase() === "pending" ? "status-pending" : "status-default"}">${status}</span>
                </span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Reason / Purpose:</span>
                <span class="detail-value">${reason}</span>
            </div>

            ${
              staffName
                ? `<div class="detail-row">
                <span class="detail-label">Attending Staff:</span>
                <span class="detail-value">${staffName}${specialization ? " (" + specialization + ")" : ""}</span>
            </div>`
                : ""
            }
        </div>

        ${notes ? `<div class="notes-box"><strong>📝 Additional Notes:</strong> ${notes}</div>` : ""}

        <div class="reminder-note">
            <strong>📌 Reminders:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Please arrive <strong>10 minutes early</strong> for registration.</li>
                <li>Bring any relevant medical documents or previous records.</li>
                <li>If you need to reschedule or cancel, please contact us as soon as possible or manage your appointment through our online portal.</li>
            </ul>
        </div>

        <p>Best regards,<br><strong>Baan KM-3 Health Center Team</strong></p>

        <div class="footer">
            <p><strong>Baan KM-3 Health Center Information System</strong></p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Send appointment reminder email
 * Data path: Appointment → Patients (via PatientID) → Users (via UserID) → Email
 */
export async function sendAppointmentReminderEmail(appointment) {
  try {
    const transporter = await createTransporter();

    // Extract email from the nested join:
    // Appointment.Patients (FK: PatientID) → Patients.Users (FK: Patients_UserID_fkey) → Email
    const patient = appointment.Patients;
    const email = patient?.Users?.Email;

    if (!email) {
      console.warn(
        `⚠️ No email found for patient ${patient?.FirstName || "Unknown"} ${patient?.Surname || ""} (PatientID: ${appointment.PatientID}). ` +
          `Check that the patient has a linked Users record with an Email.`,
      );
      return { success: false, message: "No email found for patient" };
    }

    const patientName =
      `${patient.FirstName || ""} ${patient.Surname || ""}`.trim() || "Patient";
    const staff = appointment.Staff;
    const staffName = staff?.FirstName
      ? `${staff.FirstName} ${staff.Surname || ""}`.trim()
      : "Staff";

    const appointmentDate = new Date(appointment.DateTime).toLocaleString(
      "en-US",
      {
        timeZone: "Asia/Manila",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const subject = `Appointment Reminder (#${appointment.AppointmentID}) - ${appointmentDate} - Baan KM-3 Health Center`;
    const htmlContent = generateAppointmentReminderEmailTemplate(appointment);
    const textContent = `Dear ${patientName},\n\nThis is a reminder for your appointment tomorrow at Baan KM-3 Health Center.\n\nAppointment ID: #${appointment.AppointmentID}\nDate & Time: ${appointmentDate}\nStatus: ${appointment.Status || "Pending"}\nReason: ${appointment.Reason || "General Check-up"}${staff?.FirstName ? "\nAttending Staff: " + staffName : ""}${appointment.Notes ? "\nNotes: " + appointment.Notes : ""}\n\nPlease arrive 10 minutes early. If you need to reschedule or cancel, please contact us.\n\nBest regards,\nBaan KM-3 Health Center Team`;

    const info = await transporter.sendMail({
      from: `"Baan KM-3 Health Center" <${process.env.SMTP_FROM || process.env.GMAIL_USER || "noreply@baankm3.com"}>`,
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(
      `✅ Reminder sent to ${email} for Appointment #${appointment.AppointmentID}: ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId, email };
  } catch (error) {
    console.error(
      `❌ Error sending reminder for Appointment #${appointment.AppointmentID}:`,
      error.message,
    );
    // Don't throw, just return failure so we can continue processing other reminders
    return { success: false, error: error.message };
  }
}

export default {
  sendAccountCreationEmail,
  sendAppointmentReminderEmail,
};
