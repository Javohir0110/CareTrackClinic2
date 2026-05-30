import express from 'express'
import { getDB } from '../models/db.js'

const router = express.Router()

// Fetch messages for a specific user (sent or received)
router.get('/:userId', async (req, res) => {
	const { userId } = req.params
	try {
		const db = getDB()
		const messages = await db.collection('messages')
			.find({
				$or: [
					{ senderId: userId },
					{ recipientId: userId },
					{ recipientId: 'group_general' }
				]
			})
			.sort({ timestamp: 1 })
			.toArray()

		res.json({
			success: true,
			message: "Xabarlar ro'yxati",
			messages: messages
		})
	} catch (error) {
		console.error("Fetch Messages Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Send a message
router.post('/', async (req, res) => {
	const { senderId, recipientId, content } = req.body
	try {
		const db = getDB()
		const user = await db.collection('users').findOne({ userId: senderId })
		const senderName = user ? user.fullName : 'Xodim'

		const newMessage = {
			id: `msg_${Date.now()}`,
			senderId,
			senderName,
			recipientId,
			content,
			timestamp: new Date().toISOString()
		}

		await db.collection('messages').insertOne(newMessage)

		// Create corresponding notification for the recipient
		const newNotification = {
			id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
			type: 'chat',
			senderId,
			senderName,
			recipientId,
			content: content,
			timestamp: newMessage.timestamp,
			clearedBy: []
		}
		await db.collection('notifications').insertOne(newNotification)

		res.json({
			success: true,
			message: 'Xabar yuborildi',
			messageId: newMessage.id,
			newMessage
		})
	} catch (error) {
		console.error("Send Message Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Edit message content
router.put('/:messageId', async (req, res) => {
	const { messageId } = req.params
	const { content, senderId } = req.body
	if (!content) {
		return res.status(400).json({ success: false, message: "Xabar matni bo'sh bo'lishi mumkin emas" })
	}
	try {
		const db = getDB()
		const message = await db.collection('messages').findOne({ id: messageId })
		if (!message) {
			return res.status(404).json({ success: false, message: "Xabar topilmadi" })
		}
		if (message.senderId !== senderId) {
			return res.status(403).json({ success: false, message: "Sizda ushbu xabarni tahrirlash huquqi yo'q" })
		}

		await db.collection('messages').updateOne(
			{ id: messageId },
			{ $set: { content: content, edited: true, editedAt: new Date().toISOString() } }
		)

		res.json({
			success: true,
			message: "Xabar tahrirlandi"
		})
	} catch (error) {
		console.error("Edit Message Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

// Delete message
router.delete('/:messageId', async (req, res) => {
	const { messageId } = req.params
	const { senderId } = req.body
	try {
		const db = getDB()
		const message = await db.collection('messages').findOne({ id: messageId })
		if (!message) {
			return res.status(404).json({ success: false, message: "Xabar topilmadi" })
		}
		if (message.senderId !== senderId) {
			return res.status(403).json({ success: false, message: "Sizda ushbu xabarni o'chirish huquqi yo'q" })
		}

		await db.collection('messages').deleteOne({ id: messageId })

		res.json({
			success: true,
			message: "Xabar o'chirildi"
		})
	} catch (error) {
		console.error("Delete Message Error:", error)
		res.status(500).json({ success: false, message: "Server xatoligi" })
	}
})

export default router
