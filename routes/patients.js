import express from 'express'
import { getDB } from '../models/db.js'

const router = express.Router()

// Fetch all patients
router.get('/', async (req, res) => {
	try {
		const db = getDB()
		const patients = await db.collection('patients').find({}).toArray()
		res.json({
			success: true,
			message: "Bemorlar ro'yxati",
			patients: patients
		})
	} catch (error) {
		console.error("Fetch Patients Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Get patient details by ID
router.get('/:id', async (req, res) => {
	const { id } = req.params
	try {
		const db = getDB()
		const patient = await db.collection('patients').findOne({ id: id })
		if (!patient) {
			return res.status(404).json({ success: false, message: "Bemor topilmadi" })
		}
		res.json({
			success: true,
			message: "Bemor ma'lumotlari",
			patient: patient
		})
	} catch (error) {
		console.error("Get Patient Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Create patient
router.post('/', async (req, res) => {
	const { name, dob, phone, address, gender, linkedDoctor } = req.body
	try {
		const db = getDB()
		const patientId = `patient_${Date.now()}`
		const newPatient = {
			id: patientId,
			name,
			dob,
			phone,
			address,
			gender,
			linkedDoctor
		}

		await db.collection('patients').insertOne(newPatient)

		res.json({
			success: true,
			message: 'Bemor yaratildi',
			patient: newPatient
		})
	} catch (error) {
		console.error("Create Patient Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Update patient
router.put('/:id', async (req, res) => {
	const { id } = req.params
	const { name, dob, phone, address, gender, linkedDoctor } = req.body
	try {
		const db = getDB()
		const updateData = {
			name,
			dob,
			phone,
			address,
			gender,
			linkedDoctor
		}

		const result = await db.collection('patients').findOneAndUpdate(
			{ id: id },
			{ $set: updateData },
			{ returnDocument: 'after' }
		)

		if (!result) {
			return res.status(404).json({ success: false, message: "Bemor topilmadi" })
		}

		res.json({
			success: true,
			message: 'Bemor yangilandi',
			id,
			patient: result
		})
	} catch (error) {
		console.error("Update Patient Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Delete patient
router.delete('/:id', async (req, res) => {
	const { id } = req.params
	try {
		const db = getDB()
		const result = await db.collection('patients').deleteOne({ id: id })
		if (result.deletedCount === 0) {
			return res.status(404).json({ success: false, message: "Bemor topilmadi" })
		}
		res.json({
			success: true,
			message: "Bemor o'chirildi",
			id
		})
	} catch (error) {
		console.error("Delete Patient Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

export default router
