// ==================== DOCTOR DASHBOARD MODULE ====================

// Check authentication
if (!window.authModule.requireAuth()) {
	throw new Error('Not authenticated')
}

// Get current user session
const currentUser = window.authModule.getCurrentSession()

// Check if user is doctor
if (currentUser.role !== 'doctor') {
	window.location.href = '/'
}

// Global data stores
let queueList = []
let diagnosesList = []
let patientsList = []
let activeChatContact = null
let notificationsList = []


// ==================== UI INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
	// Set user info in header
	updateHeaderWithUserInfo()

	// Initialize switcher
	initializeSwitcher()

	// Load initial dependencies
	await loadPatients()

	// Load initial data
	loadQueue()
	loadDiagnoses()
	loadChatList()
	await fetchNotifications()

	// Update notification badge count
	updateNotificationBadge()

	// Poll notifications every 4 seconds
	setInterval(fetchNotifications, 4000)

	// Setup event listeners
	setupEventListeners()
})

// Helper to load patients list (needed for mapping patient names and filters)
async function loadPatients() {
	try {
		const response = await fetch('/api/patients')
		const data = await response.json()
		if (data.success) {
			patientsList = data.patients
		}
	} catch (error) {
		console.error("Load Patients Error:", error)
	}
}

// ==================== HEADER & USER INFO ====================

function updateHeaderWithUserInfo() {
	const cabinetBtn = document.getElementById('cabinet-btn')
	const logoutBtn = document.getElementById('logout-btn')
	const closeProfileBtn = document.getElementById('close-profile-modal')

	if (cabinetBtn) {
		cabinetBtn.addEventListener('click', showProfileModal)
	}

	if (closeProfileBtn) {
		closeProfileBtn.addEventListener('click', closeProfileModal)
	}

	if (logoutBtn) {
		logoutBtn.addEventListener('click', () => {
			window.authModule.handleLogout()
		})
	}

	// Notifications
	const notificationBtn = document.getElementById('notification-btn')
	const closeNotificationBtn = document.getElementById('close-notification-modal')
	if (notificationBtn) {
		notificationBtn.addEventListener('click', showNotificationModal)
	}
	if (closeNotificationBtn) {
		closeNotificationBtn.addEventListener('click', closeNotificationModal)
	}
}

function showProfileModal() {
	const modal = document.getElementById('profile-modal')
	const profileInfo = document.getElementById('profile-info')

	profileInfo.innerHTML = `
		<div class="profile-info-item">
			<span class="profile-info-label">F.I.Sh:</span>
			<span class="profile-info-value">${currentUser.fullName}</span>
		</div>
		<div class="profile-info-item">
			<span class="profile-info-label">Foydalanuvchi roli:</span>
			<span class="profile-info-value" style="text-transform: capitalize;">${currentUser.role}</span>
		</div>
		${currentUser.specialty ? `
		<div class="profile-info-item">
			<span class="profile-info-label">Mutaxassislik:</span>
			<span class="profile-info-value">${currentUser.specialty}</span>
		</div>
		` : ''}
		<div class="profile-info-item">
			<span class="profile-info-label">Foydalanuvchi ID:</span>
			<span class="profile-info-value">${currentUser.userId}</span>
		</div>
		<div class="profile-info-item">
			<span class="profile-info-label">Kirgan vaqti:</span>
			<span class="profile-info-value">${new Date().toLocaleString('uz-UZ')}</span>
		</div>
	`

	modal.classList.add('active')
}

function closeProfileModal() {
	const modal = document.getElementById('profile-modal')
	modal.classList.remove('active')
}

function updateNotificationBadge() {
	const btn = document.getElementById('notification-btn')
	if (!btn) return
	
	const existingBadge = btn.querySelector('.notification-badge')
	if (existingBadge) existingBadge.remove()

	if (notificationsList.length > 0) {
		const badge = document.createElement('span')
		badge.className = 'notification-badge'
		badge.textContent = notificationsList.length
		btn.appendChild(badge)
	}
}

async function fetchNotifications() {
	const session = window.authModule.getCurrentSession()
	if (!session) return

	try {
		const res = await fetch(`/api/notifications?userId=${session.userId}`)
		const data = await res.json()
		if (data.success) {
			notificationsList = data.notifications
			updateNotificationBadge()
		}
	} catch (err) {
		console.error("Error fetching notifications:", err)
	}
}

