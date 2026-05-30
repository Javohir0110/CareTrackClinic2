import express from 'express'
import { getDB } from '../models/db.js'

const router = express.Router()

// Get patient queue for a specific doctor
router.get('/queue/:doctorId', async (req, res) => {
	const { doctorId } = req.params
	try {
		const db = getDB()
		
		// Find all pending appointments for this doctor
		const appointments = await db.collection('appointments')
			.find({ doctorId, status: 'pending' })
			.toArray()
			
		const queue = []
		
		for (const appt of appointments) {
			const patient = await db.collection('patients').findOne({ id: appt.patientId })
			if (patient) {
				queue.push({
					id: patient.id,
					appointmentId: appt.id,
					name: patient.name,
					dob: patient.dob,
					phone: patient.phone,
					appointmentTime: appt.appointmentTime,
					appointmentDate: appt.appointmentDate
				})
			}
		}
		
		res.json({
			success: true,
			message: "Navbat ro'yxati",
			queue: queue
		})
	} catch (error) {
		console.error("Fetch Queue Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Get patient appointments history / details
router.get('/appointments', async (req, res) => {
	const { patientId } = req.query
	try {
		const db = getDB()
		let query = {}
		if (patientId) {
			query.patientId = patientId
		}
		const appointments = await db.collection('appointments').find(query).toArray()
		
		const list = []
		for (const appt of appointments) {
			const doctor = await db.collection('doctors').findOne({ id: appt.doctorId })
			list.push({
				id: appt.id,
				patientId: appt.patientId,
				doctorId: appt.doctorId,
				doctorName: doctor ? doctor.name : 'Shifokor',
				doctorSpecialty: doctor ? doctor.specialty : 'Umumiy',
				appointmentDate: appt.appointmentDate,
				appointmentTime: appt.appointmentTime,
				status: appt.status
			})
		}
		
		res.json({
			success: true,
			appointments: list
		})
	} catch (error) {
		console.error("Fetch Patient Appointments Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Book a new appointment / Add patient to queue
router.post('/appointments', async (req, res) => {
	const { patientId, doctorId, appointmentDate, appointmentTime } = req.body
	try {
		const db = getDB()
		
		const appointmentId = `appt_${Date.now()}`
		const newAppointment = {
			id: appointmentId,
			patientId,
			doctorId,
			appointmentDate: appointmentDate || new Date().toISOString().split('T')[0],
			appointmentTime: appointmentTime || new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
			status: 'pending' // pending, completed
		}
		
		await db.collection('appointments').insertOne(newAppointment)
		
		res.json({
			success: true,
			message: 'Qabul belgilandi',
			appointment: newAppointment
		})
	} catch (error) {
		console.error("Book Appointment Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Complete an appointment (remove from queue / mark as completed)
router.post('/appointments/complete', async (req, res) => {
	const { patientId, doctorId } = req.body
	try {
		const db = getDB()
		
		// Mark appointment as completed
		await db.collection('appointments').updateOne(
			{ patientId, doctorId, status: 'pending' },
			{ $set: { status: 'completed' } }
		)
		
		res.json({
			success: true,
			message: 'Qabul yakunlandi'
		})
	} catch (error) {
		console.error("Complete Appointment Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

export default router
