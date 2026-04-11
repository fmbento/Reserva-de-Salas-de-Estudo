import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import nodemailer from "nodemailer";
import * as ics from 'ics';
import http from "http";
import { translations, Language } from "./translations.js";
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`[AUTH] .env file loaded from ${envPath}`);
} else {
  console.warn(`[AUTH] .env file not found at ${envPath}`);
}

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.warn("[AUTH] Supabase URL or Service Role Key not set. Authentication will fail.");
} else {
  console.log("[AUTH] Supabase client initialized.");
}

const app = express();
const server = http.createServer(app);

app.use(express.json());

// --- Maps Configuration ---
let mapsConfig: Record<string, string> = {};

function loadMapsConfig() {
  const mapsPath = path.join(__dirname, 'data', 'maps.txt');
  if (fs.existsSync(mapsPath)) {
    try {
      const content = fs.readFileSync(mapsPath, 'utf-8');
      const lines = content.split('\n');
      const newConfig: Record<string, string> = {};
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;
        
        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex !== -1) {
          const key = trimmedLine.substring(0, colonIndex).trim();
          const url = trimmedLine.substring(colonIndex + 1).trim();
          if (key && url) {
            newConfig[key] = url;
          }
        }
      });
      mapsConfig = newConfig;
      console.log(`[MAPS] Loaded ${Object.keys(mapsConfig).length} map mappings from ${mapsPath}`);
    } catch (err) {
      console.error(`[MAPS] Error loading maps config:`, err);
    }
  } else {
    console.warn(`[MAPS] maps.txt not found at ${mapsPath}`);
  }
}

loadMapsConfig();

// Watch for changes in maps.txt
const mapsPath = path.join(__dirname, 'data', 'maps.txt');
if (fs.existsSync(mapsPath)) {
  fs.watch(mapsPath, (eventType) => {
    if (eventType === 'change') {
      console.log(`[MAPS] maps.txt changed, reloading...`);
      loadMapsConfig();
    }
  });
}

// --- Email configuration ---
const smtpPort = process.env.SMTP_PORT || '587';
console.log(`[AUTH] SMTP Config: Host=${process.env.SMTP_HOST || 'smtp.gmail.com'}, Port=${smtpPort}, User=${process.env.SMTP_USER ? 'Set' : 'Not Set'}, Pass=${process.env.SMTP_PASS ? 'Set' : 'Not Set'}`);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(smtpPort),
  secure: smtpPort === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

function formatReservationTime(startTime: string, durationMinutes: number, lang: Language = 'pt') {
  const [h, m] = startTime.split(':').map(Number);
  const startTotal = h * 60 + m;
  const endTotal = startTotal + durationMinutes;
  
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  
  let durationStr = '';
  const dh = Math.floor(durationMinutes / 60);
  const dm = durationMinutes % 60;
  
  if (dh > 0) {
    durationStr = `${dh}h${dm > 0 ? (dm < 10 ? '0' + dm : dm) : ''}`;
  } else {
    durationStr = `${dm}min`;
  }
  
  return `${startTime} - ${endTime} (${translations[lang].duration}: ${durationStr})`;
}