function showNotificationModal() {
	const modal = document.getElementById('notification-modal')
	const notificationList = document.getElementById('notification-list')

	if (notificationsList.length === 0) {
		notificationList.innerHTML =
			'<div class="notification-empty" style="text-align: center; padding: 30px; color: var(--text-secondary); font-style: italic;">📭 Bildirishnomalar yo\'q</div>'
	} else {
		notificationList.innerHTML = notificationsList
			.map(notification => {
				let text = ''
				let title = ''
				const timeStr = new Date(notification.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
				if (notification.type === 'chat') {
					title = `💬 Yangi xabar: ${notification.senderName}`
					text = notification.content
				} else {
					title = `📢 Yangilik: ${notification.senderName}`
					text = notification.content
				}
				return `
					<div class="notification-item" style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: white; font-size: 13px;">
						<div style="font-weight: bold; color: #00d4ff; margin-bottom: 4px; display: flex; justify-content: space-between;">
							<span>${title}</span>
							<span style="font-size: 10px; font-weight: normal; color: rgba(255,255,255,0.4);">${timeStr}</span>
						</div>
						<div style="color: rgba(255,255,255,0.9); font-style: italic;">${text}</div>
					</div>
				`
			})
			.join('')
	}

	modal.classList.add('active')

	// Handle clear button
	const clearBtn = document.getElementById('clear-notifications-btn')
	if (clearBtn) {
		clearBtn.onclick = async () => {
			const session = window.authModule.getCurrentSession()
			if (!session) return
			try {
				const res = await fetch('/api/notifications/clear', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ userId: session.userId })
				})
				const data = await res.json()
				if (data.success) {
					notificationsList = []
					updateNotificationBadge()
					showNotificationModal() // refresh modal
				}
			} catch (err) {
				console.error("Clear notifications error:", err)
			}
		}
	}
}

function closeNotificationModal() {
	const modal = document.getElementById('notification-modal')
	modal.classList.remove('active')
}

// ==================== SWITCHER ====================

function initializeSwitcher() {
	const switcher = document.getElementById('dashboard-switcher')
	const switcherBtns = switcher.querySelectorAll('.switcher-btn')

	switcherBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			switcherBtns.forEach(b => b.classList.remove('active'))
			btn.classList.add('active')

			document.querySelectorAll('.content-section').forEach(section => {
				section.classList.remove('active')
			})

			const sectionId = btn.getAttribute('data-section')
			const section = document.getElementById(`${sectionId}-section`)
			if (section) {
				section.classList.add('active')
			}
		})
	})
}

// ==================== QUEUE SECTION ====================

async function loadQueue() {
	const listEl = document.getElementById('queue-list')
	listEl.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'

	try {
		const response = await fetch(`/api/queue/${currentUser.userId}`)
		const data = await response.json()

		if (!data.success) {
			listEl.innerHTML = `<div style="text-align: center; color: #ff006e; padding: 20px;">Xatolik: ${data.message}</div>`
			return
		}

		queueList = data.queue
		listEl.innerHTML = ''

		if (queueList.length === 0) {
			listEl.innerHTML = `
				<div class="empty-queue">
					<div class="empty-queue-icon">😊</div>
					<div>Bugun navbat yo'q</div>
				</div>
			`
			return
		}

		queueList.forEach(patient => {
			const item = createQueueItem(patient)
			listEl.appendChild(item)
		})
	} catch (error) {
		console.error("Load Queue Error:", error)
		listEl.innerHTML = '<div style="text-align: center; color: #ff006e; padding: 20px;">Server xatoligi!</div>'
	}
}

function createQueueItem(patient) {
	const item = document.createElement('div')
	item.className = 'queue-item'

	item.innerHTML = `
		<div class="queue-item-info">
			<div class="queue-patient-name">${patient.name}</div>
			<div class="queue-patient-time" style="display: flex; align-items: center; gap: 4px;">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-3" style="width: 12px; height: 12px; color: var(--neon-cyan);"><circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/></svg>
				<span>${patient.appointmentTime}</span>
			</div>
		</div>
		<button class="queue-btn">Qabul qilish</button>
	`

	item.querySelector('.queue-btn').addEventListener('click', e => {
		e.stopPropagation()
		showQueueModal(patient)
	})

	return item
}

