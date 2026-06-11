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
import { Jimp } from 'jimp';

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

// --- Helper functions for Room Location and Highlight Map Generation ---
async function fetchRoomDetails(roomId: string) {
  if (!supabaseUrl || !supabaseKey || !roomId) return null;
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .or(`id.eq."${roomId}",name.eq."${roomId}"`)
      .single();
    
    if (error) {
      // Fallback: list all rooms and find a match manually to tolerate string/numeric casting inconsistencies
      const { data: listData } = await supabase
        .from('rooms')
        .select('*');
      
      const found = listData?.find((r: any) => 
        String(r.id).trim().toLowerCase() === String(roomId).trim().toLowerCase() || 
        String(r.name).trim().toLowerCase() === String(roomId).trim().toLowerCase()
      );
      return found || null;
    }
    return data;
  } catch (err) {
    console.error("[SERVER] Error fetching room details:", err);
    return null;
  }
}

function getRoomLocationText(room: any, lang: Language = 'pt'): string {
  const isPt = lang === 'pt';
  const b = room.building || '17';
  const f = room.floor || '3';
  const s = room.section || 'Frente';
  
  let buildingName = b;
  if (b === '17') {
    buildingName = isPt ? 'Biblioteca da UA' : 'UA Library';
  }
  
  let floorName = isPt ? `Piso ${f}` : `Floor ${f}`;
  
  let sectionName = s;
  if (!isPt) {
    if (s.toLowerCase() === 'frente') sectionName = 'Front';
    else if (s.toLowerCase() === 'trás' || s.toLowerCase() === 'tras') sectionName = 'Back';
  }
  
  return `${buildingName}, ${floorName}, ${sectionName}`;
}

async function getHighlightedMapBuffer(room: any): Promise<Buffer | null> {
  try {
    let topVal = room.top;
    let leftVal = room.left;

    // Fallbacks matching App.tsx coordinates
    if (!topVal || !leftVal) {
      const rid = String(room.id);
      if (rid === '101') { topVal = '20%'; leftVal = '15%'; }
      else if (rid === '102') { topVal = '20%'; leftVal = '30%'; }
      else if (rid === '201') { topVal = '50%'; leftVal = '45%'; }
      else { topVal = '70%'; leftVal = '70%'; }
    }

    const parsePercentage = (percStr: any): number => {
      if (typeof percStr === 'number') return percStr / 100;
      if (!percStr || typeof percStr !== 'string') return 0.5;
      const num = parseFloat(percStr.replace('%', ''));
      return isNaN(num) ? 0.5 : num / 100;
    };

    const topRatio = parsePercentage(topVal);
    const leftRatio = parsePercentage(leftVal);

    const b = room.building || '17';
    const f = room.floor || '3';
    const s = room.section || 'Frente';
    const key = `${b}-${f}-${s}`;
    const mapUrl = mapsConfig[key] || `https://picsum.photos/seed/ua-floorplan-${b}-${f}-${s}/1200/800?grayscale&blur=2`;

    console.log(`[MAP-GEN] Loading floor plan from ${mapUrl} for room ${room.name || room.id} (${key})`);
    
    const image = await Jimp.read(mapUrl);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    const cx = Math.round(leftRatio * width);
    const cy = Math.round(topRatio * height);

    console.log(`[MAP-GEN] Highlight target on (${width}x${height}): cx=${cx}, cy=${cy}`);

    // Helper to blend color
    const blendPixel = (x: number, y: number, r: number, g: number, b: number, alpha: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      
      const currentInt = image.getPixelColor(x, y);
      const curA = currentInt & 0xff;
      const curB = (currentInt >> 8) & 0xff;
      const curG = (currentInt >> 16) & 0xff;
      const curR = (currentInt >> 24) & 0xff;

      const newR = Math.round(curR * (1 - alpha) + r * alpha);
      const newG = Math.round(curG * (1 - alpha) + g * alpha);
      const newB = Math.round(curB * (1 - alpha) + b * alpha);
      const newInt = ((newR << 24) >>> 0) + (newG << 16) + (newB << 8) + 255;
      image.setPixelColor(newInt, x, y);
    };

    // Paint layered glowing locator
    for (let dy = -25; dy <= 25; dy++) {
      for (let dx = -25; dx <= 25; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= 10) {
          // Inner solid bright red circle
          blendPixel(tx, ty, 239, 68, 68, 1.0); // bg-red-500
        } else if (dist <= 13) {
          // High contrast white ring outline
          blendPixel(tx, ty, 255, 255, 255, 0.9);
        } else if (dist <= 20) {
          // outer transparent active halo
          const alpha = 0.45 * (1 - (dist - 13) / 7);
          blendPixel(tx, ty, 239, 68, 68, alpha);
        }
      }
    }

    let buffer: Buffer;
    if (typeof (image as any).getBufferAsync === 'function') {
      buffer = await (image as any).getBufferAsync("image/jpeg");
    } else if (typeof (image as any).getBuffer === 'function') {
      buffer = await (image as any).getBuffer("image/jpeg");
    } else {
      throw new Error("No getBuffer method on Jimp image");
    }
    return buffer;
  } catch (err) {
    console.error(`[MAP-GEN] Failed to generate map buffer:`, err);
    return null;
  }
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

