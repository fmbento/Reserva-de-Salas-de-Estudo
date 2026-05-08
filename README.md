# SiReS Bibliotecas UA - Room Booking System

## 📋 Overview

**SiReS Bibliotecas UA** is a comprehensive room and study space reservation system designed for the University of Aveiro. It provides a seamless booking experience for students and faculty, allowing them to reserve study rooms, laboratories, and amphitheaters efficiently.

The system features:
- 🔐 OTP-based authentication (One-Time Password)
- 📅 Real-time availability checking
- 📧 Email notifications for reservations
- 🗓️ Calendar integration (ICS format)
- ⏱️ Mandatory 15-minute preparation buffer between bookings
- 📊 Reservation limits: Max 3 per day, 5 per week
- 🕒 48-hour advanced booking window
- 📲 Librarian-managed check-in system via Backoffice (available 10 min before/after start)
- 🔔 Automated email reminders and end-of-reservation alerts
- 👥 Role-based access control (User, Librarian, Admin)
- 🌐 Supabase integration for data persistence and real-time features
- 🎨 Official UA branding and improved Dark Mode
- 📱 Responsive web interface with mobile-optimized bottom sheets
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

This application is optimized for Vercel deployment using **Supabase** for data persistence.

### Steps to Deploy

1. **Create a Vercel Project** and link it to your repository.
2. **Set up a Supabase project** and obtain your URL and API keys.
3. **Configure Environment Variables** in Vercel (see below).
4. **Deploy!** Vercel will automatically use `vercel.json` for configuration.

### Required Vercel Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key (for client-side).
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for server-side).
- `ADMIN_EMAIL`: Your admin email.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Email configuration.
- `CRON_SECRET`: (Optional) A secret key to secure the cron endpoint.

### ⏰ Automated Tasks (Cron Jobs)

For background tasks (reminders, auto-cancellation) to work on Vercel, the project is configured to use **Vercel Cron Jobs**.

