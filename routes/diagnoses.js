import express from 'express'
import { getDB } from '../models/db.js'

const router = express.Router()

// Fetch all diagnoses (for Admin)
router.get('/', async (req, res) => {
	try {
		const db = getDB()
		const diagnoses = await db.collection('diagnoses').find({}).toArray()
		res.json({
			success: true,
			message: "Tashxislar ro'yxati",
			diagnoses: diagnoses
		})
	} catch (error) {
		console.error("Fetch Diagnoses Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Fetch diagnoses for a specific patient
router.get('/:patientId', async (req, res) => {
	const { patientId } = req.params
	try {
		const db = getDB()
		const diagnoses = await db.collection('diagnoses').find({ patientId }).toArray()
		res.json({
			success: true,
			message: "Bemor tashxislari ro'yxati",
			diagnoses: diagnoses
		})
	} catch (error) {
		console.error("Fetch Patient Diagnoses Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Create new diagnosis
router.post('/', async (req, res) => {
	const {
		patientId,
		diseaseName,
		diagnosticResults,
		generalNotes,
		treatmentRecommendations,
		severity,
		status
	} = req.body

	try {
		const db = getDB()

		// Fetch patient name to store in diagnosis
		const patient = await db.collection('patients').findOne({ id: patientId })
		const patientName = patient ? patient.name : 'Noma\'lum'

		const diagnosisId = `diagnosis_${Date.now()}`
		const newDiagnosis = {
			id: diagnosisId,
			patientId,
			patientName,
			diseaseName,
			diagnosticResults: diagnosticResults || '',
			generalNotes: generalNotes || '',
			treatmentRecommendations: treatmentRecommendations || '',
			severity: severity || 'yengil',
			status: status || 'davolanmoqda',
			createdDate: new Date().toISOString().split('T')[0]
		}

		await db.collection('diagnoses').insertOne(newDiagnosis)

		res.json({
			success: true,
			message: 'Tashxis yaratildi',
			diagnosis: newDiagnosis
		})
	} catch (error) {
		console.error("Create Diagnosis Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Update diagnosis
router.put('/:id', async (req, res) => {
	const { id } = req.params
	const {
		diseaseName,
		diagnosticResults,
		generalNotes,
		treatmentRecommendations,
		severity,
		status
	} = req.body

	try {
		const db = getDB()

		const updateFields = {}
		if (diseaseName !== undefined) updateFields.diseaseName = diseaseName
		if (diagnosticResults !== undefined) updateFields.diagnosticResults = diagnosticResults
		if (generalNotes !== undefined) updateFields.generalNotes = generalNotes
		if (treatmentRecommendations !== undefined) updateFields.treatmentRecommendations = treatmentRecommendations
		if (severity !== undefined) updateFields.severity = severity
		if (status !== undefined) updateFields.status = status

		const result = await db.collection('diagnoses').findOneAndUpdate(
			{ id: id },
			{ $set: updateFields },
			{ returnDocument: 'after' }
		)

		if (!result) {
			return res.status(404).json({ success: false, message: "Tashxis topilmadi" })
		}

		res.json({
			success: true,
			message: 'Tashxis yangilandi',
			id,
			diagnosis: result
		})
	} catch (error) {
		console.error("Update Diagnosis Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Delete diagnosis (needed for admin dashboard deletion)
router.delete('/:id', async (req, res) => {
	const { id } = req.params
	try {
		const db = getDB()
		const result = await db.collection('diagnoses').deleteOne({ id: id })
		if (result.deletedCount === 0) {
			return res.status(404).json({ success: false, message: "Tashxis topilmadi" })
		}
		res.json({
			success: true,
			message: "Tashxis o'chirildi",
			id
		})
	} catch (error) {
		console.error("Delete Diagnosis Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

export default router
