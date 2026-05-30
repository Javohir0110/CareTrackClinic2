# 🏥 CareTrack Clinic - Tibbiy Hujjatlar Boshqaruv Tizimi

**Medical Records Management System - A comprehensive solution for healthcare clinics**

---

## 📋 PROJECT OVERVIEW

CareTrack Clinic is a complete Medical Records Management System designed in **pure Uzbek language** to eliminate paperwork, reduce clinical errors, and streamline data exchange between hospital departments. Built with modern web technologies following **Clean Code** principles.

### ✨ Key Features

- ✅ **Glassmorphism Design** - Modern, elegant UI with soft blur effects and transparency
- ✅ **Role-Based Access Control** - Admin, Doctor, Receptionist with specific permissions
- ✅ **Complete CRUD Operations** - Manage doctors, patients, diagnoses, and appointments
- ✅ **Real-time Chat System** - Communication between doctors, receptionists, and departments
- ✅ **Patient Queue Management** - Efficient appointment and consultation scheduling
- ✅ **Diagnosis Tracking** - Historical records and status management
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile devices
- ✅ **Pure Vanilla Stack** - No frameworks, just HTML5, CSS3, and ES6+ JavaScript

---

## 🚀 TECH STACK

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Glassmorphism styling, Grid/Flexbox layouts
- **JavaScript (ES6+)** - Modern vanilla JS with modules

### Backend

- **Node.js** - Server runtime
- **Express.js** - Web framework (ESM modules)
- **MongoDB** - NoSQL database (ready for integration)

### Architecture

- **Clean Code Principles** - Semantic naming, modular structure
- **No Frameworks** - Pure vanilla HTML, CSS, JavaScript
- **API-First Design** - RESTful endpoints for all operations

---

## 📁 PROJECT STRUCTURE

```
CareTrack-Clinic/
├── public/
│   ├── css/
│   │   └── styles.css              # Global Glassmorphism theme & components
│   ├── js/
│   │   ├── auth.js                 # Authentication & session management
│   │   ├── receptionist-dashboard.js
│   │   ├── doctor-dashboard.js
│   │   └── admin-dashboard.js
│   ├── pages/
│   │   ├── receptionist-dashboard.html
│   │   ├── doctor-dashboard.html
│   │   └── admin-dashboard.html
│   ├── assets/                     # Images, icons (for future use)
│   └── index.html                  # Login page
├── routes/                         # API routes (ready for expansion)
├── models/                         # Database models (MongoDB schemas)
├── middleware/                     # Custom middleware (auth, logging)
├── server.js                       # Main Express server
├── package.json                    # Node.js dependencies
└── README.md                       # This file
```

---

## 🔐 USER ROLES & PERMISSIONS

### 1. **Administrator** (FULL CONTROL)

- ✅ Create, Read, Update, Delete all entities
- ✅ Manage doctors, patients, receptionists, diagnoses
- ✅ Access reports and system analytics
- ✅ System configuration and backups

**Demo Account:**

```
Username: admin_uz
Password: Admin@12345
```

### 2. **Doctor** (LIMITED PERMISSIONS)

- ✅ View assigned patient queues
- ✅ Add and edit diagnoses (cannot delete)
- ✅ Mark diagnoses as "Completed" (Yakunlangan)
- ✅ View historical diagnoses for patients
- ✅ Transfer patients to other doctors
- ❌ Cannot alter patient bio data
- ❌ Cannot delete diagnoses (preserved for history)

**Demo Accounts:**

```
Doctor 1 - Terapeut (Family Doctor):
Username: doctor_shukur
Password: Doctor@12345

Doctor 2 - Kardiolog (Cardiologist):
Username: doctor_zarina
Password: Doctor@12345

Doctor 3 - Pediatr (Pediatrician):
Username: doctor_anvar
Password: Doctor@12345
```

### 3. **Receptionist** (ADMINISTRATIVE)

