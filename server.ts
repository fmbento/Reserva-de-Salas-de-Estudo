import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    permission_level INTEGER DEFAULT 1
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
  const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    db.prepare("INSERT INTO users (name, email, permission_level) VALUES (?, ?, ?)").run(
      "Test User", "filben@gmail.com", 1
    );
  }

  // Add the second test user if not exists
  const user2 = db.prepare("SELECT * FROM users WHERE email = ?").get("teste2@ua.pt");
  if (!user2) {
    db.prepare("INSERT INTO users (name, email, permission_level) VALUES (?, ?, ?)").run(
      "Teste Dois", "teste2@ua.pt", 1
    );
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
    const u2 = db.prepare("SELECT id FROM users WHERE email = ?").get("teste2@ua.pt") as { id: number };
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

seedData();

async function startServer() {
  const app = express();
  app.use(express.json());

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
    try {
      const result = db.prepare(`
        INSERT INTO reservations (room_id, user_id, date, start_time, duration, subject, status) 
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
      `).run(room_id, user_id || 1, date, start_time, duration, subject);
      
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
    // Mocking the current user for now
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get("filben@gmail.com");
    res.json(user);
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