function showQueueModal(patient) {
	const modal = document.getElementById('queue-modal')
	const body = document.getElementById('queue-details-body')

	body.innerHTML = `
		<div class="p-4">
			<h3 class="text-xl font-bold mb-4">Bemor Ma'lumotlari</h3>
			<div class="mb-3">
				<label class="text-secondary text-sm">F.I.Sh</label>
				<div class="text-lg font-bold text-primary">${patient.name}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Tug'ilgan sanasi</label>
				<div class="text-base text-primary" style="display: flex; align-items: center; gap: 6px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar" style="width: 14px; height: 14px; color: var(--neon-cyan);"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
					<span>${patient.dob || 'Kiritilmagan'}</span>
				</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Telefon raqami</label>
				<div class="text-base text-primary" style="display: flex; align-items: center; gap: 6px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone" style="width: 14px; height: 14px; color: var(--neon-cyan);"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
					<span>${patient.phone || 'Kiritilmagan'}</span>
				</div>
			</div>
			
			<div class="mb-3">
				<button class="btn btn-secondary" id="queue-view-diagnoses-btn" style="width: 100%; margin-top: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 20px; font-size: 13px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-clock" style="width: 14px; height: 14px; color: var(--neon-cyan);"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><circle cx="12" cy="14" r="4"/><path d="M12 12v2h2"/></svg>
					Tashxislar Tarixi
				</button>
				<div id="queue-diagnoses-history-container" style="display: none; margin-top: 12px; max-height: 220px; overflow-y: auto; padding: 12px; background: rgba(0, 212, 255, 0.02); border: 1px solid rgba(0, 212, 255, 0.1); border-radius: 12px; scrollbar-width: thin;"></div>
			</div>

			<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0;">

			<h3 class="text-lg font-bold mb-3">Tashxis Kiriting</h3>

			<div class="mb-3">
				<label class="form-label">Kasallik nomi *</label>
				<input type="text" class="form-input" id="disease-name" placeholder="Kasallik nomini kiriting">
			</div>

			<div class="mb-3">
				<label class="form-label">Diagnostik natijalar</label>
				<textarea class="textarea-field" id="diagnostic-results" placeholder="Diagnostik natijalar (masalan: qon tahlili, rentgen)"></textarea>
			</div>

			<div class="mb-3">
				<label class="form-label">Umumiy izohlar</label>
				<textarea class="textarea-field" id="general-notes" placeholder="Umumiy izohlarni kiriting"></textarea>
			</div>

			<div class="mb-3">
				<label class="form-label">Davolash tavsiyalari</label>
				<textarea class="textarea-field" id="treatment-recommendations" placeholder="Davolash tavsiyalari, dorilar"></textarea>
			</div>

			<div class="mb-3">
				<label class="form-label">Og'irlik darajasi *</label>
				<select class="select-field" id="severity">
					<option value="">Tanlang...</option>
					<option value="yengil">Yengil</option>
					<option value="ortacha">O'rtacha</option>
					<option value="ogir">Og'ir</option>
				</select>
			</div>

			<div class="mb-3">
				<label class="form-label">Bemor holati *</label>
				<select class="select-field" id="status">
					<option value="">Tanlang...</option>
					<option value="faol">Faol</option>
					<option value="davolanmoqda">Davolanmoqda</option>
					<option value="yakunlangan">Yakunlangan</option>
				</select>
			</div>
		</div>
	`

	modal.classList.add('active')

	document.getElementById('save-diagnosis-btn').onclick = async () => {
		const diagnosisData = {
			patientId: patient.id,
			diseaseName: document.getElementById('disease-name').value.trim(),
			diagnosticResults: document.getElementById('diagnostic-results').value.trim(),
			generalNotes: document.getElementById('general-notes').value.trim(),
			treatmentRecommendations: document.getElementById('treatment-recommendations').value.trim(),
			severity: document.getElementById('severity').value,
			status: document.getElementById('status').value,
		}

		if (!diagnosisData.diseaseName || !diagnosisData.severity || !diagnosisData.status) {
			alert("Kasallik nomi, og'irlik va bemor holatini belgilash majburiy!")
			return
		}

		try {
			// 1. Save diagnosis to database
			const response = await fetch('/api/diagnoses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(diagnosisData)
			})
			const resData = await response.json()

			if (resData.success) {
				// 2. Complete appointment to remove from queue
				await fetch('/api/appointments/complete', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						patientId: patient.id,
						doctorId: currentUser.userId
					})
				})

				alert(`Tashxis saqlandi: ${diagnosisData.diseaseName}`)
				modal.classList.remove('active')

				// Refresh data
				loadQueue()
				loadDiagnoses()
			} else {
				alert("Xatolik: " + resData.message)
			}
		} catch (error) {
			console.error("Save Diagnosis Error:", error)
			alert("Server bilan bog'lanishda xatolik yuz berdi!")
		}
	}

	const viewDiagBtn = document.getElementById('queue-view-diagnoses-btn')
	const diagHistoryContainer = document.getElementById('queue-diagnoses-history-container')

	viewDiagBtn.onclick = async () => {
		if (diagHistoryContainer.style.display === 'block') {
			diagHistoryContainer.style.display = 'none'
			return
		}

		diagHistoryContainer.style.display = 'block'
		diagHistoryContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 12px; padding: 10px;">Yuklanmoqda...</div>'

		try {
			const res = await fetch(`/api/diagnoses/${patient.id}`)
			const data = await res.json()
			if (data.success) {
				const diagnoses = data.diagnoses
				if (diagnoses.length === 0) {
					diagHistoryContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 12px; font-style: italic; padding: 10px;">Tashxislar tarixi topilmadi.</div>'
					return
				}

				const severityMap = { yengil: 'Yengil', ortacha: "O'rtacha", ogir: "Og'ir" }
				const statusMap = { faol: 'Faol', davolanmoqda: 'Davolanmoqda', yakunlangan: 'Yakunlangan' }

				diagHistoryContainer.innerHTML = diagnoses.map(d => `
					<div style="padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.02); border-left: 3px solid var(--neon-cyan); border-radius: 4px; font-size: 12px;">
						<div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
							<span>${d.diseaseName}</span>
							<span style="color: var(--neon-cyan); font-size: 10px;">${d.createdDate}</span>
						</div>
						<div style="color: var(--text-secondary-dark); margin-bottom: 2px;">
							<strong>Og'irlik:</strong> ${severityMap[d.severity] || d.severity} | <strong>Holat:</strong> ${statusMap[d.status] || d.status}
						</div>
						<div style="color: var(--text-secondary-dark); margin-bottom: 2px;">Davolash: ${d.treatmentRecommendations || 'Kiritilmagan'}</div>
						<div style="color: var(--text-secondary); font-size: 10px;">Shifokor: ${d.doctorName || 'Noma\'lum'}</div>
					</div>
				`).join('')
			} else {
				diagHistoryContainer.innerHTML = '<div style="text-align: center; color: #ff006e; font-size: 12px; padding: 10px;">Xatolik yuz berdi.</div>'
			}
		} catch (err) {
			console.error(err)
			diagHistoryContainer.innerHTML = '<div style="text-align: center; color: #ff006e; font-size: 12px; padding: 10px;">Server xatoligi!</div>'
		}
	}
}