function parseDuration(duration: any): number {
  if (typeof duration === 'number') return duration;
  if (typeof duration !== 'string') return 60;
  
  // Handle "X Hora(s) e Y Minutos" or "X Minutos"
  let totalMinutes = 0;
  const normalized = duration.toLowerCase();
  
  if (normalized.includes('hora')) {
    const parts = normalized.split(' ');
    const hours = parseInt(parts[0]);
    if (!isNaN(hours)) totalMinutes += hours * 60;
    
    if (normalized.includes(' e ')) {
      const minParts = normalized.split(' e ');
      const mins = parseInt(minParts[1]);
      if (!isNaN(mins)) totalMinutes += mins;
    }
  } else {
    const mins = parseInt(normalized);
    if (!isNaN(mins)) totalMinutes = mins;
  }
  
  return totalMinutes || 60;
}

function formatReservationTime(startTime: string, duration: any, lang: Language = 'pt') {
  const durationMinutes = parseDuration(duration);
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

async function sendReservationPendingEmail(email: string, roomName: string, date: string, startTime: string, duration: number, lang: Language = 'pt', roomId?: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const t = translations[lang];
  
  let attachments: any[] = [];
  let mapHtml = '';
  
  try {
    const room = await fetchRoomDetails(roomId || roomName);
    if (room) {
      const mapBuffer = await getHighlightedMapBuffer(room);
      if (mapBuffer) {
        attachments.push({
          filename: 'room-map.jpg',
          content: mapBuffer,
          cid: 'room_map'
        });
        const locationText = getRoomLocationText(room, lang);
        mapHtml = `
          <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <p style="margin: 5px 0; font-size: 14px; color: #555; font-weight: bold; text-align: center;">
              ${locationText}
            </p>
            <div style="text-align: center; margin-top: 10px;">
              <img src="cid:room_map" alt="Localização da Sala" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
            </div>
          </div>
        `;
      }
    }

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
          ${mapHtml}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
      attachments: attachments.length > 0 ? attachments : undefined
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
  let mapHtml = '';
  
  if (isConfirmed) {
    const [year, month, day] = res.date.split('-').map(Number);
    const [hour, minute] = res.startTime.split(':').map(Number);
    
    const event: ics.EventAttributes = {
      start: [year, month, day, hour, minute],
      duration: { minutes: parseDuration(res.duration) },
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

    try {
      const room = await fetchRoomDetails(res.roomId || res.room_id || roomName);
      if (room) {
        const mapBuffer = await getHighlightedMapBuffer(room);
        if (mapBuffer) {
          attachments.push({
            filename: 'room-map.jpg',
            content: mapBuffer,
            cid: 'room_map'
          });
          const locationText = getRoomLocationText(room, lang);
          mapHtml = `
            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
              <p style="margin: 5px 0; font-size: 14px; color: #555; font-weight: bold; text-align: center;">
                ${locationText}
              </p>
              <div style="text-align: center; margin-top: 10px;">
                <img src="cid:room_map" alt="Localização da Sala" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
              </div>
            </div>
          `;
        }
      }
    } catch (roomErr) {
      console.error("[EMAIL-MAP] Failed fetching room on status change:", roomErr);
    }
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
          ${mapHtml}
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
  const { email, roomName, roomId, date, startTime, duration, lang } = req.body;
  await sendReservationPendingEmail(email, roomName, date, startTime, duration, lang, roomId);
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
  
  let attachments: any[] = [];
  let mapHtml = '';
  
  try {
    const room = await fetchRoomDetails(res.roomId || res.room_id || roomName);
    if (room) {
      const mapBuffer = await getHighlightedMapBuffer(room);
      if (mapBuffer) {
        attachments.push({
          filename: 'room-map.jpg',
          content: mapBuffer,
          cid: 'room_map'
        });
        const locationText = getRoomLocationText(room, lang);
        mapHtml = `
          <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <p style="margin: 5px 0; font-size: 14px; color: #555; font-weight: bold; text-align: center;">
              ${locationText}
            </p>
            <div style="text-align: center; margin-top: 10px;">
              <img src="cid:room_map" alt="Localização da Sala" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
            </div>
          </div>
        `;
      }
    }

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
          ${mapHtml}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
      attachments: attachments.length > 0 ? attachments : undefined
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
    // We don't fetch 'lang' from users anymore since it might not exist and we prefer the reservation's lang
    const { data: users, error: usersError } = await supabase.from('users').select('id, email');

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

      const duration = parseDuration(res.duration || 60);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      const diffToStart = (startTime.getTime() - now.getTime()) / (1000 * 60);
      const diffToEnd = (endTime.getTime() - now.getTime()) / (1000 * 60);

      const userId = (res.user_id || res.userId)?.toString();
      const roomId = (res.room_id || res.roomId)?.toString();
      const user = usersMap.get(userId);
      const roomName = roomsMap.get(roomId) || 'Sala';
      const userEmail = user?.email || res.userEmail;
      
      // Use language from reservation, fallback to 'pt'
      const lang = (res.lang || 'pt') as Language;

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
