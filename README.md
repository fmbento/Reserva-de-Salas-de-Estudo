# SiReS Bibliotecas UA - Room Booking System

## 📋 Overview

**SiReS Bibliotecas UA** is a comprehensive room and study space reservation system designed for the University of Aveiro. It provides a seamless booking experience for students and faculty, allowing them to reserve study rooms, laboratories, and amphitheaters efficiently.

The system features:
- 🔐 OTP-based authentication (One-Time Password)
- 📅 Real-time availability checking
- 📧 Email notifications for reservations
- 🗓️ Calendar integration (ICS format)
- 👥 Role-based access control (User, Librarian, Admin)
- 🌐 WebSocket support for real-time updates
- 🎨 Official UA branding and improved Dark Mode
- 📱 Responsive web interface
- 🐳 Docker support for easy deployment

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v7 or higher)
- **Docker & Docker Compose** (optional, for containerized deployment)
- **Vercel Account** (optional, for Vercel deployment)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fmbento/Reserva-de-Salas-de-Estudo.git
   cd Reserva-de-Salas-de-Estudo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (see [Configuration](#-configuration) section)

4. **Run the application:**

   **Development mode:**
   ```bash
   npm run dev
   ```

   **Production build:**
   ```bash
   npm run build
   npm run start
   ```

The application will be available at `http://localhost:3000`

---

## 🔼 Vercel Deployment

This application is optimized for Vercel deployment using **Vercel Blob Storage** for SQLite persistence.

### Steps to Deploy

1. **Create a Vercel Project** and link it to your repository.
2. **Enable Vercel Blob Storage** in your Vercel project settings.
3. **Configure Environment Variables** in Vercel (see below).
4. **Deploy!** Vercel will automatically use `vercel.json` for configuration.

### Required Vercel Environment Variables

- `DEPLOY_TO=vercel`
- `BLOB_READ_WRITE_TOKEN`: Automatically provided by Vercel when Blob is enabled.
- `ADMIN_EMAIL`: Your admin email.
- `SMTP_*`: Your email configuration variables.

---

## 🐳 Docker Deployment

### Using Docker Compose

1. **Build and run containers:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Application: `http://localhost:3000`
   - Database: Persisted in `./data` directory

### Configuration with Docker

Modify the `.env` file before running `docker-compose up`:

```bash
docker-compose up --build -d
```

---

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server
NODE_ENV=development
PORT=3000

# Authentication
ADMIN_EMAIL=sbidm-biblioteca@ua.pt

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="SiReS Bibliotecas UA" <your-email@gmail.com>

# Google Gemini API (optional, for AI features)
GEMINI_API_KEY=your-api-key-here
```

**Important:** 
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password
- Only `@ua.pt` email addresses and configured admin emails are allowed to register

---

## 📁 Project Structure

```
Reserva-de-Salas-de-Estudo/
├── src/
│   ├── App.tsx          # Main React application
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
├── server.ts            # Express backend server
├── index.html           # HTML template
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker image definition
├── .env.example         # Environment variables template
└── data/
    ├── salas.db         # SQLite database (auto-created)
    └── maps.txt         # Floor plan image mappings (auto-reloads on change)
```

---

## 🗺️ Floor Plan Customization

The system allows dynamic customization of floor plan images without restarting the server.

### Configuration
Edit the file `data/maps.txt` to map building/floor/section combinations to image URLs. The format is `Building-Floor-Section: URL`.

**Example `data/maps.txt`:**
```text
17-1-Frente: https://api-assets.ua.pt/files/imgs/000/035/167/original.png
17-2-Trás: https://api-assets.ua.pt/files/imgs/000/035/168/original.png
18-1-Frente: https://picsum.photos/seed/ua-18-1-Frente/1200/800
```

### Features
- **Automatic Reload**: The server watches for changes in `data/maps.txt` and reloads the mappings instantly.
- **Persistent Volume**: In Docker deployments, this file is stored in the `/data` volume, making it easy to manage from the host machine.
- **Fallback**: If a mapping is not found, the system uses a default placeholder image.

---

## 🛠️ Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run lint

# Preview production build
npm run preview
```

---

## 💾 Database

The application uses **SQLite** (`better-sqlite3`) for data persistence. The database is automatically created and initialized on first run.

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' -- 'user', 'bibliotecário', 'admin', 'blocked'
);
```

#### Rooms Table
```sql
CREATE TABLE rooms (
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
```

#### Reservations Table
```sql
CREATE TABLE reservations (
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
```

#### OTPs Table
```sql
CREATE TABLE otps (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT,
  expires_at DATETIME NOT NULL
);
```

---

## 🔐 Authentication

The system uses **OTP (One-Time Password)** authentication:

1. User requests OTP with their email
2. 5-digit code is sent via email (valid for 10 minutes)
3. User enters code to verify identity
4. First-time users are automatically registered
5. Returning users are logged in

**Security Notes:**
- OTPs expire after 10 minutes
- Only `@ua.pt` email addresses are allowed
- Admin emails can be configured via `ADMIN_EMAIL` environment variable

---

## 📧 Email Notifications

The system sends automated emails for:

- **Welcome Email** - When new user registers
- **Reservation Pending** - When reservation request is submitted
- **Reservation Confirmed** - When admin approves reservation (includes ICS calendar file)
- **Reservation Cancelled** - When reservation is cancelled

Emails are formatted in Portuguese and include:
- Room details
- Date and time information
- Reservation status
- Calendar integration (ICS format for confirmed reservations)

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/request-otp` - Request one-time password
- `POST /api/auth/verify-otp` - Verify OTP and login/register

### Rooms
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create new room (admin only)
- `PUT /api/rooms/:id` - Update room details (admin only)

### Reservations
- `GET /api/reservations` - List all reservations
- `POST /api/reservations` - Create new reservation
- `DELETE /api/reservations/:id` - Cancel reservation
- `PATCH /api/reservations/:id/status` - Update reservation status

### Users
- `GET /api/users` - List all users
- `GET /api/user/me` - Get current user profile

### Maps
- `GET /api/maps` - Get floor plan image mappings

### Health
- `GET /api/health` - Health check endpoint

---

## 🔄 Real-Time Updates

The application uses **WebSockets** for real-time updates:

- `ROOMS_UPDATED` - When room information changes
- `RESERVATIONS_UPDATED` - When reservations are created/modified
- `USERS_UPDATED` - When new users register

Connected clients receive instant updates without page refresh.

---

## 🎨 Technology Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling with modern engine
- **Lucide React** - Icons
- **Motion** - Animations
- **Recharts** - Data visualization
- **D3** - Advanced charting
- **React Markdown** - Markdown rendering

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **SQLite** - Database
- **Nodemailer** - Email service
- **WebSocket** - Real-time communication
- **ICS** - Calendar file generation
- **Google Generative AI** - AI integration

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Filipe Bento**
- GitHub: [@fmbento](https://github.com/fmbento)

---

## 📞 Support

For support, please contact:
- **Library Services:** sbidm-biblioteca@ua.pt
- **Project Issues:** [GitHub Issues](https://github.com/fmbento/Reserva-de-Salas-de-Estudo/issues)

---

## 📚 Additional Resources

- [University of Aveiro](https://www.ua.pt/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

## 🔄 Changelog

### Version 0.3.3 (March 27, 2026)
- **Room Creation**: Implemented "Add New Room" functionality in the Backoffice with a dedicated `POST /api/rooms` endpoint.
- **Improved Validation**: Added server-side validation for room IDs to prevent duplicates and ensure data integrity.
- **Deployment Fixes**: Resolved critical deployment errors related to ESM module resolution and production dependencies in Cloud Run.
- **Enhanced Translations**: Added new translation keys for room management errors and success messages in both Portuguese and English.

### Version 0.3.2 (March 26, 2026)
- **Map Alignment Fix**: Forced map container to a 1:1 aspect ratio (`aspect-square`) and used `object-cover` to ensure room markers stay correctly positioned regardless of window size.
- **Inactive Room Filtering**: Updated map view to automatically hide rooms with "Inactive" status.
- **Improved Map Visibility**: Increased map image opacity and removed text overlays for better clarity.

### Version 0.3.1 (March 26, 2026)
- **Dynamic Floor Plans**: Implemented `maps.txt` in the `data/` directory for easy customization of floor plan images.
- **Hot-Reloading Maps**: Added a file watcher to the server to automatically reload map mappings when `maps.txt` is updated.
- **Map View Optimization**: Removed text overlays from maps and improved image scaling (`object-contain`) to maintain aspect ratio.

### Version 0.3.0 (March 26, 2026)
- **Hierarchical Room Mapping**: Organized rooms by Building, Floor, and Section (Front/Back) with interactive filters.
- **User Management**: New administrative view to search users by email and manage roles (User, Librarian, Blocked).
- **Security Enhancements**: Implemented "Blocked" status to prevent access for specific accounts.
- **Data Standardization**: Standardized room capacities to 1 and default amenities (Eduroam, Tomadas) for study rooms.
- **UI Refinements**: Integrated official UA logo in header and login, improved navigation, and fixed theme toggle issues.

### Version 0.2.0 (March 25, 2026)
- **Official Branding**: Integrated official University of Aveiro logo in login and navigation.
- **Tailwind CSS v4**: Upgraded styling engine for better performance and modern features.
- **Enhanced Dark Mode**: Improved theme switching with persistent preferences and smooth transitions.
- **UX Improvements**: Added click-outside detection for dropdown menus and improved mobile navigation.
- **Bug Fixes**: Resolved issues with theme persistence and UI responsiveness.

### Version 0.1.0
- Initial release
- Core reservation system
- OTP authentication
- Email notifications
- WebSocket real-time updates
- Admin panel
- Docker support

---

**Last Updated:** March 27, 2026
```

This README provides:
- ✅ Clear project overview
- ✅ Quick start guide
- ✅ Docker instructions
- ✅ Complete configuration guide
- ✅ Database schema documentation
- ✅ API endpoint reference
- ✅ Technology stack information
- ✅ Troubleshooting guidance
- ✅ Contributing guidelines
- ✅ Professional formatting
