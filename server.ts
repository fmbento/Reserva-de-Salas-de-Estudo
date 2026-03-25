import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import nodemailer from "nodemailer";
import * as ics from 'ics';
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { translations, Language } from "./src/translations";

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

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: any;
try {
  const dbPath = path.join(dataDir, "salas.db");
  db = new Database(dbPath); 
  db.pragma('foreign_keys = ON');
  console.log(`[DB] Database initialized successfully at: ${path.resolve(dbPath)}`);
} catch (error) {
  console.error("[DB] Failed to initialize database:", error);
  process.exit(1);
}

// Initialize database tables
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL,
      capacity INTEGER,
      description TEXT,
      operational_status TEXT DEFAULT 'Active',
      image TEXT,
      amenities TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      subject TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS otps (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT,
      expires_at DATETIME NOT NULL
    );
  `);
  console.log("Database tables verified/created successfully");
} catch (error) {
  console.error("CRITICAL: Failed to create database tables:", error);
  process.exit(1);
}

try { db.exec("ALTER TABLE rooms ADD COLUMN operational_status TEXT DEFAULT 'Active'"); } catch(e) {}
try { db.exec("ALTER TABLE rooms ADD COLUMN image TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE rooms ADD COLUMN amenities TEXT DEFAULT '[]'"); } catch(e) {}

// Seed initial data
const seedData = () => {
  const adminEmail = process.env.ADMIN_EMAIL || "sbidm-biblioteca@ua.pt";
  const users = [
    { name: "Utilizador Teste 1", email: "teste01@ua.pt", role: "user" },
    { name: "Utilizador Teste 2", email: "teste02@ua.pt", role: "user" },
    { name: "Bibliotecário 01", email: "bib01@ua.pt", role: "bibliotecário" },
    { name: "Administrador do Sistema 01", email: adminEmail, role: "admin" },
    { name: "Filipe Bento", email: "filben@gmail.com", role: "admin" },
  ];

  console.log("Seeding users...");
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, role) 
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET 
      name = excluded.name,
      role = excluded.role
  `);
  users.forEach(u => {
    insertUser.run(u.name, u.email, u.role);
  });

  const allUsersInDb = db.prepare("SELECT * FROM users").all();
  console.log("All users in DB:", allUsersInDb);
  
  const u1 = db.prepare("SELECT id FROM users WHERE email = ?").get("teste01@ua.pt") as { id: number } | undefined;
  const u2 = db.prepare("SELECT id FROM users WHERE email = ?").get("teste02@ua.pt") as { id: number } | undefined;

  if (!u1 || !u2) {
    console.error("Critical error: Seed users not found after insertion.");
    return;
  }

  const roomCount = db.prepare("SELECT count(*) as count FROM rooms").get() as { count: number };
  if (roomCount.count === 0) {
    const rooms = [
      { id: '101', name: 'Sala de Estudo 101', department: 'Departamento de Engenharia', status: 'Available', capacity: 10, description: 'Sala equipada com projetor e quadro branco.', operational_status: 'Active', amenities: JSON.stringify(['Eduroam', 'Tomadas', 'Projetor']) },
      { id: '102', name: 'Sala de Estudo 102', department: 'Departamento de Engenharia', status: 'Available', capacity: 8, description: 'Sala ideal para trabalhos de grupo.', operational_status: 'Active', amenities: JSON.stringify(['Eduroam', 'Tomadas']) },
      { id: '201', name: 'Laboratório 201', department: 'Departamento de Informática', status: 'Occupied', capacity: 20, description: 'Laboratório de computação avançada.', operational_status: 'Active', amenities: JSON.stringify(['Eduroam', 'Tomadas', 'Smart Screen']) },
      { id: '202', name: 'Laboratório 202', department: 'Departamento de Informática', status: 'Available', capacity: 15, description: 'Laboratório de redes.', operational_status: 'Maintenance', amenities: JSON.stringify(['Eduroam', 'Tomadas']) },
      { id: '301', name: 'Anfiteatro 301', department: 'Departamento de Artes', status: 'Pending', capacity: 50, description: 'Anfiteatro para palestras.', operational_status: 'Active', amenities: JSON.stringify(['Eduroam', 'Projetor', 'Ar Condicionado']) },
    ];
    const insertRoom = db.prepare("INSERT INTO rooms (id, name, department, status, capacity, description, operational_status, amenities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    rooms.forEach(room => insertRoom.run(room.id, room.name, room.department, room.status, room.capacity, room.description, room.operational_status, room.amenities));
  }

  const reservationCount = db.prepare("SELECT count(*) as count FROM reservations").get() as { count: number };
  if (reservationCount.count <= 2) { // If only initial mock data exists, add more
    const extraReservations = [
      { room_id: '101', user_id: u2.id, date: '2026-03-05', start_time: '14:00', duration: 60, subject: 'Estudo Individual', status: 'Occupied' },
      { room_id: '202', user_id: u2.id, date: '2026-03-05', start_time: '16:00', duration: 90, subject: 'Projeto de Redes', status: 'Pending' },
      { room_id: '301', user_id: u2.id, date: '2026-03-06', start_time: '09:00', duration: 120, subject: 'Preparação Palestra', status: 'Pending' },
    ];
    
    const insertReservation = db.prepare("INSERT INTO reservations (room_id, user_id, date, start_time, duration, subject, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    // Initial data if count was 0
    if (reservationCount.count === 0) {
      const initialReservations = [
        { room_id: '101', user_id: u1.id, date: '2026-03-05', start_time: '10:00', duration: 120, subject: 'Group Study', status: 'Occupied' },
        { room_id: '102', user_id: u1.id, date: '2026-03-06', start_time: '12:00', duration: 60, subject: 'Tese Review', status: 'Pending' },
      ];
      initialReservations.forEach(res => insertReservation.run(res.room_id, res.user_id, res.date, res.start_time, res.duration, res.subject, res.status));
    }

    extraReservations.forEach(res => insertReservation.run(res.room_id, res.user_id, res.date, res.start_time, res.duration, res.subject, res.status));
  }
};

try {
  seedData();
  console.log("Database seeded successfully");
} catch (error) {
  console.error("Error seeding database:", error);
}

// Nodemailer Transporter
const smtpPort = process.env.SMTP_PORT || '465';
console.log(`[AUTH] SMTP Config: Host=${process.env.SMTP_HOST || 'smtp.gmail.com'}, Port=${smtpPort}, User=${process.env.SMTP_USER ? 'Set' : 'Not Set'}, Pass=${process.env.SMTP_PASS ? 'Set' : 'Not Set'}`);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(smtpPort),
  secure: smtpPort === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
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

async function sendWelcomeEmail(email: string, name: string, lang: Language = 'pt') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  const t = translations[lang];
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: t.emailWelcomeSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${translations[lang].hello} <strong>${name}</strong>,</p>
          <p>${t.emailWelcomeBody}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to send welcome email to ${email}:`, error);
  }
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
    const [hour, minute] = res.start_time.split(':').map(Number);
    
    const event: ics.EventAttributes = {
      start: [year, month, day, hour, minute],
      duration: { minutes: res.duration },
      title: `Reserva SiReS Bibliotecas UA: ${roomName}`,
      description: `Assunto: ${res.subject}`,
      location: roomName,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
    };

    const { error, value } = ics.createEvent(event);
    if (!error && value) {
      attachments.push({
        filename: 'reserva.ics',
        content: value,
        contentType: 'text/calendar'
      });
    }
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      attachments: attachments,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: ${isConfirmed ? '#10b981' : '#ef4444'}; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${t.emailRoom} <strong>${roomName}</strong>: <strong>${isConfirmed ? (lang === 'pt' ? 'CONFIRMADA' : 'CONFIRMED') : (lang === 'pt' ? 'CANCELADA' : 'CANCELLED')}</strong>.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${t.emailRoom}:</strong> ${roomName}</p>
            <p style="margin: 5px 0;"><strong>${t.emailDate}:</strong> ${res.date}</p>
            <p style="margin: 5px 0;"><strong>${t.emailTime}:</strong> ${formatReservationTime(res.start_time, res.duration, lang)}</p>
            <p style="margin: 5px 0;"><strong>${lang === 'pt' ? 'Estado' : 'Status'}:</strong> ${isConfirmed ? (lang === 'pt' ? 'Confirmada' : 'Confirmed') : (lang === 'pt' ? 'Cancelada' : 'Cancelled')}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to send status email to ${email}:`, error);
  }
}