// ==================== DIAGNOSES SECTION ====================

async function loadDiagnoses() {
	const listEl = document.getElementById('diagnosis-list')
	listEl.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'

	try {
		const response = await fetch('/api/diagnoses')
		const data = await response.json()

		if (!data.success) {
			listEl.innerHTML = `<div style="text-align: center; color: #ff006e; padding: 20px;">Xatolik: ${data.message}</div>`
			return
		}

		// Filter diagnoses: show only diagnoses of patients linked to this doctor
		const allDiagnoses = data.diagnoses
		diagnosesList = allDiagnoses.filter(diag => {
			const pt = patientsList.find(p => p.id === diag.patientId)
			return pt && pt.linkedDoctor === currentUser.userId
		})

		listEl.innerHTML = ''

		if (diagnosesList.length === 0) {
			listEl.innerHTML = `
				<div class="empty-queue" style="padding: 40px 20px;">
					<div class="empty-queue-icon">📋</div>
					<div>Faol tashxislar topilmadi</div>
				</div>
			`
			return
		}

		diagnosesList.forEach(diagnosis => {
			const card = createDiagnosisCard(diagnosis)
			listEl.appendChild(card)
		})
	} catch (error) {
		console.error("Load Diagnoses Error:", error)
		listEl.innerHTML = '<div style="text-align: center; color: #ff006e; padding: 20px;">Server xatoligi!</div>'
	}
}

function createDiagnosisCard(diagnosis) {
	const card = document.createElement('div')
	card.className = 'diagnosis-card'

	const severityMap = {
		yengil: 'Yengil',
		ortacha: "O'rtacha",
		ogir: "Og'ir",
	}

	const statusMap = {
		faol: 'Faol',
		davolanmoqda: 'Davolanmoqda',
		yakunlangan: 'Yakunlangan',
	}

	card.innerHTML = `
		<div class="diagnosis-header">
			<div>
				<div class="diagnosis-patient">${diagnosis.patientName}</div>
				<div class="diagnosis-date">${diagnosis.createdDate}</div>
			</div>
		</div>
		<div class="diagnosis-disease">${diagnosis.diseaseName}</div>
		<div class="diagnosis-meta">
			<span class="severity-badge severity-${diagnosis.severity}">${severityMap[diagnosis.severity] || diagnosis.severity}</span>
			<span class="status-badge status-${diagnosis.status}">${statusMap[diagnosis.status] || diagnosis.status}</span>
		</div>
		<div class="diagnosis-actions" style="margin-top: 12px;">
			<button class="diagnosis-btn" data-action="view">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="width: 12px; height: 12px; color: #fff;"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
				Ko'rish
			</button>
			<button class="diagnosis-btn" data-action="edit">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line" style="width: 12px; height: 12px; color: #fff;"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
				Tahrirlash
			</button>
			<button class="diagnosis-btn" data-action="complete">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-check" style="width: 12px; height: 12px; color: #fff;"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
				Yakunlash
			</button>
		</div>
	`

	const actionBtns = card.querySelectorAll('.diagnosis-btn')
	actionBtns.forEach(btn => {
		btn.addEventListener('click', e => {
			e.stopPropagation()
			const action = btn.getAttribute('data-action')
			handleDiagnosisAction(action, diagnosis)
		})
	})

	return card
}