1. The configuration is in `vercel.json`.
2. **Note for Hobby Accounts:** Vercel Hobby accounts only support **one cron execution per day**. I've set it to `0 5 * * *` (5 AM) to allow deployment.
3. **For Real-time Reminders:** If you need reminders every minute on a Hobby account, you should use an external service like [cron-job.org](https://cron-job.org/) to ping the endpoint `https://your-app.vercel.app/api/cron/automated-tasks` every minute.
4. You can monitor the execution in the **"Cron"** tab of your Vercel project dashboard.

### ⚠️ Vercel Troubleshooting (500 Internal Server Error)

If you encounter a `500: INTERNAL_SERVER_ERROR` or `FUNCTION_INVOCATION_FAILED` on Vercel:

1. **Check Environment Variables**: Ensure all `VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_*`, and `ADMIN_EMAIL` variables are correctly set in the Vercel Dashboard.
2. **Supabase Connectivity**: Verify that your Supabase project is active and the keys are correct.
3. **Native Modules**: If deployment fails, ensure your Node.js version in Vercel matches your local environment (recommended: Node 20.x).
4. **Logs**: Check the **Logs** tab in your Vercel deployment to see the specific error message.

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

## 📑 Booking Rules

To ensure fair access to study spaces, the following rules are enforced:

1.  **Preparation Buffer**: A mandatory 15-minute slot is automatically added between bookings for room preparation and transition.
2.  **Daily Limit**: Each user can have a maximum of **3 reservations per day**.
3.  **Weekly Limit**: Each user can have a maximum of **5 reservations per calendar week** (Monday to Sunday).
4.  **Booking Window**: Reservations are only possible within the **next 48 hours**, starting from the next available 15-minute slot from the current time.
5.  **Check-in**: Users must check in with a librarian at the desk between 10 minutes before and 10 minutes after the reservation start time. Failure to check in results in automatic cancellation.
6.  **Deep Linking**: Direct URLs for rooms are supported in the format `/sala/{ROOM_ID}` (e.g., `/sala/17.3.18`). This allows for QR code creation and direct sharing. Deep links navigate to a specialized "Room Details" list view showing availability for the next 2-3 days.
7.  **Preparation Buffer**: A mandatory 15-minute preparation buffer is enforced between all bookings and is visually respected in both the calendar and list views.

---

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server
NODE_ENV=development
PORT=3000

# Authentication
ADMIN_EMAIL=sbidm-biblioteca@ua.pt

# Supabase (Database)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="SiReS Bibliotecas UA" <your-email@gmail.com>

# Google Gemini API (optional, for AI features)
GEMINI_API_KEY=your-api-key-here

# Default View Configuration
VITE_DEFAULT_ROOM_ID=17.3.18
VITE_DEFAULT_BUILDING=17
VITE_DEFAULT_FLOOR=3
VITE_DEFAULT_SECTION=Frente
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

The application uses **Supabase** for data persistence and real-time features. The database schema is managed in Supabase.

### Database Tables

#### Users Table
- `id`: UUID (Primary Key)
- `name`: Text
- `email`: Text (Unique)
- `role`: Text (Default: 'user')

#### Rooms Table
- `id`: Text (Primary Key)
- `name`: Text
- `building`: Text
- `floor`: Text
- `section`: Text
- `department`: Text
- `status`: Text
- `capacity`: Integer
- `description`: Text
- `operational_status`: Text (Default: 'Active')
- `image`: Text
- `amenities`: JSONB (Default: '[]')
- `top`: Text
- `left`: Text
- `notes`: Text (Maintenance/ELD notes)

#### Reservations Table
- `id`: UUID (Primary Key)
- `room_id`: Text (Foreign Key)
- `user_id`: UUID (Foreign Key)
- `date`: Date
- `start_time`: Time
- `duration`: Integer
- `subject`: Text
- `status`: Text (Default: 'Pending')

#### OTPs Table
- `email`: Text (Primary Key)
- `code`: Text
- `name`: Text
- `expires_at`: Timestamp

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
- **Reservation Reminder** - Sent 15 minutes before start (includes check-in warning)
- **End of Reservation Alert** - Sent 10 minutes before end (includes cleanup reminder)
- **Reservation Cancelled** - When reservation is cancelled (manually or via auto-cancellation)

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
- **Supabase** - Database and Real-time
- **Nodemailer** - Email service
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

### Version 0.7.7 (May 8, 2026)
- **Room Details View**: Introduced a new specialized view for direct room access via deep links.
- **Availability List**: Deep links (`/sala/{roomId}`) now navigate to a dedicated list view showing available time slots for the next 2-3 days.
- **Extended Visibility**: The last "Free" block of the day now extends by 4 hours (the maximum reservation duration) to correctly represent the room's booking potential beyond standard operating hours.
- **Buffer Management**: Implemented a mandatory 15-minute buffer between slots in the Room Details list, ensuring transition time between bookings.
- **Interactive Booking**: Users can click "Livre" (Free) slots to immediately initiate a reservation with pre-filled details.

### Version 0.7.6 (May 6, 2026)
- **Visual Booking Window**: Time slots beyond the 48-hour reservation window are now visually disabled in the "Schedules" grid and filtered out from the start time selection dropdown.
- **Improved Consistency**: Unified the 48-hour limit calculation between the interactive grid and the booking sidebar.

### Version 0.7.5 (May 6, 2026)
- **Deep Linking**: Implemented support for direct room URLs (`/sala/{roomId}`).
- **Navigation Sync**: The application now matches the specific building, floor, and section when a deep link is used to ensure consistency when switching back to the map view.
- **Browser History**: Integrated `window.history` to allow sharing specific room schedules and using browser back/forward buttons for navigation.

### Version 0.7.4 (April 30, 2026)
- **Reservation Limits**: Implemented new business rules for reservations:
    - **Daily Limit**: Users are restricted to a maximum of 3 reservations per day.
    - **Weekly Limit**: Users are restricted to a maximum of 5 reservations per calendar week (Monday to Sunday).
    - **Reservation Window**: Reservations can only be made within a 48-hour window starting from the next available 15-minute slot.

### Version 0.7.3 (April 30, 2026)
- **Default View Configuration**: Added environment variables (`VITE_DEFAULT_ROOM_ID`, `VITE_DEFAULT_BUILDING`, etc.) to configure which room and map area are displayed by default when the application starts.

### Version 0.7.2 (April 14, 2026)
- **Maintenance/ELD Status**: Renamed "Maintenance" status to "Maintenance/ELD" (Empréstimo de Longa Duração) to better reflect room unavailability scenarios.
- **Room Maintenance Notes**: Added a `notes` field to the Rooms table. Librarians can now add specific details (e.g., "Unavailable until 20/04 for painting") when a room is in Maintenance/ELD mode.
- **UI Enhancements**: Maintenance notes are now displayed to users when they attempt to view or book a room that is unavailable.

### Version 0.7.1 (April 13, 2026)
- **Timezone Synchronization**: Fixed a critical issue where automated tasks (reminders/cancellations) used server UTC time instead of the application's timezone (Lisbon).
- **Duration Parsing Fix**: Improved robustness of email notifications and ICS generation by implementing a smart duration parser that handles both raw numbers and formatted strings (e.g., "1 Hora e 30 Minutos").
- **Language Localization**: Automated emails now respect the user's interface language at the time of booking.
- **Supabase Schema Alignment**: Fixed errors related to missing columns in Supabase by ensuring the application gracefully handles schema mismatches and providing SQL migration instructions.

### Version 0.7.0 (April 10, 2026)
- **Vercel Cron Jobs Implementation**: Switched from `setInterval` to native **Vercel Cron Jobs** for production environments. This ensures that automated tasks (reminders, auto-cancellations) run reliably in serverless environments.
- **Map UI Overhaul**:
    - **Global Date/Time Filters**: Moved the reservation date and start time selection from individual room cards to a global filter bar at the top of the map.
    - **Real-time Availability**: Map markers now update their status (Available, Pending, Occupied) instantly based on the globally selected date and time.
    - **Filter Reordering**: Reorganized map filters to follow a more logical flow: Building -> Section (Frente/Trás) -> Floor -> Date -> Time.
    - **Legend Relocation**: Moved the status legend to a fixed bar at the bottom of the map for better visibility and cleaner UI.
- **Security**: Added `CRON_SECRET` support to protect the automated tasks endpoint from unauthorized external calls.

### Version 0.6.0 (April 10, 2026)
- **Preparation Buffer**: Implemented a mandatory 15-minute "Verificação/Preparação" period after each booking. This buffer is visually distinct on the calendar and prevents overlapping reservations.
- **Check-in System**: Added a mandatory check-in requirement. Librarians must perform the check-in via the "Backoffice" view. The button appears 10 minutes before and disappears 10 minutes after the scheduled start time.
- **Automated Notifications**:
    - **Start Reminder**: Automated email sent 15 minutes before the reservation starts.
    - **End Alert**: Automated email sent 10 minutes before the reservation ends with cleanup instructions.
- **Auto-Cancellation**: Implemented a background task that automatically cancels reservations if the user fails to check in within 10 minutes of the scheduled start time.
- **OTP Improvements**: Fixed an issue where users could not paste the full OTP code into the input field.
- **UI Refinements**: Renamed "Departamento" to "Edifício" and updated building options to "Biblioteca da UA" and "Mediateca".

### Version 0.5.0 (April 4, 2026)
- **Database Migration**: Switched from SQLite and Vercel Blob to **Supabase** for improved scalability, persistence, and real-time capabilities.
- **Supabase Integration**: Added `@supabase/supabase-js` and configured both client and server to use Supabase.
- **Mobile UI Improvement**: Added a "Fechar" (Close) button to the mobile bottom sheet for room and reservation details, improving mobile UX.
- **Internationalization**: Added `close` translation key for Portuguese and English.
- **Vercel Deployment**: Updated deployment instructions to reflect the switch to Supabase.

### Version 0.4.4 (March 29, 2026)
- **Vercel Module Resolution Fix**: Moved `translations.ts` to the project root and updated imports to use the `.js` extension. This ensures compatibility with Node.js ESM in Vercel's serverless environment, where `.ts` files are compiled to `.js` and standard Node.js module resolution is enforced.

### Version 0.4.3 (March 29, 2026)
- **MIME Type Fix**: Updated `vercel.json` with `handle: filesystem` to ensure static assets are served correctly by Vercel's edge network, preventing MIME type errors for module scripts.
- **Path Resolution**: Switched to `process.cwd()` for `dist` path resolution in `server.ts` for better Vercel compatibility.

### Version 0.4.2 (March 29, 2026)
- **TypeScript Fixes**: Resolved build errors on Vercel related to `@vercel/blob` type safety.
- **Improved Syncing**: Added token validation before attempting to sync the database back to Vercel Blob.

### Version 0.4.1 (March 29, 2026)
- **Vercel Troubleshooting**: Added detailed troubleshooting steps for common Vercel deployment issues (500 errors).
- **Environment Documentation**: Expanded documentation for required environment variables on Vercel.
- **Robustness**: Improved server-side checks for Vercel environment to prevent unnecessary file watching.

### Version 0.4.0 (March 29, 2026)
- **Vercel Deployment Compatibility**: Refactored the backend to support Vercel's serverless environment.
- **Database Persistence**: Integrated **Vercel Blob Storage** for SQLite persistence, allowing the database to survive serverless function restarts.
- **WebSocket Fallback**: Implemented conditional WebSocket initialization to prevent crashes on serverless platforms.
- **Improved Initialization**: Added concurrency control for database initialization to handle multiple simultaneous requests during cold starts.
- **User Registration Fix**: Added default name generation from email prefix when no name is provided during OTP verification.

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

**Last Updated:** May 08, 2026
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
