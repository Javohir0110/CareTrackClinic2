import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors';
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import auth from './middleware/auth.js'
import logger from './middleware/logger.js'
import { connectDB } from './models/db.js'
import appointmentRoutes from './routes/appointments.js'
import authRoutes from './routes/auth.js'
import diagnosisRoutes from './routes/diagnoses.js'
import doctorRoutes from './routes/doctors.js'
import messageRoutes from './routes/messages.js'
import notificationRoutes from './routes/notifications.js'
import patientRoutes from './routes/patients.js'

// Load environment variables
dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const port = process.env.PORT || 3000

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: 'https://care-track-clinic2.vercel.app', // Vercel'dagi front-end manzilingiz
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  credentials: true
}));
// Preflight OPTIONS so'rovlariga silliq javob qaytarish
app.options('*', cors());

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))

// Custom logger and auth middleware
app.use(logger)
app.use(auth)

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes)
app.use('/api/doctors', doctorRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/diagnoses', diagnosisRoutes)
app.use('/api', appointmentRoutes) // covers /api/appointments and /api/queue/:doctorId
app.use('/api/messages', messageRoutes)
app.use('/api/notifications', notificationRoutes)

// ==================== PAGES ROUTING ====================

// Landing/Login Page
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html')
})

// Dashboard Pages
app.get('/dashboard/admin', (req, res) => {
	res.sendFile(__dirname + '/public/pages/admin-dashboard.html')
})

app.get('/dashboard/doctor', (req, res) => {
	res.sendFile(__dirname + '/public/pages/doctor-dashboard.html')
})

app.get('/dashboard/receptionist', (req, res) => {
	res.sendFile(__dirname + '/public/pages/receptionist-dashboard.html')
})

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
	res.status(404).json({
		success: false,
		error: 'Sahifa topilmadi (404)',
	})
})

// ==================== DATABASE CONNECT & SERVER START ====================
connectDB()
	.then(() => {
		app.listen(port, () => {
			console.log(`
╔════════════════════════════════════════╗
║   🏥 CareTrack Clinic Server          ║
║   ✅ MongoDB ulanishi muvaffaqiyatli  ║
║   🚀 Server ishga tushdi              ║
║   📍 http://localhost:${port}                ║
╚════════════════════════════════════════╝
			`)
		})
	})
	.catch(err => {
		console.error('❌ Baza bilan ulanish yoki serverni yoqishda xatolik:', err)
		process.exit(1)
	})
