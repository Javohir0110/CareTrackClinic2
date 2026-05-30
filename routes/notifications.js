import express from 'express'
import { getDB } from '../models/db.js'

const router = express.Router()

// Fetch notifications for a user
router.get('/', async (req, res) => {
	const userId = req.userId || req.query.userId
	if (!userId) {
		return res.status(400).json({ success: false, message: "Foydalanuvchi ID ko'rsatilishi shart" })
	}
	try {
		const db = getDB()
		const notifications = await db.collection('notifications')
			.find({
				$or: [
					{ recipientId: userId },
					{ recipientId: 'all' },
					{ recipientId: 'group_general' }
				],
				clearedBy: { $ne: userId },
				senderId: { $ne: userId }
			})
			.sort({ timestamp: -1 })
			.toArray()

		res.json({
			success: true,
			notifications
		})
	} catch (error) {
		console.error("Fetch Notifications Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Post a new announcement (Admin only)
router.post('/', async (req, res) => {
	const { senderId, content } = req.body
	if (!content) {
		return res.status(400).json({ success: false, message: "E'lon matni bo'sh bo'lishi mumkin emas" })
	}
	try {
		const db = getDB()
		const user = await db.collection('users').findOne({ userId: senderId })
		const senderName = user ? user.fullName : 'Admin'

		const newNotification = {
			id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
			type: 'announcement',
			senderId,
			senderName,
			recipientId: 'all',
			content,
			timestamp: new Date().toISOString(),
			clearedBy: []
		}

		await db.collection('notifications').insertOne(newNotification)

		res.json({
			success: true,
			message: "Yangilik/E'lon muvaffaqiyatli yuborildi",
			notification: newNotification
		})
	} catch (error) {
		console.error("Create Announcement Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Clear all notifications for a user
router.post('/clear', async (req, res) => {
	const { userId } = req.body
	if (!userId) {
		return res.status(400).json({ success: false, message: "Foydalanuvchi ID ko'rsatilishi shart" })
	}
	try {
		const db = getDB()
		await db.collection('notifications').updateMany(
			{
				$or: [
					{ recipientId: userId },
					{ recipientId: 'all' },
					{ recipientId: 'group_general' }
				],
				clearedBy: { $ne: userId }
			},
			{ $addToSet: { clearedBy: userId } }
		)

		res.json({
			success: true,
			message: "Bildirishnomalar tozalandi"
		})
	} catch (error) {
		console.error("Clear Notifications Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

export default router