async function handleDiagnosisAction(action, diagnosis) {
	switch (action) {
		case 'view':
			showDiagnosisModal(diagnosis)
			break
		case 'edit':
			showEditDiagnosisModal(diagnosis)
			break
		case 'complete':
			if (confirm(`${diagnosis.diseaseName} tashxisni yakunlashni xohlaysizmi?`)) {
				try {
					const response = await fetch(`/api/diagnoses/${diagnosis.id}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ status: 'yakunlangan' })
					})
					const data = await response.json()
					if (data.success) {
						loadDiagnoses()
						alert('Tashxis yakunlandi!')
					} else {
						alert("Xatolik: " + data.message)
					}
				} catch (err) {
					console.error(err)
					alert("Xatolik yuz berdi")
				}
			}
			break
	}
}

function showDiagnosisModal(diagnosis) {
	const modal = document.getElementById('diagnosis-modal')
	const body = document.getElementById('diagnosis-details-body')

	const severityMap = { yengil: 'Yengil', ortacha: "O'rtacha", ogir: "Og'ir" }
	const statusMap = { faol: 'Faol', davolanmoqda: 'Davolanmoqda', yakunlangan: 'Yakunlangan' }

	body.innerHTML = `
		<div class="p-4">
			<div class="mb-3">
				<label class="text-secondary text-sm">Bemor</label>
				<div class="text-lg font-bold text-primary">${diagnosis.patientName}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Kasallik</label>
				<div class="text-base text-primary">${diagnosis.diseaseName}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Yaratilgan sana</label>
				<div class="text-base text-primary">${diagnosis.createdDate}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Og'irlik</label>
				<div class="text-base text-primary">${severityMap[diagnosis.severity] || diagnosis.severity}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Holati</label>
				<div class="text-base text-primary">${statusMap[diagnosis.status] || diagnosis.status}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Diagnostik Natijalar</label>
				<div class="text-base text-primary" style="white-space: pre-line;">${diagnosis.diagnosticResults || 'Kiritilmagan'}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Izohlar / Tavsiyalar</label>
				<div class="text-base text-primary" style="white-space: pre-line;">${diagnosis.treatmentRecommendations || 'Kiritilmagan'}</div>
			</div>
		</div>
	`

	modal.classList.add('active')

	document.getElementById('edit-diagnosis-btn').onclick = () => {
		modal.classList.remove('active')
		showEditDiagnosisModal(diagnosis)
	}

	document.getElementById('complete-diagnosis-btn').onclick = async () => {
		try {
			const res = await fetch(`/api/diagnoses/${diagnosis.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'yakunlangan' })
			})
			const data = await res.json()
			if (data.success) {
				loadDiagnoses()
				modal.classList.remove('active')
				alert('Tashxis yakunlandi!')
			}
		} catch (err) {
			console.error(err)
		}
	}
}