- ✅ Create and Update patient demographic profiles
- ✅ Cannot delete patients (data preservation)
- ✅ View doctor profile cards (specialty, hours, queue count)
- ✅ Book and reschedule patient appointments
- ✅ Search and filter patients/doctors
- ❌ Cannot delete patient records
- ❌ Cannot access medical diagnoses

**Demo Account:**

```
Username: reception_uz
Password: Recept@12345
```

---

## 📊 DATA MODELS

### Patient

```
{
  id: string,
  name: string,
  dateOfBirth: date,
  address: string,
  phone: string,
  gender: enum("Erkak", "Ayol"),
  linkedFamilyDoctor: ObjectId (Doctor),
  diagnoses: [ObjectId] (Diagnosis)
}
```

### Diagnosis

```
{
  id: string,
  patientId: ObjectId,
  diseaseName: string,
  diagnosticResults: text,
  generalNotes: text,
  treatmentRecommendations: text,
  severity: enum("Yengil", "O'rtacha", "Og'ir"),
  status: enum("Faol", "Davolanmoqda", "Yakunlangan"),
  createdDate: date,
  updatedDate: date,
  createdBy: ObjectId (Doctor)
}
```

### Doctor

```
{
  id: string,
  name: string,
  specialty: string,
  dateOfBirth: date,
  gender: enum("Erkak", "Ayol"),
  phone: string,
  address: string,
  assignedNurses: [ObjectId],
  workingDays: string,
  workingHours: string,
  currentQueueCount: number
}
```

### Receptionist

```
{
  id: string,
  name: string,
  dateOfBirth: date,
  gender: enum("Erkak", "Ayol"),
  address: string,
  phone: string,
  email: string
}
```

---

## 🎨 DESIGN SPECIFICATIONS

### Color Palette

