# 🏢 Baan KM-3 Information System

A comprehensive web-based information system designed for the Barangay Baan KM-3 in Butuan City, Philippines.

## 🚀 Features

### 👥 Multi-Role Support

- **Administrator**: Complete system management and oversight
- **Staff**: Patient care and record management
- **Patient**: Personal health management and appointment booking

### 📋 Core Modules

#### Admin Features

- ✅ User account creation with automatic credential generation
- ✅ Staff and patient management
- ✅ Appointment scheduling and oversight
- ✅ Medical records management
- ✅ System notifications and alerts
- ✅ Reports and analytics dashboard
- ✅ Protected system administrator account (cannot be deleted)

#### Staff Management

The admin can manage staff members through the **Manage Staff** module:

- **Create Staff**: When creating a new staff member, the system automatically generates:
  - **Username**: `firstname.surname` (lowercase)
  - **Default Password**: `Surname_Firstname<last-4-digits-of-contact-number>`
    - Example: For "Juan Dela Cruz" with contact "09171234567", password would be `DelaCruz_Juan4567`
  - Credentials are displayed after creation for secure sharing with the staff member
- **Edit Staff**: Update staff information including name, contact details, and status
- **Delete Staff**: Remove staff members from the system
  - ⚠️ **Note**: The system administrator account (`admin@clinic.com`) cannot be deleted for security purposes
- **Last Login Tracking**: The system displays the last sign-in time for each staff member from Supabase Auth

#### Nurse Features

- ✅ Patient registration and management
- ✅ Medical record creation and editing
- ✅ Appointment request handling
- ✅ Treatment protocol management
- ✅ Consultation notes documentation

#### Patient Features

- ✅ Personal health dashboard
- ✅ Appointment booking and management
- ✅ Medical record access
- ✅ Health reminders and notifications

## 🛠️ Tech Stack & Architecture

The project uses a **hybrid architecture** combining a Vue.js frontend, a Supabase Backend-as-a-Service, and a lightweight Node.js/Express server.

### 🌐 Frontend (Client)

- **Framework**: Vue.js 3
- **State Management**: Pinia
- **Routing**: Vue Router
- **Styling**: Bootstrap 5 + Custom CSS
- **Interactions**: Direct communication with Supabase for most data operations

### ☁️ Supabase (Primary Backend)

- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Data Access**: Client-side queries for Patients, Staff, Medical Records, Appointments
- **Realtime**: Live updates for appointments and notifications

### ⚙️ Express Server (Auxiliary Backend)

- **Role**: Handles sensitive operations and third-party integrations
- **Endpoints**:
  - `/api/emails/*` - Automated email notifications
  - `/api/admin/accounts/*` - Account creation logging and history
  - `/api/auth/logout` - Server-side session cleanup
- **Location**: `/server` directory

## 🚦 Getting Started

### Prerequisites

- Node.js (v16+)
- Supabase Project
- Gmail Account (for email service)

### running the Application

To run the complete application (Frontend + Express Server), use:

```bash
npm run dev:full
```

Or run them individually in separate terminals:

```bash
# Terminal 1: Frontend (Vite) - http://localhost:5173
npm run dev

# Terminal 2: Backend (Express) - http://localhost:3000
npm run server
```

### Environment Setup

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd patient-record-system-3
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   # Copy environment file
   cp .env.example .env

   # Configure your Supabase credentials
   # Get these from: Supabase Dashboard -> Settings -> API

   VITE_SUPABASE_URL=your_supabase_url

   # Frontend key (publishable)
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

   # Backend key (secret, server-side only)
   SUPABASE_SECRET_KEY=sb_secret_xxx
   ```

4. **Start development server**

   ```bash
   npm run dev:full
   ```

5. **Access the application**

   ```bash
   http://localhost:5173
   ```

## 🔐 Demo Accounts

### Test Users

Use these credentials to test different user roles:

#### Administrator

- **Username**: `admin`
- **Password**: `password`
- **Access**: Full system administration

#### Staff

- **Username**: `nurse`
- **Password**: `password`
- **Access**: Patient management and records

#### Patient

- **Username**: `patient`
- **Password**: `password`
- **Access**: Personal health management

## 📁 Project Structure

```txt
src/
├── components/          # Reusable Vue components
│   ├── RoleBasedSidebar.vue    # Role-specific navigation
│   └── ...
├── views/              # Page components by role
│   ├── admin/          # Administrator views
│   ├── nurse/          # Nurse/Staff views
│   └── patient/        # Patient views
├── stores/             # Pinia state management
│   └── auth.js         # Authentication store
├── router/             # Route definitions
│   ├── admin.js        # Admin routes
│   ├── nurse.js        # Nurse routes
│   └── patient.js      # Patient routes
├── layouts/            # Layout components
└── services/           # API services
```

## 🎨 UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Clean, professional design
- **Role-Based Navigation**: Dynamic sidebar based on user permissions
- **Interactive Dashboards**: Real-time statistics and charts
- **Smooth Animations**: Enhanced user experience
- **Dark/Light Theme Support**: Adaptive theming

## 🔒 Security Features

- **Role-Based Access Control (RBAC)**
- **Secure Authentication** via Supabase
- **Password Encryption** for production
- **Audit Logging** for sensitive actions
- **Session Management** with auto-logout

## 📱 Mobile Support

- **Responsive Layouts**: Optimized for all screen sizes
- **Touch-Friendly**: Large buttons and easy navigation
- **Mobile-First**: Designed for users on-the-go

## 🚀 Deployment

### Supabase Setup

1. **Create a new project** in Supabase
2. **Set up authentication** with email/password
3. **Create database tables** based on the schema provided
4. **Configure RLS policies** for data security

### Build for Production

```bash
npm run build
```

### Run in Production

To run the application in production mode (serves the built frontend from the express server):

```bash
# Set environment to production
export NODE_ENV=production

# Start the server
npm start
```

### ☁️ Vercel Deployment

This project is configured for deployment on Vercel with Serverless Functions:

1. **Frontend**: Deployed as a single-page application (SPA)
2. **Backend**: Deployed as Serverless Functions (`/api/*`) via the `/api` directory

The configuration is handled automatically by `vercel.json` and `api/index.js`.

**Important**: When deploying to Vercel, you must manually add the following Environment Variables in the Vercel Dashboard:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (Required for admin operations)
- `JWT_SECRET`
- `NODE_ENV` (Set to `production`)

### 🧪 Local Production Testing

To simulate the production environment locally (serving both the built frontend and the Express API on port 3000):

```bash
npm run preview:full
```

This ensures that API calls to `/api/...` work correctly alongside the static frontend assets, just like in production.

## 📊 Database Schema

See the detailed schema in the project requirements for table structures including:

- Users and Roles
- Staff and Patient management
- Appointments and scheduling
- Medical records and history
- Notifications and alerts

## 🔧 Development

### Adding New Features

1. **Create views** in appropriate role directories
2. **Add routes** to respective router files
3. **Update navigation** in RoleBasedSidebar.vue
4. **Add state management** in Pinia stores

### Code Style

- **ESLint** for code quality
- **Prettier** for formatting
- **Vue 3 Composition API** patterns

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Run e2e tests
npm run test:e2e
```