function showEditDiagnosisModal(diagnosis) {
	const modal = document.getElementById('queue-modal')
	const body = document.getElementById('queue-details-body')
	const title = document.querySelector('#queue-modal .modal-title')
	
	title.textContent = 'Tashxisni Tahrirlash'

	body.innerHTML = `
		<div class="p-4">
			<div class="mb-3">
				<label class="text-secondary text-sm">Bemor</label>
				<div class="text-lg font-bold text-primary">${diagnosis.patientName}</div>
			</div>

			<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0;">

			<div class="mb-3">
				<label class="form-label">Kasallik nomi *</label>
				<input type="text" class="form-input" id="edit-disease-name" value="${diagnosis.diseaseName}">
			</div>

			<div class="mb-3">
				<label class="form-label">Diagnostik natijalar</label>
				<textarea class="textarea-field" id="edit-diagnostic-results">${diagnosis.diagnosticResults || ''}</textarea>
			</div>

			<div class="mb-3">
				<label class="form-label">Umumiy izohlar</label>
				<textarea class="textarea-field" id="edit-general-notes">${diagnosis.generalNotes || ''}</textarea>
			</div>

			<div class="mb-3">
				<label class="form-label">Davolash tavsiyalari</label>
				<textarea class="textarea-field" id="edit-treatment-recommendations">${diagnosis.treatmentRecommendations || ''}</textarea>
			</div>

			<div class="mb-3">
				<label class="form-label">Og'irlik darajasi *</label>
				<select class="select-field" id="edit-severity">
					<option value="yengil" ${diagnosis.severity === 'yengil' ? 'selected' : ''}>Yengil</option>
					<option value="ortacha" ${diagnosis.severity === 'ortacha' ? 'selected' : ''}>O'rtacha</option>
					<option value="ogir" ${diagnosis.severity === 'ogir' ? 'selected' : ''}>Og'ir</option>
				</select>
			</div>

			<div class="mb-3">
				<label class="form-label">Bemor holati *</label>
				<select class="select-field" id="edit-status">
					<option value="faol" ${diagnosis.status === 'faol' ? 'selected' : ''}>Faol</option>
					<option value="davolanmoqda" ${diagnosis.status === 'davolanmoqda' ? 'selected' : ''}>Davolanmoqda</option>
					<option value="yakunlangan" ${diagnosis.status === 'yakunlangan' ? 'selected' : ''}>Yakunlangan</option>
				</select>
			</div>
		</div>
	`

	modal.classList.add('active')

	document.getElementById('save-diagnosis-btn').onclick = async () => {
		const updatedData = {
			diseaseName: document.getElementById('edit-disease-name').value.trim(),
			diagnosticResults: document.getElementById('edit-diagnostic-results').value.trim(),
			generalNotes: document.getElementById('edit-general-notes').value.trim(),
			treatmentRecommendations: document.getElementById('edit-treatment-recommendations').value.trim(),
			severity: document.getElementById('edit-severity').value,
			status: document.getElementById('edit-status').value,
		}

		if (!updatedData.diseaseName) {
			alert("Kasallik nomi majburiy!")
			return
		}

		try {
			const response = await fetch(`/api/diagnoses/${diagnosis.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedData)
			})
			const resData = await response.json()

			if (resData.success) {
				alert("Tashxis yangilandi!")
				modal.classList.remove('active')
				loadDiagnoses()
			} else {
				alert("Xatolik: " + resData.message)
			}
		} catch (error) {
			console.error("Save Diagnosis Error:", error)
			alert("Serverda xatolik yuz berdi!")
		}
	}
}

// ==================== CHAT SECTION ====================

async function loadChatList() {
	const chatList = document.getElementById('chat-list')
	chatList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 10px;">Yuklanmoqda...</div>'

	try {
		const res = await fetch('/api/auth/users')
		const data = await res.json()

		if (!data.success) {
			chatList.innerHTML = '<div style="color: #ff006e; padding: 10px;">Xatolik</div>'
			return
		}

		let activeDoctors = []
		try {
			const docRes = await fetch('/api/doctors')
			const docData = await docRes.json()
			if (docData.success) {
				activeDoctors = docData.doctors
			}
		} catch (e) {
			console.error(e)
		}

		const users = data.users.filter(u => {
			if (!u.userId || !u.fullName || u.fullName === 'undefined') return false
			if (u.userId === currentUser.userId) return false
			if (u.role === 'doctor') {
				return activeDoctors.some(d => d.id === u.userId)
			}
			return true
		})
		chatList.innerHTML = ''

		// Add general group chat at top
		const groupContact = { id: 'group_general', fullName: 'Umumiy Guruh', role: 'group', specialty: 'Barcha xodimlar' }
		const contacts = [groupContact, ...users]

		contacts.forEach(contact => {
			const chatItem = document.createElement('div')
			chatItem.className = 'chat-item'
			if (activeChatContact && activeChatContact.id === contact.id) {
				chatItem.classList.add('active')
			}

			const roleLabel = contact.id === 'group_general' ? 'Guruh' : (contact.role === 'admin' ? 'Admin' : (contact.role === 'receptionist' ? 'Qabulxona' : (contact.specialty || 'Shifokor')))
			const isGroup = contact.id === 'group_general'
			const iconSvg = isGroup
				? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users" style="width: 14px; height: 14px; color: var(--neon-cyan);"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>`
				: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-user-round" style="width: 14px; height: 14px; color: var(--neon-cyan);"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="12" r="10"/></svg>`

			chatItem.innerHTML = `
				<div style="display: flex; align-items: center; gap: 8px;">
					<div class="chat-icon-wrapper" style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.15); flex-shrink: 0;">
						${iconSvg}
					</div>
					<div>
						<div class="font-semibold text-base">${contact.fullName}</div>
						<div class="text-secondary text-sm">${roleLabel}</div>
					</div>
				</div>
			`

			chatItem.addEventListener('click', () => {
				document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'))
				chatItem.classList.add('active')
				activeChatContact = contact
				loadChatMessages(contact)
			})

			chatList.appendChild(chatItem)
		})
	} catch (error) {
		console.error("Load Chat List Error:", error)
		chatList.innerHTML = '<div style="color: #ff006e; padding: 10px;">Xatolik</div>'
	}
}