- **Pastel Blue** (och ko'k): `#B8E0FF`
- **Pastel Pink** (och pushti): `#FFB8E6`
- **Glassmorphic Background**: `rgba(255, 255, 255, 0.15)` with `blur(10px)`

### Component Styling

- ✅ **All corners rounded** (border-radius: 10-20px)
- ✅ **Glassmorphism effect** on all cards and buttons
- ✅ **No sharp edges** - semantic, smooth design
- ✅ **Consistent spacing** - Grid and flexbox layouts
- ✅ **Accessible colors** - High contrast for readability

### Layout Structures

- **Header**: Logo + Title on left, Notifications + Cabinet + Logout on right
- **Switchers**: Tab-based navigation for each role
- **Cards**: Glassmorphic containers for doctors (3-column grid on desktop)
- **Forms**: Modal overlays with clean input fields
- **Footer**: Cohesive footer on all pages

---

## 🚦 GETTING STARTED

### Prerequisites

- Node.js 16+ installed
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Navigate to project directory:**

   ```bash
   cd /home/javohir/Desktop/New\ Folder\ 1/CareTrack-Clinic
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the server:**

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

4. **Access the application:**

   ```
   Open browser: http://localhost:3000
   ```

5. **Login with demo accounts:**
   - Admin: `admin_uz` / `Admin@12345`
   - Doctor: `doctor_shukur` / `Doctor@12345`
   - Receptionist: `reception_uz` / `Recept@12345`

---

## 📱 APPLICATION WORKFLOWS

### 1. **Login Page**

- Centered glassmorphic card
- Username and password fields
- Demo account information displayed
- Session management with localStorage

### 2. **Receptionist Dashboard**

- **Shifokorlar** (Doctors): 3-column grid, search, "Show All" toggle
- **Bemorlar** (Patients): Vertical list, search, "Add New Patient" button
- **Chat**: Private messaging with doctors and departments

### 3. **Doctor Dashboard**

- **Navbatlar** (Queues): Patient list with appointment times
- **Tashxislar** (Diagnoses): Active diagnoses with edit/complete options
- **Chat**: Communication with receptionists and other doctors

### 4. **Admin Dashboard**

- **Shifokorlar**: Full CRUD table with all doctor management
- **Bemorlar**: Full CRUD table with all patient management
- **Tashxislar**: View all diagnoses, manage severity and status
- **Chat**: System-wide messaging

---

## 🔧 API ENDPOINTS (Ready for Backend Integration)

### Authentication

```
POST   /api/auth/login           - User login
POST   /api/auth/logout          - User logout
GET    /api/auth/session         - Get current session
```

### Doctors

```
GET    /api/doctors              - Get all doctors
POST   /api/doctors              - Create new doctor (Admin)
PUT    /api/doctors/:id          - Update doctor (Admin)
DELETE /api/doctors/:id          - Delete doctor (Admin)
GET    /api/queue/:doctorId      - Get doctor's queue
```

### Patients

```
GET    /api/patients             - Get all patients
POST   /api/patients             - Create patient (Receptionist, Admin)
PUT    /api/patients/:id         - Update patient (Receptionist, Admin)
GET    /api/patients/:id         - Get patient details
```

### Diagnoses

```
GET    /api/diagnoses/:patientId - Get patient's diagnoses
POST   /api/diagnoses            - Create diagnosis (Doctor, Admin)
PUT    /api/diagnoses/:id        - Update diagnosis (Doctor, Admin)
DELETE /api/diagnoses/:id        - Delete diagnosis (Admin only)
```

### Appointments

```
POST   /api/appointments         - Book appointment (Receptionist)
PUT    /api/appointments/:id     - Reschedule appointment (Receptionist)
GET    /api/queue/:doctorId      - Get doctor's appointment queue
```

### Chat

```
GET    /api/messages/:userId     - Get user's messages
POST   /api/messages             - Send message
GET    /api/channels             - Get chat channels
```

---

## 🛠️ NEXT STEPS FOR PRODUCTION

1. **Database Integration**
   - Connect MongoDB with Mongoose schemas
   - Create database models for all entities
   - Implement data validation

2. **Authentication & Security**
   - Implement JWT token-based authentication
   - Add password encryption (bcrypt)
   - Implement rate limiting and CORS

3. **API Enhancement**
   - Complete all endpoint implementations
   - Add error handling and logging
   - Implement middleware for role-based access control

4. **Frontend Enhancements**
   - Connect to backend API endpoints
   - Implement real-time data updates
   - Add form validation and error messages

5. **Testing**
   - Unit tests for backend
   - Integration tests for API endpoints
   - E2E tests for user workflows

6. **Deployment**
   - Docker containerization
   - CI/CD pipeline setup
   - Production server deployment
   - SSL certificate setup

---

## 📝 CODE QUALITY

### Clean Code Principles Applied

- ✅ **Semantic HTML5** - Meaningful markup
- ✅ **Modular CSS** - Organized with utility classes
- ✅ **ES6+ JavaScript** - Modern syntax, arrow functions, modules
- ✅ **No Duplication** - Reusable components and utilities
- ✅ **Clear Naming** - Self-documenting code
- ✅ **Comments** - Where logic is complex
- ✅ **Consistent Formatting** - Proper indentation and spacing

---

## 🌐 INTERNATIONALIZATION (i18n)

The entire system is built in **pure Uzbek language** with:

- ✅ Uzbek UI labels and buttons
- ✅ Uzbek form placeholders
- ✅ Uzbek status messages
- ✅ Uzbek date formats
- ✅ Uzbek number formats

---

## 📞 SUPPORT & DOCUMENTATION

For detailed documentation on each module, refer to:

- Frontend modules in `/public/js/` - Each has detailed comments
- CSS utilities in `/public/css/styles.css` - Well-organized sections
- HTML pages in `/public/pages/` - Semantic structure

---

## 📄 LICENSE

CareTrack Clinic © 2026. All rights reserved.

---

## 🎯 PROJECT STATUS

✅ **Phase 1 Complete**: Project structure, UI design, mock data, basic functionality
📋 **Phase 2 Ready**: MongoDB integration, complete API implementation, advanced features
🚀 **Production Ready**: When Phase 2 is completed and tested

---

**Built with ❤️ for healthcare excellence**

🏥 CareTrack Clinic - Tibbiy Hujjatlar Boshqaruv Tizimi
# CareTrackClinic2
