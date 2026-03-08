import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
try {
  db = new Database("database.sqlite");
  console.log("Database initialized successfully");
} catch (error) {
  console.error("Failed to initialize database:", error);
  process.exit(1);
}

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' -- 'user', 'librarian', 'admin'
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT NOT NULL,
    capacity INTEGER,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed initial data
const seedData = () => {
  const users = [
    { name: "Utilizador Teste 1", email: "filben@gmail.com", role: "user" },
    { name: "Utilizador Teste 2", email: "teste2@ua.pt", role: "user" },
    { name: "Bibliotecário 01", email: "bib01@ua.pt", role: "librarian" },
    { name: "Administrador do Sistema 01", email: "admin01@ua.pt", role: "admin" },
  ];

  console.log("Seeding users...");
  const insertUser = db.prepare("INSERT OR REPLACE INTO users (name, email, role) VALUES (?, ?, ?)");
  users.forEach(u => {
    const result = insertUser.run(u.name, u.email, u.role);
    console.log(`User seed result for ${u.email}: changes=${result.changes}`);
  });

  const allUsersInDb = db.prepare("SELECT * FROM users").all();
  console.log("All users in DB:", allUsersInDb);
  if (allUsersInDb.length < 4) {
    console.warn(`Warning: Only ${allUsersInDb.length} users found in DB. Expected at least 4.`);
  }

  const u2 = db.prepare("SELECT id FROM users WHERE email = ?").get("teste2@ua.pt") as { id: number } | undefined;
  if (!u2) {
    console.error("Critical error: Seed user 'teste2@ua.pt' not found after insertion.");
    return;
  }

  const roomCount = db.prepare("SELECT count(*) as count FROM rooms").get() as { count: number };
  if (roomCount.count === 0) {
    const rooms = [
      { id: '101', name: 'Sala de Estudo 101', department: 'Departamento de Engenharia', status: 'Available', capacity: 10, description: 'Sala equipada com projetor e quadro branco.' },
      { id: '102', name: 'Sala de Estudo 102', department: 'Departamento de Engenharia', status: 'Available', capacity: 8, description: 'Sala ideal para trabalhos de grupo.' },
      { id: '201', name: 'Laboratório 201', department: 'Departamento de Informática', status: 'Occupied', capacity: 20, description: 'Laboratório de computação avançada.' },
      { id: '202', name: 'Laboratório 202', department: 'Departamento de Informática', status: 'Available', capacity: 15, description: 'Laboratório de redes.' },
      { id: '301', name: 'Anfiteatro 301', department: 'Departamento de Artes', status: 'Pending', capacity: 50, description: 'Anfiteatro para palestras.' },
    ];
    const insertRoom = db.prepare("INSERT INTO rooms (id, name, department, status, capacity, description) VALUES (?, ?, ?, ?, ?, ?)");
    rooms.forEach(room => insertRoom.run(room.id, room.name, room.department, room.status, room.capacity, room.description));
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
        { room_id: '101', user_id: 1, date: '2026-03-05', start_time: '10:00', duration: 120, subject: 'Group Study', status: 'Occupied' },
        { room_id: '102', user_id: 1, date: '2026-03-06', start_time: '12:00', duration: 60, subject: 'Tese Review', status: 'Pending' },
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

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
    const { room_id, user_id, date, start_time, duration, subject } = req.body;
    const uid = user_id || 1;
    
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
      return res.status(409).json({ error: "Já possui uma reserva ativa que se sobrepõe a este horário." });
    }

    // 2. Check for ROOM conflicts
    const roomReservations = db.prepare("SELECT * FROM reservations WHERE room_id = ? AND date = ? AND status != 'Cancelled'").all(room_id, date);
    const roomConflict = roomReservations.find((r: any) => {
      const rStart = parseTime(r.start_time);
      const rEnd = rStart + r.duration;
      return (newStart < rEnd && newEnd > rStart);
    });

    if (roomConflict) {
      return res.status(409).json({ error: "Esta sala já está reservada para este horário." });
    }

    try {
      const result = db.prepare(`
        INSERT INTO reservations (room_id, user_id, date, start_time, duration, subject, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
      `).run(room_id, uid, date, start_time, duration, subject);
      
      const newReservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(result.lastInsertRowid);
      res.status(201).json(newReservation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create reservation" });
    }
  });

  app.delete("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM reservations WHERE id = ?").run(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reservation" });
    }
  });

  app.get("/api/user/me", (req, res) => {
    const email = req.query.email as string || "filben@gmail.com";
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    console.log("Serving /api/users request. Count:", users.length);
    res.json(users);
  });

  app.patch("/api/reservations/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE reservations SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