async function loadChatMessages(contact) {
	const headerBar = document.getElementById('chat-header-bar')
	if (headerBar) {
		headerBar.style.display = 'block'
		const roleLabel = contact.id === 'group_general' ? 'Guruh' : (contact.role === 'admin' ? 'Admin' : (contact.role === 'receptionist' ? 'Qabulxona' : (contact.specialty || 'Shifokor')))
		const isGroup = contact.id === 'group_general'
		const iconSvg = isGroup
			? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users" style="width: 16px; height: 16px; color: var(--neon-cyan);"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>`
			: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-user-round" style="width: 16px; height: 16px; color: var(--neon-cyan);"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="12" r="10"/></svg>`

		headerBar.innerHTML = `
			<div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
				<div style="font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px;">
					<span style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(0, 212, 255, 0.05);">${iconSvg}</span> 
					<span>${contact.fullName}</span>
					<span style="font-size: 11px; background: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.3); color: var(--neon-cyan); padding: 2px 8px; border-radius: 20px; font-weight: normal; margin-left: 8px;">${roleLabel}</span>
				</div>
			</div>
		`
	}

	const messagesContainer = document.getElementById('chat-messages')
	messagesContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Xabarlar yuklanmoqda...</div>'

	try {
		const response = await fetch(`/api/messages/${currentUser.userId}`)
		const data = await response.json()

		if (!data.success) {
			messagesContainer.innerHTML = '<div style="text-align: center; color: #ff006e; padding: 20px;">Xatolik</div>'
			return
		}

		messagesContainer.innerHTML = ''
		
		const filteredMessages = data.messages.filter(msg => {
			if (contact.id === 'group_general') {
				return msg.recipientId === 'group_general'
			} else {
				return (msg.senderId === currentUser.userId && msg.recipientId === contact.id) ||
				       (msg.senderId === contact.id && msg.recipientId === currentUser.userId)
			}
		})

		if (filteredMessages.length === 0) {
			messagesContainer.innerHTML = `
				<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-secondary); padding: 40px; text-align: center; width: 100%;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-more" style="width: 24px; height: 24px; color: var(--neon-cyan);"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>
					<span style="font-style: italic; font-size: 13px;">Bu yerda suhbat hali boshlanmagan</span>
				</div>
			`
			return
		}

		filteredMessages.forEach(msg => {
			const messageDiv = document.createElement('div')
			const isSent = msg.senderId === currentUser.userId
			messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`
			messageDiv.setAttribute('data-id', msg.id)

			const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''
			const editedStr = msg.edited ? ' <span class="msg-edited-tag">tahrirlandi</span>' : ''

			let actionsHtml = ''
			if (isSent) {
				actionsHtml = `
					<div class="msg-action-links">
						<span class="msg-edit-link" data-msg-id="${msg.id}">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line" style="width: 12px; height: 12px; color: #fff; cursor: pointer;"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
						</span>
						<span class="msg-delete-link" data-msg-id="${msg.id}">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash" style="width: 12px; height: 12px; color: #fff; cursor: pointer;"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
						</span>
					</div>
				`
			}

			let senderNameHtml = ''
			if (contact.id === 'group_general' && !isSent) {
				senderNameHtml = `<div style="font-size: 10px; font-weight: bold; color: var(--neon-cyan); margin-bottom: 4px;">${msg.senderName}</div>`
			}

			let contentHtml = `<div class="msg-content-text" style="word-break: break-word;">${msg.content}</div>`
			if (msg.content && msg.content.startsWith('[FILE:')) {
				const fileRegex = /^\[FILE:(.+)\|(.+)\|(.+)\]$/
				const match = msg.content.match(fileRegex)
				if (match) {
					const fileName = match[1]
					const fileType = match[2]
					const fileData = match[3]
					contentHtml = `
						<div class="file-message-card" style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; margin-top: 4px; border: 1px solid rgba(255,255,255,0.1); max-width: 250px;">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file" style="width: 20px; height: 20px; color: var(--neon-cyan); flex-shrink: 0;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
							<div style="flex: 1; min-width: 0;">
								<div style="font-weight: bold; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white;">${fileName}</div>
								<div style="font-size: 9px; color: var(--text-secondary);">${fileType}</div>
							</div>
							<a href="${fileData}" download="${fileName}" style="color: var(--neon-cyan); text-decoration: none; display: flex; align-items: center; justify-content: center; background: rgba(0,212,255,0.1); padding: 6px; border-radius: 50%; transition: all 0.2s ease; flex-shrink: 0;">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download" style="width: 12px; height: 12px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
							</a>
						</div>
					`
				}
			}

			messageDiv.innerHTML = `
				${senderNameHtml}
				${contentHtml}
				<div class="message-meta">
					<span class="msg-time">${timeStr}${editedStr}</span>
					${actionsHtml}
				</div>
			`

			// Add event listeners
			if (isSent) {
				const editBtn = messageDiv.querySelector('.msg-edit-link')
				const deleteBtn = messageDiv.querySelector('.msg-delete-link')

				if (editBtn) {
					editBtn.onclick = () => handleEditMessage(msg)
				}
				if (deleteBtn) {
					deleteBtn.onclick = () => handleDeleteMessage(msg.id, contact)
				}
			}

			messagesContainer.appendChild(messageDiv)
		})

		messagesContainer.scrollTop = messagesContainer.scrollHeight
	} catch (error) {
		console.error("Load Chat Messages Error:", error)
		messagesContainer.innerHTML = '<div style="text-align: center; color: #ff006e; padding: 20px;">Xatolik</div>'
	}
}

async function handleEditMessage(msg) {
	const newContent = prompt("Xabarni tahrirlang:", msg.content)
	if (newContent === null) return
	const trimmed = newContent.trim()
	if (!trimmed) {
		alert("Xabar matni bo'sh bo'lishi mumkin emas!")
		return
	}

	try {
		const response = await fetch(`/api/messages/${msg.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				content: trimmed,
				senderId: currentUser.userId
			})
		})
		const data = await response.json()
		if (data.success) {
			await loadChatMessages(activeChatContact)
		} else {
			alert("Xatolik: " + data.message)
		}
	} catch (err) {
		console.error("Edit message error:", err)
		alert("Tizimda xatolik yuz berdi!")
	}
}