async function sendOtpEmail(email: string, code: string, lang: Language = 'pt') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const missing = [];
    if (!process.env.SMTP_USER) missing.push('SMTP_USER');
    if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
    console.warn(`[AUTH] SMTP credentials missing (${missing.join(', ')}). OTP logged to console only.`);
    console.log(`[AUTH] OTP for ${email}: ${code}`);
    return;
  }

  const t = translations[lang];

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SiReS Bibliotecas UA" <${process.env.SMTP_USER}>`,
      to: email,
      subject: t.emailOtpSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0066cc; text-align: center;">SiReS Bibliotecas UA</h2>
          <p>${translations[lang].hello},</p>
          <p>${t.emailOtpBody}</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">${translations[lang].codeExpires}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">${t.uaTitle} - SiReS</p>
        </div>
      `,
    });
    console.log(`[AUTH] OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`[AUTH] Failed to send OTP email to ${email}:`, error);
    console.log(`[AUTH] FALLBACK: OTP for ${email} is ${code} (Check SMTP credentials)`);
    return false;
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Endpoints
  app.post("/api/auth/request-otp", async (req, res) => {
    const { email, name, type, lang } = req.body; // type: 'login' | 'register'
    
    const adminEmail = process.env.ADMIN_EMAIL || "sbidm-biblioteca@ua.pt";
    const userLang = (lang as Language) || 'pt';
    const t = translations[userLang];

    if (!email.endsWith("@ua.pt") && email !== "filben@gmail.com" && email !== adminEmail) {
      return res.status(400).json({ error: t.restrictedDomain });
    }

    // Check if user exists for login
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (user && user.role === 'blocked') {
      return res.status(403).json({ error: t.userBlockedError });
    }

    if (type === 'login' && !user) {
      return res.status(404).json({ error: t.accountNotFound });
    }
    if (type === 'register' && user) {
      return res.status(400).json({ error: t.emailAlreadyRegistered });
    }

    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    try {
      db.prepare(`
        INSERT OR REPLACE INTO otps (email, code, name, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(email, code, name || null, expiresAt);

      const emailSent = await sendOtpEmail(email, code, userLang);
      res.json({ 
        success: true, 
        message: emailSent 
          ? t.otpSentSuccess 
          : t.otpSentError 
      });
    } catch (error: any) {
      console.error("[AUTH] Error in request-otp:", error);
      res.status(500).json({ 
        error: t.errorRequestOtp,
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, code, lang } = req.body;
    const userLang = (lang as Language) || 'pt';
    const t = translations[userLang];

    const otpRecord = db.prepare("SELECT * FROM otps WHERE email = ?").get(email);

    if (!otpRecord) {
      return res.status(400).json({ error: t.invalidOtp });
    }

    if (otpRecord.code !== code) {
      return res.status(400).json({ error: t.incorrectOtp });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: t.expiredOtp });
    }

    // Valid OTP - Find or Create User
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    
    if (user && user.role === 'blocked') {
      return res.status(403).json({ error: t.userBlockedError });
    }

    let isNewUser = false;

    if (!user) {
      const result = db.prepare("INSERT INTO users (name, email, role) VALUES (?, ?, 'user')").run(otpRecord.name || "Utilizador UA", email);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      isNewUser = true;
    }

    // Clean up OTP
    db.prepare("DELETE FROM otps WHERE email = ?").run(email);

    if (isNewUser && user) {
      sendWelcomeEmail(user.email, user.name, lang).catch(console.error);
      broadcast({ type: 'USERS_UPDATED' });
    }

    res.json(user);
  });

  // API Routes
  app.get("/api/rooms", (req, res) => {
    const rooms = db.prepare("SELECT * FROM rooms").all();
    res.json(rooms);
  });

  app.get("/api/reservations", (req, res) => {
    const reservations = db.prepare(`
      SELECT r.*, rm.name as room_name, u.name as user_name 
      FROM reservations r 
      JOIN rooms rm ON r.room_id = rm.id 
      JOIN users u ON r.user_id = u.id
    `).all();
    res.json(reservations);
  });

  app.post("/api/reservations", (req, res) => {
    const { room_id, user_id, date, start_time, duration, subject, lang } = req.body;
    const userLang = (lang as Language) || 'pt';
    const t = translations[userLang];
    
    if (!room_id || !date || !start_time || !duration) {
      return res.status(400).json({ error: t.incompleteBookingData });
    }

    // Ensure we have a valid user_id
    let uid = user_id;
    if (!uid) {
      // Try to find the first user as fallback if none provided (should not happen in normal flow)
      const firstUser = db.prepare("SELECT id FROM users LIMIT 1").get() as { id: number } | undefined;
      if (firstUser) {
        uid = firstUser.id;
      } else {
        return res.status(401).json({ error: t.userNotFoundInDb });
      }
    }

    // Verify user exists to avoid foreign key failure
    const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(uid);
    if (!userExists) {
      return res.status(401).json({ error: t.userNotFoundLoginAgain });
    }

    // Verify room exists to avoid foreign key failure
    const roomExists = db.prepare("SELECT id FROM rooms WHERE id = ?").get(room_id);
    if (!roomExists) {
      return res.status(404).json({ error: t.roomNotFound });
    }
    
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const newStart = parseTime(start_time);
    const newEnd = newStart + duration;

    // 1. Check for USER conflicts (across all rooms)
    const userReservations = db.prepare("SELECT * FROM reservations WHERE user_id = ? AND date = ? AND status != 'Cancelled'").all(uid, date);
    const userConflict = userReservations.find((r: any) => {
      const rStart = parseTime(r.start_time);
      const rEnd = rStart + r.duration;
      return (newStart < rEnd && newEnd > rStart);
    });

    if (userConflict) {
      return res.status(409).json({ error: t.overlappingReservationUser });
    }

    // 2. Check for ROOM conflicts
    const roomReservations = db.prepare("SELECT * FROM reservations WHERE room_id = ? AND date = ? AND status != 'Cancelled'").all(room_id, date);
    const roomConflict = roomReservations.find((r: any) => {
      const rStart = parseTime(r.start_time);
      const rEnd = rStart + r.duration;
      return (newStart < rEnd && newEnd > rStart);
    });

    if (roomConflict) {
      return res.status(409).json({ error: t.overlappingReservationRoom });
    }

    try {
      const result = db.prepare(`
        INSERT INTO reservations (room_id, user_id, date, start_time, duration, subject, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
      `).run(room_id, uid, date, start_time, duration, subject || 'Sem assunto');
      
      const newReservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(result.lastInsertRowid);
      
      // Send notification
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(uid) as { email: string };
      const room = db.prepare("SELECT name FROM rooms WHERE id = ?").get(room_id) as { name: string };
      if (user && room) {
        sendReservationPendingEmail(user.email, room.name, date, start_time, duration, lang).catch(console.error);
      }

      broadcast({ type: 'RESERVATIONS_UPDATED' });
      res.status(201).json(newReservation);
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      res.status(500).json({ 
        error: t.errorBooking,
        details: error.message 
      });
    }
  });

  app.delete("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    const lang = (req.query.lang as Language) || 'pt';
    try {
      // Fetch details before deleting for notification
      const reservation = db.prepare(`
        SELECT r.*, rm.name as room_name, u.email as user_email 
        FROM reservations r 
        JOIN rooms rm ON r.room_id = rm.id 
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `).get(id);

      if (reservation) {
        sendReservationStatusEmail(reservation.user_email, reservation.room_name, reservation, 'Cancelled', lang).catch(console.error);
      }

      db.prepare("DELETE FROM reservations WHERE id = ?").run(id);
      broadcast({ type: 'RESERVATIONS_UPDATED' });
      res.status(204).send();
    } catch (error) {
      const t = translations[lang];
      res.status(500).json({ error: t.errorDeleteReservation });
    }
  });

  app.get("/api/user/me", (req, res) => {
    const email = req.query.email as string || "filben@gmail.com";
    const lang = (req.query.lang as Language) || 'pt';
    const t = translations[lang];
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return res.status(404).json({ error: t.userNotFound });
    }
    res.json(user);
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    console.log("Serving /api/users request. Count:", users.length);
    res.json(users);
  });

  app.get("/api/users/search", (req, res) => {
    const { email, lang } = req.query;
    const userLang = (lang as Language) || 'pt';
    const t = translations[userLang];

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return res.status(404).json({ error: t.noUserFound });
    }

    res.json(user);
  });

  app.put("/api/users/:id/role", (req, res) => {
    const { id } = req.params;
    const { role, lang } = req.body;
    const userLang = (lang as Language) || 'pt';
    const t = translations[userLang];

    if (!['user', 'bibliotecário', 'blocked'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    try {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
      broadcast({ type: 'USERS_UPDATED' });
      res.json({ success: true, message: t.userUpdatedSuccess });
    } catch (error: any) {
      console.error("[USERS] Error updating role:", error);
      res.status(500).json({ error: t.internalServerError });
    }
  });

  app.put("/api/rooms/:id", (req, res) => {
    const { id } = req.params;
    const { name, department, capacity, operationalStatus, operational_status, image, amenities } = req.body;
    
    // Handle both camelCase and snake_case from frontend
    const opStatus = operationalStatus || operational_status;
    
    try {
      const stmt = db.prepare(`
        UPDATE rooms 
        SET name = ?, department = ?, capacity = ?, operational_status = ?, image = ?, amenities = ?
        WHERE id = ?
      `);
      const result = stmt.run(name, department, capacity, opStatus, image, JSON.stringify(amenities), id);
      
      if (result.changes > 0) {
        broadcast({ type: 'ROOMS_UPDATED' });
        res.json({ success: true });
      } else {
        const lang = (req.body.lang as Language) || 'pt';
        const t = translations[lang];
        res.status(404).json({ error: t.roomNotFound });
      }
    } catch (error) {
      console.error("Error updating room:", error);
      const lang = (req.body.lang as Language) || 'pt';
      const t = translations[lang];
      res.status(500).json({ error: t.internalServerError });
    }
  });

  app.patch("/api/reservations/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, lang } = req.body;
    const userLang = (lang as Language) || 'pt';
    const t = translations[userLang];
    try {
      db.prepare("UPDATE reservations SET status = ? WHERE id = ?").run(status, id);
      
      // Send notification
      const reservation = db.prepare(`
        SELECT r.*, rm.name as room_name, u.email as user_email 
        FROM reservations r 
        JOIN rooms rm ON r.room_id = rm.id 
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `).get(id);

      if (reservation) {
        sendReservationStatusEmail(reservation.user_email, reservation.room_name, reservation, status, userLang).catch(console.error);
      }

      broadcast({ type: 'RESERVATIONS_UPDATED' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: t.errorUpdateStatus });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