async function sendReservationPendingEmail(email: string, roomName: string, date: string, startTime: string, duration: number, lang: Language = 'pt') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const t = translations[lang];
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: t.emailReservationSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${t.emailReservationBody}</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${t.emailRoom}:</strong> ${roomName}</p>
            <p style="margin: 5px 0;"><strong>${t.emailDate}:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>${t.emailTime}:</strong> ${formatReservationTime(startTime, duration, lang)}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to send pending email to ${email}:`, error);
  }
}

async function sendReservationStatusEmail(email: string, roomName: string, res: any, status: string, lang: Language = 'pt') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const t = translations[lang];
  
  const isConfirmed = status === 'Confirmed' || status === 'Occupied';
  const subject = isConfirmed ? t.emailReservationSubject : `${t.emailReservationSubject} - ${lang === 'pt' ? 'CANCELADA' : 'CANCELLED'}`;
  
  let attachments: any[] = [];
  
  if (isConfirmed) {
    const [year, month, day] = res.date.split('-').map(Number);
    const [hour, minute] = res.startTime.split(':').map(Number);
    
    const event: ics.EventAttributes = {
      start: [year, month, day, hour, minute],
      duration: { minutes: res.duration },
      title: `Reserva SiReS: ${roomName}`,
      description: res.subject || 'Reserva de sala de estudo',
      location: `Universidade de Aveiro - ${roomName}`,
      url: 'https://sires.ua.pt',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'SiReS Bibliotecas UA', email: process.env.SMTP_USER || 'sbidm-biblioteca@ua.pt' }
    };
    
    ics.createEvent(event, (error, value) => {
      if (error) {
        console.error("ICS Error:", error);
        return;
      }
      attachments.push({
        filename: 'reserva.ics',
        content: value,
        contentType: 'text/calendar'
      });
    });
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${translations[lang].hello},</p>
          <p>${isConfirmed ? t.emailReservationApproved : t.emailReservationRejected}</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${t.emailRoom}:</strong> ${roomName}</p>
            <p style="margin: 5px 0;"><strong>${t.emailDate}:</strong> ${res.date}</p>
            <p style="margin: 5px 0;"><strong>${t.emailTime}:</strong> ${formatReservationTime(res.startTime, res.duration, lang)}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to send status email to ${email}:`, error);
  }
}

app.post("/api/emails/reservation-pending", async (req, res) => {
  const { email, roomName, date, startTime, duration, lang } = req.body;
  await sendReservationPendingEmail(email, roomName, date, startTime, duration, lang);
  res.status(200).json({ success: true });
});

app.post("/api/emails/reservation-status", async (req, res) => {
  const { email, roomName, reservation, status, lang } = req.body;
  await sendReservationStatusEmail(email, roomName, reservation, status, lang);
  res.status(200).json({ success: true });
});

// --- Cron Endpoint for Vercel ---
app.get("/api/cron/automated-tasks", async (req, res) => {
  // Secure the endpoint: if CRON_SECRET is set, verify the Bearer token
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[CRON] Unauthorized attempt to trigger automated tasks");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  console.log("[CRON] Starting automated tasks...");
  await checkAndSendAutomatedEmails();
  res.status(200).json({ success: true, message: "Automated tasks completed" });
});

// --- OTP Authentication ---
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, lang } = req.body;
  const t = translations[lang as Language];

  if (!email || (!email.endsWith('@ua.pt') && email !== 'filben@gmail.com')) {
    return res.status(400).json({ success: false, message: t.restrictedDomain });
  }

  const otp = Math.floor(10000 + Math.random() * 90000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  try {
    // Check if user exists and is not blocked
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: t.accountNotFound });
    }

    if (user.role === 'blocked') {
      return res.status(403).json({ success: false, message: t.userBlockedError });
    }

    console.log(`[AUTH] Attempting to store OTP for ${email} in Supabase`);
    // Store OTP in Supabase
    const { error } = await supabase
      .from('otps')
      .upsert({
        email,
        code: otp,
        expires_at: expiresAt
      }, { onConflict: 'email' });

    if (error) throw error;
    
    console.log(`[AUTH] OTP stored successfully for ${email}`);

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `SiReS: ${t.verifyOtp}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${t.otpSent}</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0; color: #0066cc;">${otp}</h1>
          </div>
          <p style="font-size: 12px; color: #999; text-align: center;">${t.expiredOtp} (5 min)</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[AUTH] Failed to send OTP:", error);
    res.status(500).json({ success: false, message: t.errorOccurred });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp, lang } = req.body;
  const t = translations[lang as Language];

  try {
    const { data: otpData, error: fetchError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !otpData) {
      return res.status(400).json({ success: false, message: t.incorrectOtp });
    }

    if (otpData.code !== otp) {
      return res.status(400).json({ success: false, message: t.incorrectOtp });
    }

    if (new Date() > new Date(otpData.expires_at)) {
      return res.status(400).json({ success: false, message: t.expiredOtp });
    }

    // Delete OTP after successful verification
    await supabase.from('otps').delete().eq('email', email);

    // In Supabase, we can use the email to identify the user
    // We'll return a simple success for now, or we could generate a JWT if needed
    // But since we're removing Firebase Auth, we'll just return success and the user info
    res.status(200).json({ success: true, email });
  } catch (error) {
    console.error("[AUTH] Failed to verify OTP:", error);
    res.status(500).json({ success: false, message: t.errorOccurred });
  }
});

app.get("/api/maps", (req, res) => {
  res.json(mapsConfig);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*all", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Export for Vercel
export default app;

async function sendReminderEmail(email: string, roomName: string, res: any, lang: Language = 'pt') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const t = translations[lang];
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: t.emailReminderSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${t.emailReminderTitle}</p>
          <p>${t.emailReminderBody.replace('{roomName}', roomName)}</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${t.emailRoom}:</strong> ${roomName}</p>
            <p style="margin: 5px 0;"><strong>${t.emailDate}:</strong> ${res.date}</p>
            <p style="margin: 5px 0;"><strong>${t.emailTime}:</strong> ${formatReservationTime(res.startTime, res.duration, lang)}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to send reminder email to ${email}:`, error);
  }
}