async function handleDeleteMessage(messageId, contact) {
	if (!confirm("Ushbu xabarni o'chirmoqchimisiz?")) return

	try {
		const response = await fetch(`/api/messages/${messageId}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				senderId: currentUser.userId
			})
		})
		const data = await response.json()
		if (data.success) {
			await loadChatMessages(contact)
		} else {
			alert("Xatolik: " + data.message)
		}
	} catch (err) {
		console.error("Delete message error:", err)
		alert("Tizimda xatolik yuz berdi!")
	}
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
	// Modal close buttons
	const closeDiagnosisModal = document.getElementById('close-diagnosis-modal')
	const closeQueueModal = document.getElementById('close-queue-modal')
	const closeDiagnosisBtn = document.getElementById('close-diagnosis-btn')
	const closeQueueBtn = document.getElementById('close-queue-btn')

	const diagnosisModalOverlay = document.getElementById('diagnosis-modal')
	const queueModalOverlay = document.getElementById('queue-modal')

	if (closeDiagnosisModal) {
		closeDiagnosisModal.addEventListener('click', () => {
			diagnosisModalOverlay.classList.remove('active')
		})
	}

	if (closeQueueModal) {
		closeQueueModal.addEventListener('click', () => {
			queueModalOverlay.classList.remove('active')
		})
	}

	if (closeDiagnosisBtn) {
		closeDiagnosisBtn.addEventListener('click', () => {
			diagnosisModalOverlay.classList.remove('active')
		})
	}

	if (closeQueueBtn) {
		closeQueueBtn.addEventListener('click', () => {
			queueModalOverlay.classList.remove('active')
		})
	}

	// Close modal on overlay click
	diagnosisModalOverlay.addEventListener('click', e => {
		if (e.target === diagnosisModalOverlay) {
			diagnosisModalOverlay.classList.remove('active')
		}
	})

	queueModalOverlay.addEventListener('click', e => {
		if (e.target === queueModalOverlay) {
			queueModalOverlay.classList.remove('active')
		}
	})

	// Chat send button and file attachments
	const chatSendBtn = document.querySelector('.chat-send-btn')
	const chatInput = document.querySelector('.chat-input')
	const fileInput = document.getElementById('chat-file-input')
	const fileBtn = document.getElementById('chat-file-btn')

	const sendMessageText = async () => {
		const text = chatInput.value.trim()
		if (!text || !activeChatContact) {
			if (!activeChatContact) alert("Suhbatdosh tanlanmagan!")
			return
		}

		try {
			const response = await fetch('/api/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					senderId: currentUser.userId,
					recipientId: activeChatContact.id,
					content: text
				})
			})

			const resData = await response.json()
			if (resData.success) {
				chatInput.value = ''
				loadChatMessages(activeChatContact)
			}
		} catch (error) {
			console.error("Send Message Error:", error)
			alert("Xabar yuborishda xatolik yuz berdi!")
		}
	}

	if (chatSendBtn) {
		chatSendBtn.addEventListener('click', sendMessageText)
	}

	if (chatInput) {
		chatInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				sendMessageText()
			}
		})
	}

	if (fileBtn && fileInput) {
		fileBtn.addEventListener('click', () => fileInput.click())
		
		fileInput.addEventListener('change', async () => {
			if (fileInput.files.length === 0 || !activeChatContact) return
			const file = fileInput.files[0]
			
			if (file.size > 2 * 1024 * 1024) {
				alert("Fayl hajmi 2MB dan oshmasligi kerak!")
				fileInput.value = ''
				return
			}
			
			const reader = new FileReader()
			reader.onload = async (e) => {
				const base64Data = e.target.result
				const fileMessageContent = `[FILE:${file.name}|${file.type || 'fayl'}|${base64Data}]`
				
				try {
					const response = await fetch('/api/messages', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							senderId: currentUser.userId,
							recipientId: activeChatContact.id,
							content: fileMessageContent
						})
					})

					const resData = await response.json()
					if (resData.success) {
						fileInput.value = ''
						loadChatMessages(activeChatContact)
					}
				} catch (error) {
					console.error("Send File Error:", error)
					alert("Fayl yuborishda xatolik yuz berdi!")
				}
			}
			reader.readAsDataURL(file)
		})
	}
}
