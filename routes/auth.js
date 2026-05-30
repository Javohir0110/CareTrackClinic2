import express from 'express'
import { getDB } from '../models/db.js'

const router = express.Router()

router.post('/login', async (req, res) => {
	const { username, password } = req.body
	try {
		const db = getDB()
		const user = await db.collection('users').findOne({ username, password })
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "Foydalanuvchi nomi yoki parol noto'g'ri!"
			})
		}
		res.json({
			success: true,
			message: "Tizimga muvaffaqiyatli kirildi",
			user: {
				userId: user.userId,
				username: user.username,
				role: user.role,
				fullName: user.fullName,
				specialty: user.specialty || null
			}
		})
	} catch (error) {
		console.error("Login Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Fetch all staff users for chat list
router.get('/users', async (req, res) => {
	try {
		const db = getDB()
		const users = await db.collection('users')
			.find({}, { projection: { password: 0 } })
			.toArray()
		res.json({
			success: true,
			users
		})
	} catch (error) {
		console.error("Fetch Users Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

export default router