async function sendEndAlertEmail(email: string, roomName: string, res: any, lang: Language = 'pt') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const t = translations[lang];
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: t.emailEndAlertSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${t.emailEndAlertTitle}</p>
          <p>${t.emailEndAlertBody.replace('{roomName}', roomName)}</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${t.emailRoom}:</strong> ${roomName}</p>
            <p style="margin: 5px 0;"><strong>${t.emailDate}:</strong> ${res.date}</p>
            <p style="margin: 5px 0;"><strong>${t.emailTime}:</strong> ${formatReservationTime(res.startTime, res.duration, lang)}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to send end alert email to ${email}:`, error);
  }
}

// Track sent emails to avoid duplicates in memory (simple approach)
const sentReminders = new Set<string>();
const sentEndAlerts = new Set<string>();

const APP_TIMEZONE = process.env.VITE_TIME_ZONE || 'Europe/Lisbon';

function getAppNow() {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    
    return new Date(
      parseInt(getPart('year')),
      parseInt(getPart('month')) - 1,
      parseInt(getPart('day')),
      parseInt(getPart('hour')),
      parseInt(getPart('minute')),
      parseInt(getPart('second'))
    );
  } catch (e) {
    console.error(`[TIME] Error formatting time for ${APP_TIMEZONE}, falling back to UTC:`, e);
    return now;
  }
}

async function checkAndSendAutomatedEmails() {
  if (!supabaseUrl || !supabaseKey) return;

  try {
    const now = getAppNow();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;

    console.log(`[AUTOMATION] Checking tasks for ${todayStr} (and ${tomorrowStr}) at ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} (Timezone: ${APP_TIMEZONE})`);

    // Fetch active reservations for today and tomorrow to handle midnight boundary
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('*')
      .or(`date.eq.${todayStr},date.eq.${tomorrowStr}`)
      .in('status', ['Confirmed', 'Occupied']);

    if (resError) throw resError;
    if (!reservations || reservations.length === 0) return;

    // Fetch rooms and users for lookup
    const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id, name');
    const { data: users, error: usersError } = await supabase.from('users').select('id, email, lang');

    if (roomsError) throw roomsError;
    if (usersError) throw usersError;

    const roomsMap = new Map((rooms || []).map(r => [r.id.toString(), r.name]));
    const usersMap = new Map((users || []).map(u => [u.id.toString(), u]));

    for (const res of reservations) {
      if (!res.id) {
        console.warn("[AUTOMATION] Found reservation without ID, skipping...");
        continue;
      }
      const startTimeStr = res.start_time || res.startTime;
      if (!startTimeStr) continue;

      const [startH, startM] = startTimeStr.split(':').map(Number);
      const startTime = new Date(now);
      if (res.date === tomorrowStr) {
        startTime.setDate(startTime.getDate() + 1);
      }
      startTime.setHours(startH, startM, 0, 0);

      const duration = res.duration || 60;
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      const diffToStart = (startTime.getTime() - now.getTime()) / (1000 * 60);
      const diffToEnd = (endTime.getTime() - now.getTime()) / (1000 * 60);

      const userId = (res.user_id || res.userId)?.toString();
      const roomId = (res.room_id || res.roomId)?.toString();
      const user = usersMap.get(userId);
      const roomName = roomsMap.get(roomId) || 'Sala';
      const userEmail = user?.email || res.userEmail;
      const lang = (user?.lang || 'pt') as Language;

      if (!userEmail) {
        console.warn(`[AUTOMATION] No email found for reservation ${res.id} (User ID: ${userId})`);
        continue;
      }

      // Auto-cancellation: 10 minutes after start if not checked in (status is still 'Confirmed')
      if (res.status === 'Confirmed' && diffToStart < -10) {
        console.log(`[AUTOMATION] Auto-cancelling reservation ${res.id} for ${userEmail} due to no-show (diff: ${diffToStart.toFixed(2)}m)`);
        const { error: cancelError } = await supabase
          .from('reservations')
          .update({ status: 'Cancelled' })
          .eq('id', res.id);
        
        if (cancelError) {
          console.error(`[AUTOMATION] Failed to auto-cancel reservation ${res.id}:`, cancelError);
        } else {
          // Send cancellation email
          await sendReservationStatusEmail(userEmail, roomName, { ...res, startTime: startTimeStr, duration }, 'Cancelled', lang);
          console.log(`[AUTOMATION] Auto-cancellation email sent to ${userEmail}`);
        }
        continue; // Skip other alerts for this reservation
      }

      // Reminder: 15 minutes before start (window: 14-16 mins)
      if (diffToStart > 14 && diffToStart <= 16 && !sentReminders.has(res.id.toString())) {
        console.log(`[AUTOMATION] Sending reminder for reservation ${res.id} to ${userEmail} (diff: ${diffToStart.toFixed(2)}m)`);
        await sendReminderEmail(userEmail, roomName, { ...res, startTime: startTimeStr, duration }, lang);
        sentReminders.add(res.id.toString());
      }

      // End Alert: 10 minutes before end (window: 9-11 mins)
      if (diffToEnd > 9 && diffToEnd <= 11 && !sentEndAlerts.has(res.id.toString())) {
        console.log(`[AUTOMATION] Sending end alert for reservation ${res.id} to ${userEmail} (diff: ${diffToEnd.toFixed(2)}m)`);
        await sendEndAlertEmail(userEmail, roomName, { ...res, startTime: startTimeStr, duration }, lang);
        sentEndAlerts.add(res.id.toString());
      }
    }

    // Periodically clear old IDs from sets (e.g., every day at midnight Lisbon time)
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      console.log("[AUTOMATION] Clearing sent alerts tracking sets for the new day");
      sentReminders.clear();
      sentEndAlerts.clear();
    }

  } catch (err: any) {
    console.error("[AUTOMATION] Error in automated emails task:", err);
    if (err.message) console.error("[AUTOMATION] Error Message:", err.message);
    if (err.details) console.error("[AUTOMATION] Error Details:", err.details);
    if (err.hint) console.error("[AUTOMATION] Error Hint:", err.hint);
    if (err.stack) console.error("[AUTOMATION] Error Stack:", err.stack);
  }
}

// Run every minute (only in non-production environments)
if (process.env.NODE_ENV !== "production") {
  console.log("[AUTOMATION] Starting local interval for automated tasks...");
  setInterval(checkAndSendAutomatedEmails, 60 * 1000);
}

async function startServer() {
  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  if (!process.env.VERCEL) process.exit(1);
});
