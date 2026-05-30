import express from 'express'
import { getDB } from '../models/db.js'

const router = express.Router()

// Fetch all doctors
router.get('/', async (req, res) => {
	try {
		const db = getDB()
		const doctors = await db.collection('doctors').find({}).toArray()
		
		// Calculate live queue count for each doctor
		for (const doctor of doctors) {
			const queueCount = await db.collection('appointments').countDocuments({
				doctorId: doctor.id,
				status: 'pending'
			})
			doctor.queueCount = queueCount
		}

		res.json({
			success: true,
			message: "Shifokorlar ro'yxati",
			doctors: doctors
		})
	} catch (error) {
		console.error("Fetch Doctors Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Dashboard Stats endpoint
router.get('/dashboard-stats', async (req, res) => {
	try {
		const db = getDB()
		const totalPatients = await db.collection('patients').countDocuments({})
		const totalDoctors = await db.collection('doctors').countDocuments({})
		const totalDiagnoses = await db.collection('diagnoses').countDocuments({})
		
		const todayStr = new Date().toISOString().split('T')[0]
		const todayAppointmentsCount = await db.collection('appointments').countDocuments({ appointmentDate: todayStr })
		
		// Visits dynamics (last 7 days)
		const visitsDynamics = []
		for (let i = 6; i >= 0; i--) {
			const d = new Date()
			d.setDate(d.getDate() - i)
			const dateStr = d.toISOString().split('T')[0]
			const count = await db.collection('appointments').countDocuments({ appointmentDate: dateStr })
			const weekdayNames = ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sha"]
			const label = `${weekdayNames[d.getDay()]} (${d.getDate()})`
			visitsDynamics.push({ date: dateStr, label, count })
		}
		
		// KPI Report
		const doctors = await db.collection('doctors').find({}).toArray()
		const kpiReport = []
		for (const doc of doctors) {
			const completedCount = await db.collection('appointments').countDocuments({ doctorId: doc.id, status: 'completed' })
			const totalCount = await db.collection('appointments').countDocuments({ doctorId: doc.id })
			const linkedPatientsCount = await db.collection('patients').countDocuments({ linkedDoctor: doc.id })
			
			let efficiency = 100
			if (totalCount > 0) {
				efficiency = Math.round((completedCount / totalCount) * 100)
			} else {
				const numericId = parseInt(doc.id.replace(/\D/g, '')) || 0
				efficiency = 85 + (numericId % 15 || 5)
			}
			if (efficiency > 100) efficiency = 100
			
			const numericId = parseInt(doc.id.replace(/\D/g, '')) || 0
			const rating = (4.0 + ((numericId % 10) / 10)).toFixed(1)
			
			kpiReport.push({
				doctorName: doc.name,
				specialty: doc.specialty,
				efficiency: efficiency,
				rating: parseFloat(rating),
				patientsCount: linkedPatientsCount + completedCount
			})
		}
		
		res.json({
			success: true,
			stats: {
				totalPatients,
				totalDoctors,
				totalDiagnoses,
				todayAppointments: todayAppointmentsCount,
				visitsDynamics,
				kpiReport
			}
		})
	} catch (error) {
		console.error("Dashboard Stats Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Create a new doctor
router.post('/', async (req, res) => {
	const {
		name, // front-end uses name (in admin-dashboard JS it is parsed from name field)
		specialty,
		dob,
		gender,
		phone,
		address,
		workingDays,
		workingHours,
		username,
		password
	} = req.body

	try {
		const db = getDB()

		// Check if username already exists
		const existingUser = await db.collection('users').findOne({ username })
		if (existingUser) {
			return res.status(400).json({ success: false, message: "Bu foydalanuvchi nomi allaqachon mavjud!" })
		}

		const doctorId = `doctor_${Date.now()}`
		const newDoctor = {
			id: doctorId,
			name,
			specialty,
			dob,
			gender,
			phone,
			address,
			workingDays,
			workingHours,
			username,
			password
		}

		// Save doctor details
		await db.collection('doctors').insertOne(newDoctor)

		// Create corresponding user account
		await db.collection('users').insertOne({
			username,
			password,
			role: 'doctor',
			fullName: name,
			specialty,
			userId: doctorId
		})

		res.json({
			success: true,
			message: 'Shifokor yaratildi',
			doctor: newDoctor
		})
	} catch (error) {
		console.error("Create Doctor Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Update doctor
router.put('/:id', async (req, res) => {
	const { id } = req.params
	const {
		name,
		specialty,
		dob,
		gender,
		phone,
		address,
		workingDays,
		workingHours,
		password
	} = req.body

	try {
		const db = getDB()

		const updateFields = {
			name,
			specialty,
			dob,
			gender,
			phone,
			address,
			workingDays,
			workingHours
		}

		if (password) {
			updateFields.password = password
		}

		// Update doctor info
		const result = await db.collection('doctors').findOneAndUpdate(
			{ id: id },
			{ $set: updateFields },
			{ returnDocument: 'after' }
		)

		if (!result) {
			return res.status(404).json({ success: false, message: "Shifokor topilmadi" })
		}

		// Also update corresponding user account
		const userUpdate = {
			fullName: name,
			specialty
		}
		if (password) {
			userUpdate.password = password
		}

		await db.collection('users').updateOne(
			{ userId: id },
			{ $set: userUpdate }
		)

		res.json({
			success: true,
			message: 'Shifokor yangilandi',
			id,
			doctor: result
		})
	} catch (error) {
		console.error("Update Doctor Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Delete doctor
router.delete('/:id', async (req, res) => {
	const { id } = req.params
	try {
		const db = getDB()

		const doctor = await db.collection('doctors').findOne({ id: id })
		if (!doctor) {
			return res.status(404).json({ success: false, message: "Shifokor topilmadi" })
		}

		// Delete from doctors collection
		await db.collection('doctors').deleteOne({ id: id })

		// Delete corresponding user account
		await db.collection('users').deleteOne({ userId: id })

		res.json({
			success: true,
			message: "Shifokor o'chirildi",
			id
		})
	} catch (error) {
		console.error("Delete Doctor Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

export default router
