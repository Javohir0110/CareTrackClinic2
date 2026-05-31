// ==================== RECEPTIONIST DASHBOARD MODULE ====================

// Check authentication
if (!window.authModule.requireAuth()) {
	throw new Error('Not authenticated')
}

// Get current user session
const currentUser = window.authModule.getCurrentSession()

// Check if user is receptionist
if (currentUser.role !== 'receptionist') {
	window.location.href = '/'
}

// Global data stores
let doctorsList = []
let patientsList = []
let activeChatContact = null
let notificationsList = []


// ==================== UI INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
	// Set user info in header
	updateHeaderWithUserInfo()

	// Initialize switcher
	initializeSwitcher()

	// Load initial data
	loadDoctors()
	loadPatients()
	loadChatList()
	await fetchNotifications()

	// Update notification badge count
	updateNotificationBadge()

	// Poll notifications every 4 seconds
	setInterval(fetchNotifications, 4000)

	// Event listeners
	setupEventListeners()
})

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
		const res = await fetch(`https://caretrackclinic2.onrender.com/api/notifications?userId=${session.userId}`)
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
				const res = await fetch('https://caretrackclinic2.onrender.com/api/notifications/clear', {
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

// ==================== DOCTORS SECTION ====================

async function loadDoctors(limit = 6) {
	const grid = document.getElementById('doctors-grid')
	grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'

	try {
		const response = await fetch('https://caretrackclinic2.onrender.com/api/doctors')
		const data = await response.json()

		if (!data.success) {
			grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ff006e; padding: 20px;">Xatolik: ${data.message}</div>`
			return
		}

		doctorsList = data.doctors
		grid.innerHTML = ''

		const displayDoctors = doctorsList.slice(0, limit)

		if (displayDoctors.length === 0) {
			grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Shifokorlar topilmadi</div>'
			return
		}

		displayDoctors.forEach(doctor => {
			const card = createDoctorCard(doctor)
			grid.appendChild(card)
		})
	} catch (error) {
		console.error("Load Doctors Error:", error)
		grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ff006e; padding: 20px;">Server xatoligi!</div>'
	}
}

function createDoctorCard(doctor) {
	const card = document.createElement('div')
	card.className = 'doctor-card'

	card.innerHTML = `
		<div class="doctor-avatar" style="display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-user-round" style="width: 28px; height: 28px; color: var(--neon-cyan);"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="12" r="10"/></svg></div>
		<div class="doctor-name">${doctor.name}</div>
		<div class="doctor-specialty">${doctor.specialty}</div>
		<div class="doctor-info" style="display: flex; flex-direction: column; gap: 4px;">
			<div style="display: flex; align-items: center; gap: 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone" style="width: 12px; height: 12px; color: var(--neon-cyan);"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg> <span>${doctor.phone || 'Kiritilmagan'}</span></div>
			<div style="display: flex; align-items: center; gap: 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar" style="width: 12px; height: 12px; color: var(--neon-cyan);"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg> <span>${doctor.workingDays || 'Kiritilmagan'}</span></div>
			<div style="display: flex; align-items: center; gap: 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-3" style="width: 12px; height: 12px; color: var(--neon-cyan);"><circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/></svg> <span>${doctor.workingHours || 'Kiritilmagan'}</span></div>
		</div>
		<div class="queue-badge" style="margin-top: 12px; font-weight: 700; color: var(--neon-cyan); display: flex; align-items: center; gap: 4px;">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered" style="width: 12px; height: 12px;"><path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/></svg>
			<span>Navbat: ${doctor.queueCount || 0} bemor</span>
		</div>
	`

	card.addEventListener('click', () => {
		alert(
			`${doctor.name} (${doctor.specialty})\nTelefon: ${doctor.phone || 'Kiritilmagan'}\nNavbat: ${doctor.queueCount || 0} bemor`,
		)
	})

	return card
}

// ==================== PATIENTS SECTION ====================

async function loadPatients() {
	const list = document.getElementById('patients-list')
	list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'

	try {
		const response = await fetch('https://caretrackclinic2.onrender.com/api/patients')
		const data = await response.json()

		if (!data.success) {
			list.innerHTML = `<div style="text-align: center; color: #ff006e; padding: 20px;">Xatolik: ${data.message}</div>`
			return
		}

		patientsList = data.patients
		list.innerHTML = ''

		if (patientsList.length === 0) {
			list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Bemorlar ro\'yxati bo\'sh</div>'
			return
		}

		patientsList.forEach(patient => {
			const item = createPatientItem(patient)
			list.appendChild(item)
		})
	} catch (error) {
		console.error("Load Patients Error:", error)
		list.innerHTML = '<div style="text-align: center; color: #ff006e; padding: 20px;">Server xatoligi!</div>'
	}
}

function createPatientItem(patient) {
	const item = document.createElement('div')
	item.className = 'patient-item'

	const linkedDoctor = doctorsList.find(d => d.id === patient.linkedDoctor)

	item.innerHTML = `
		<div class="patient-info">
			<div class="patient-name">${patient.name}</div>
			<div class="patient-contact" style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
				<div style="display: flex; align-items: center; gap: 4px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone" style="width: 12px; height: 12px; color: var(--neon-cyan);"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
					<span>${patient.phone}</span>
				</div>
				<span style="color: rgba(255,255,255,0.2); margin: 0 4px;">|</span>
				<div style="display: flex; align-items: center; gap: 4px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-id-card" style="width: 12px; height: 12px; color: var(--neon-cyan);"><path d="M16 10h2"/><path d="M16 14h2"/><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/></svg>
					<span>${patient.passport || 'Pasport kiritilmagan'}</span>
				</div>
				<span style="color: rgba(255,255,255,0.2); margin: 0 4px;">|</span>
				<span>${linkedDoctor?.name || 'Biriktirilmagan'}</span>
			</div>
		</div>
		<div class="patient-actions">
			<button class="action-btn action-btn-primary" data-action="view" style="display: inline-flex; align-items: center; gap: 4px;">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-user-round" style="width: 12px; height: 12px;"><path d="M18 20a6 6 0 0 0-12 0"/><circle cx="12" cy="10" r="4"/><circle cx="12" cy="12" r="10"/></svg>
				Ko'rish
			</button>
			<button class="action-btn action-btn-secondary" data-action="edit" style="display: inline-flex; align-items: center; gap: 4px;">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line" style="width: 12px; height: 12px;"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
				Tahrirlash
			</button>
			<button class="action-btn action-btn-secondary" data-action="book" style="display: inline-flex; align-items: center; gap: 4px;">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered" style="width: 12px; height: 12px;"><path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/></svg>
				Qabul
			</button>
		</div>
	`

	// Add action listeners
	const actionBtns = item.querySelectorAll('.action-btn')
	actionBtns.forEach(btn => {
		btn.addEventListener('click', e => {
			e.stopPropagation()
			const action = btn.getAttribute('data-action')
			handlePatientAction(action, patient)
		})
	})

	// Click on patient item to view details
	item.addEventListener('click', () => {
		showPatientDetailsModal(patient)
	})

	return item
}

function handlePatientAction(action, patient) {
	switch (action) {
		case 'view':
			showPatientDetailsModal(patient)
			break
		case 'edit':
			showPatientForm('edit', patient)
			break
		case 'book':
			showBookAppointmentModal(patient)
			break
	}
}

function showPatientDetailsModal(patient) {
	const modal = document.getElementById('patient-modal')
	const title = document.querySelector('#patient-modal .modal-title')
	const body = document.getElementById('patient-details-body')
	const footer = document.querySelector('#patient-modal .modal-footer')
	const linkedDoctor = doctorsList.find(d => d.id === patient.linkedDoctor)

	title.textContent = "Bemor Ma'lumotlari"
	
	body.innerHTML = `
		<div class="p-4">
			<div class="mb-3">
				<label class="text-secondary text-sm">F.I.Sh</label>
				<div class="text-lg font-bold text-primary">${patient.name}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Tug'ilgan sanasi</label>
				<div class="text-base text-primary">${patient.dob || 'Kiritilmagan'}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Telefon raqami</label>
				<div class="text-base text-primary">${patient.phone}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Pasport seriyasi</label>
				<div class="text-base text-primary" style="display: flex; align-items: center; gap: 6px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-id-card" style="width: 14px; height: 14px; color: var(--neon-cyan);"><path d="M16 10h2"/><path d="M16 14h2"/><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/></svg>
					<span>${patient.passport || 'Kiritilmagan'}</span>
				</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Manzil</label>
				<div class="text-base text-primary">${patient.address || 'Kiritilmagan'}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Jinsi</label>
				<div class="text-base text-primary">${patient.gender || 'Kiritilmagan'}</div>
			</div>
			<div class="mb-3">
				<label class="text-secondary text-sm">Bog'lanish uchun shifokor</label>
				<div class="text-base text-primary">${linkedDoctor?.name || 'Biriktirilmagan'}</div>
			</div>
			<div style="margin-top: 20px; display: flex; gap: 10px;">
				<button class="btn btn-secondary" id="view-diagnoses-btn" style="flex: 1; justify-content: center; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-clock" style="width: 12px; height: 12px; color: var(--neon-cyan);"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><circle cx="12" cy="14" r="4"/><path d="M12 12v2h2"/></svg>
					Tashxislar Tarixi
				</button>
				<button class="btn btn-secondary" id="view-appointments-btn" style="flex: 1; justify-content: center; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered" style="width: 12px; height: 12px; color: var(--neon-cyan);"><path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/></svg>
					Navbatlar Tarixi
				</button>
			</div>
		</div>
	`

	// Update footer buttons
	footer.innerHTML = `
		<button class="btn btn-glass" id="close-modal-btn">Yopish</button>
		<button class="btn btn-secondary" id="edit-patient-btn" style="display: inline-flex; align-items: center; gap: 4px;">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line" style="width: 12px; height: 12px;"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
			Tahrirlash
		</button>
		<button class="btn btn-primary" id="book-appointment-btn" style="display: inline-flex; align-items: center; gap: 4px;">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered" style="width: 12px; height: 12px;"><path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/></svg>
			Qabulga yozish
		</button>
	`

	modal.classList.add('active')

	// Bind actions
	document.getElementById('close-modal-btn').onclick = () => modal.classList.remove('active')
	document.getElementById('view-diagnoses-btn').onclick = () => showPatientDiagnoses(patient)
	document.getElementById('view-appointments-btn').onclick = () => showPatientAppointments(patient)
	document.getElementById('edit-patient-btn').onclick = () => {
		modal.classList.remove('active')
		showPatientForm('edit', patient)
	}
	document.getElementById('book-appointment-btn').onclick = () => {
		modal.classList.remove('active')
		showBookAppointmentModal(patient)
	}
}

async function showPatientAppointments(patient) {
	const modal = document.getElementById('patient-modal')
	const body = document.getElementById('patient-details-body')
	const footer = document.querySelector('#patient-modal .modal-footer')
	
	body.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'
	
	footer.innerHTML = `
		<button class="btn btn-glass" id="back-to-details-btn">Orqaga</button>
	`
	document.getElementById('back-to-details-btn').onclick = () => {
		showPatientDetailsModal(patient)
	}

	try {
		const res = await fetch(`https://caretrackclinic2.onrender.com/api/appointments?patientId=${patient.id}`)
		const data = await res.json()
		if (data.success) {
			const list = data.appointments
			if (list.length === 0) {
				body.innerHTML = `
					<div style="padding: 30px 20px; text-align: center; color: var(--text-secondary); font-style: italic;">
						📭 Bemorga tegishli navbatlar topilmadi.
					</div>
				`
				return
			}

			// Fetch queue positions for pending appointments
			const queuePositions = {}
			const pendingAppts = list.filter(appt => appt.status === 'pending')
			try {
				await Promise.all(pendingAppts.map(async (appt) => {
					try {
						const qRes = await fetch(`https://caretrackclinic2.onrender.com/api/queue/${appt.doctorId}`)
						const qData = await qRes.json()
						if (qData.success && qData.queue) {
							const idx = qData.queue.findIndex(q => q.appointmentId === appt.id || q.id === appt.patientId)
							if (idx !== -1) {
								queuePositions[appt.id] = idx + 1
							}
						}
					} catch (e) {
						console.error("Queue index fetch error:", e)
					}
				}))
			} catch (err) {
				console.error("Parallel fetch queue error:", err)
			}

			let html = `
				<div class="p-2" style="max-height: 350px; overflow-y: auto;">
					<h3 style="font-size: 14px; color: var(--neon-cyan); margin-bottom: 12px; font-weight: bold;">Bemorning navbatlari</h3>
			`
			list.forEach(appt => {
				const qPos = queuePositions[appt.id]
				const queuePosText = qPos ? ` | <span style="color: var(--neon-cyan); font-weight: bold;">Navbat №${qPos}</span>` : ''
				const statusLabel = appt.status === 'completed' 
					? '✅ Yakunlangan' 
					: `<span style="display: inline-flex; align-items: center; gap: 4px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hourglass" style="width: 12px; height: 12px;"><path d="M5 2h14"/><path d="M5 22h14"/><path d="M19 2v4c0 1.38-1.13 2.5-2.5 3L12 12l-4.5-3C6.13 8.5 5 7.38 5 6V2"/><path d="M12 12l4.5 3c1.37.5 2.5 1.62 2.5 3v4H5v-4c0-1.38 1.13-2.5 2.5-3L12 12z"/></svg>Kutilmoqda${queuePosText}</span>`
				const statusColor = appt.status === 'completed' ? 'var(--neon-green)' : 'var(--neon-cyan)'
				html += `
					<div style="padding: 12px; margin-bottom: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
						<div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px; font-size: 13px;">
							<span>Dr. ${appt.doctorName}</span>
							<span style="color: ${statusColor}; font-size: 11px;">${statusLabel}</span>
						</div>
						<div style="font-size: 12px; color: var(--text-secondary-dark); display: flex; justify-content: space-between; align-items: center;">
							<span>Mutaxassislik: ${appt.doctorSpecialty}</span>
							<span style="display: flex; align-items: center; gap: 4px;">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar" style="width: 12px; height: 12px; color: var(--neon-cyan);"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
								<span>${appt.appointmentDate}</span>
								<span style="color: rgba(255,255,255,0.2); margin: 0 2px;">|</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-3" style="width: 12px; height: 12px; color: var(--neon-cyan);"><circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/></svg>
								<span>${appt.appointmentTime}</span>
							</span>
						</div>
					</div>
				`
			})
			html += `</div>`
			body.innerHTML = html
		} else {
			body.innerHTML = `<div style="text-align: center; color: #ff006e; padding: 20px;">Xatolik: ${data.message}</div>`
		}
	} catch (error) {
		console.error("Load Patient Appointments Error:", error)
		body.innerHTML = '<div style="text-align: center; color: #ff006e; padding: 20px;">Yuklashda server xatoligi yuz berdi!</div>'
	}
}

async function showPatientDiagnoses(patient) {
	const modal = document.getElementById('patient-modal')
	const body = document.getElementById('patient-details-body')
	const footer = document.querySelector('#patient-modal .modal-footer')
	
	body.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'
	
	footer.innerHTML = `
		<button class="btn btn-glass" id="back-to-details-btn">Orqaga</button>
	`
	document.getElementById('back-to-details-btn').onclick = () => {
		showPatientDetailsModal(patient)
	}

	try {
		const res = await fetch('https://caretrackclinic2.onrender.com/api/diagnoses')
		const data = await res.json()
		if (data.success) {
			const list = data.diagnoses.filter(d => d.patientId === patient.id)
			if (list.length === 0) {
				body.innerHTML = `
					<div style="padding: 30px 20px; text-align: center; color: var(--text-secondary); font-style: italic;">
						📭 Ushbu bemorga tegishli tashxislar topilmadi.
					</div>
				`
			} else {
				const severityMap = { yengil: 'Yengil', ortacha: "O'rtacha", ogir: "Og'ir" }
				const statusMap = { faol: 'Faol', davolanmoqda: 'Davolanmoqda', yakunlangan: 'Yakunlangan' }
				
				body.innerHTML = `
					<div class="p-4" style="max-height: 350px; overflow-y: auto;">
						<h3 style="margin-bottom: 16px; font-size: 16px; color: white; font-weight: 700;">Bemor Tashxislari</h3>
						${list.map(d => `
							<div style="padding: 12px; background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.15); border-radius: 12px; margin-bottom: 12px;">
								<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
									<span style="font-weight: 700; color: white; font-size: 13px;">${d.diseaseName}</span>
									<span style="font-size: 11px; color: var(--text-secondary);">${d.createdDate}</span>
								</div>
								<div style="font-size: 12px; color: #b0b8d4; margin-bottom: 4px;">
									Darajasi: <span class="severity-badge severity-${d.severity}" style="font-size: 11px; padding: 2px 6px; border-radius: 4px;">${severityMap[d.severity] || d.severity}</span>
								</div>
								<div style="font-size: 12px; color: #b0b8d4;">
									Holati: <span class="status-badge status-${d.status}" style="font-size: 11px; padding: 2px 6px; border-radius: 4px;">${statusMap[d.status] || d.status}</span>
								</div>
								${d.diagnosticResults ? `<div style="font-size: 12px; color: #888; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">Natijalar: ${d.diagnosticResults}</div>` : ''}
							</div>
						`).join('')}
					</div>
				`
			}
		} else {
			body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Xatolik yuz berdi!</div>`
		}
	} catch (e) {
		console.error("Fetch diagnoses error:", e)
		body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">Xatolik yuz berdi!</div>`
	}
}

function showPatientForm(mode, patient = null) {
	const modal = document.getElementById('patient-modal')
	const title = document.querySelector('#patient-modal .modal-title')
	const body = document.getElementById('patient-details-body')
	const footer = document.querySelector('#patient-modal .modal-footer')

	title.textContent = mode === 'edit' ? 'Bemorni Tahrirlash' : "Yangi Bemor Qo'shish"

	body.innerHTML = `
		<div class="p-4">
			<div class="form-group">
				<label class="form-label">F.I.Sh *</label>
				<input type="text" class="form-input" id="form-patient-name" value="${patient?.name || ''}" placeholder="Bemorning F.I.Shini kiriting">
			</div>
			<div class="grid-2">
				<div class="form-group">
					<label class="form-label">Tug'ilgan sanasi</label>
					<input type="date" class="form-input" id="form-patient-dob" value="${patient?.dob || ''}">
				</div>
				<div class="form-group">
					<label class="form-label">Jinsi</label>
					<select class="select-field" id="form-patient-gender">
						<option value="">Tanlang...</option>
						<option value="Erkak" ${patient?.gender === 'Erkak' ? 'selected' : ''}>Erkak</option>
						<option value="Ayol" ${patient?.gender === 'Ayol' ? 'selected' : ''}>Ayol</option>
					</select>
				</div>
			</div>
			<div class="grid-2">
				<div class="form-group">
					<label class="form-label">Telefon raqami *</label>
					<input type="tel" class="form-input" id="form-patient-phone" value="${patient?.phone || ''}" placeholder="+998901234567">
				</div>
				<div class="form-group">
					<label class="form-label">Pasport seriyasi</label>
					<input type="text" class="form-input" id="form-patient-passport" value="${patient?.passport || ''}" placeholder="AA1234567">
				</div>
			</div>
			<div class="form-group">
				<label class="form-label">Manzili</label>
				<input type="text" class="form-input" id="form-patient-address" value="${patient?.address || ''}" placeholder="Manzili">
			</div>
			<div class="form-group">
				<label class="form-label">Bog'lanish uchun shifokor</label>
				<select class="select-field" id="form-linked-doctor">
					<option value="">Tanlang...</option>
					${doctorsList.map(d => `<option value="${d.id}" ${patient?.linkedDoctor === d.id ? 'selected' : ''}>${d.name} (${d.specialty})</option>`).join('')}
				</select>
			</div>
		</div>
	`

	footer.innerHTML = `
		<button class="btn btn-glass" id="cancel-form-btn">Bekor qilish</button>
		<button class="btn btn-primary" id="save-patient-btn">Saqlash</button>
	`

	modal.classList.add('active')

	document.getElementById('cancel-form-btn').onclick = () => modal.classList.remove('active')

	document.getElementById('save-patient-btn').onclick = async () => {
		const formData = {
			name: document.getElementById('form-patient-name').value.trim(),
			dob: document.getElementById('form-patient-dob').value,
			gender: document.getElementById('form-patient-gender').value,
			phone: document.getElementById('form-patient-phone').value.trim(),
			passport: document.getElementById('form-patient-passport').value.trim(),
			address: document.getElementById('form-patient-address').value.trim(),
			linkedDoctor: document.getElementById('form-linked-doctor').value,
		}

		if (!formData.name || !formData.phone) {
			alert('F.I.Sh va Telefon raqami majburiy!')
			return
		}

		try {
			let response
			if (mode === 'edit') {
				response = await fetch(`https://caretrackclinic2.onrender.com/api/patients/${patient.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				})
			} else {
				response = await fetch('https://caretrackclinic2.onrender.com/api/patients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				})
			}

			const resData = await response.json()
			if (resData.success) {
				loadPatients()
				modal.classList.remove('active')
				alert(`Bemor muvaffaqiyatli ${mode === 'edit' ? 'yangilandi' : 'yaratildi'}!`)
			} else {
				alert("Xatolik: " + resData.message)
			}
		} catch (error) {
			console.error("Save Patient Error:", error)
			alert("Server bilan bog'lanishda xatolik yuz berdi!")
		}
	}
}

function showBookAppointmentModal(patient) {
	const modal = document.getElementById('patient-modal')
	const title = document.querySelector('#patient-modal .modal-title')
	const body = document.getElementById('patient-details-body')
	const footer = document.querySelector('#patient-modal .modal-footer')
	
	title.textContent = "Bemor Qabulini Rejalashtirish"
	
	const today = new Date().toISOString().split('T')[0]
	const nowTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })

	body.innerHTML = `
		<div class="p-4">
			<div class="mb-3" style="display: flex; justify-content: space-between; align-items: center;">
				<div>
					<label class="text-secondary text-sm">Bemor F.I.Sh</label>
					<div class="text-lg font-bold text-primary">${patient.name}</div>
				</div>
				<button class="btn btn-sm btn-secondary" id="view-profile-from-booking" style="padding: 6px 12px; font-size: 11px; border-radius: 20px;">👤 Profilini ko'rish</button>
			</div>
			<div class="form-group">
				<label class="form-label">Shifokor tanlang *</label>
				<select class="select-field" id="appointment-doctor">
					<option value="">Tanlang...</option>
					${doctorsList.map(d => `<option value="${d.id}" ${patient.linkedDoctor === d.id ? 'selected' : ''}>${d.name} (${d.specialty})</option>`).join('')}
				</select>
			</div>
			<div class="grid-2">
				<div class="form-group">
					<label class="form-label">Sana</label>
					<input type="date" class="form-input" id="appointment-date" value="${today}">
				</div>
				<div class="form-group">
					<label class="form-label">Vaqt (ixtiyoriy)</label>
					<input type="text" class="form-input" id="appointment-time" value="" placeholder="masalan: 10:30 (ixtiyoriy)">
				</div>
			</div>
		</div>
	`

	footer.innerHTML = `
		<button class="btn btn-glass" id="cancel-appt-btn">Bekor qilish</button>
		<button class="btn btn-primary" id="confirm-appt-btn">Tasdiqlash</button>
	`

	modal.classList.add('active')

	document.getElementById('cancel-appt-btn').onclick = () => modal.classList.remove('active')
	document.getElementById('view-profile-from-booking').onclick = () => {
		showPatientDetailsModal(patient)
	}

	document.getElementById('confirm-appt-btn').onclick = async () => {
		const appointmentData = {
			patientId: patient.id,
			doctorId: document.getElementById('appointment-doctor').value,
			appointmentDate: document.getElementById('appointment-date').value,
			appointmentTime: document.getElementById('appointment-time').value.trim()
		}

		if (!appointmentData.doctorId || !appointmentData.appointmentDate) {
			alert("Iltimos shifokor va sanani tanlang!")
			return
		}

		try {
			const response = await fetch('https://caretrackclinic2.onrender.com/api/appointments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(appointmentData)
			})

			const resData = await response.json()
			if (resData.success) {
				// Fetch the doctor's queue to determine queue number
				let queueNumber = 1
				try {
					const qRes = await fetch(`https://caretrackclinic2.onrender.com/api/queue/${appointmentData.doctorId}`)
					const qData = await qRes.json()
					if (qData.success) {
						queueNumber = qData.queue.length
					}
				} catch (e) {
					console.error("Fetch queue number error:", e)
				}
				
				// Auto link patient to doctor if it differs
				if (patient.linkedDoctor !== appointmentData.doctorId) {
					try {
						await fetch(`https://caretrackclinic2.onrender.com/api/patients/${patient.id}`, {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								name: patient.name,
								dob: patient.dob,
								gender: patient.gender,
								phone: patient.phone,
								address: patient.address,
								linkedDoctor: appointmentData.doctorId
							})
						})
						patient.linkedDoctor = appointmentData.doctorId // Update local cache
						loadPatients() // Refresh patients list UI to show the doctor name!
					} catch (err) {
						console.error("Auto link doctor error:", err)
					}
				}
				
				loadDoctors() // Reload doctor cards to update queue count badge!
				modal.classList.remove('active')

				// Show custom success modal
				const successModal = document.getElementById('booking-success-modal')
				const successNumber = document.getElementById('success-queue-number')
				if (successModal && successNumber) {
					successNumber.textContent = `#${queueNumber}`
					successModal.classList.add('active')
					setTimeout(() => {
						successModal.classList.remove('active')
					}, 3000)
				} else {
					alert(`Qabul belgilandi: ${patient.name} navbatga qo'shildi. Navbat raqami: ${queueNumber}`)
				}
			} else {
				alert("Xatolik: " + resData.message)
			}
		} catch (error) {
			console.error("Book Appointment Error:", error)
			alert("Serverda xatolik yuz berdi!")
		}
	}
}

// ==================== CHAT SECTION ====================

async function loadChatList() {
	const chatList = document.getElementById('chat-list')
	chatList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 10px;">Yuklanmoqda...</div>'

	try {
		const res = await fetch('https://caretrackclinic2.onrender.com/api/auth/users')
		const data = await res.json()

		if (!data.success) {
			chatList.innerHTML = '<div style="color: #ff006e; padding: 10px;">Xatolik</div>'
			return
		}

		const users = data.users.filter(u => {
			if (!u.userId || !u.fullName || u.fullName === 'undefined') return false
			if (u.userId === currentUser.userId) return false
			if (u.role === 'doctor') {
				return doctorsList.some(d => d.id === u.userId)
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
		const response = await fetch(`https://caretrackclinic2.onrender.com/api/messages/${currentUser.userId}`)
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
		const response = await fetch(`https://caretrackclinic2.onrender.com/api/messages/${msg.id}`, {
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
		const response = await fetch(`https://caretrackclinic2.onrender.com/api/messages/${messageId}`, {
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
	const closeModalBtn = document.getElementById('close-patient-modal')
	const closeBtn = document.getElementById('close-modal-btn')
	const patientModal = document.getElementById('patient-modal')

	if (closeModalBtn) {
		closeModalBtn.addEventListener('click', () => {
			patientModal.classList.remove('active')
		})
	}

	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			patientModal.classList.remove('active')
		})
	}

	// Close modal on overlay click
	patientModal.addEventListener('click', e => {
		if (e.target === patientModal) {
			patientModal.classList.remove('active')
		}
	})

	// Add patient button
	const addPatientBtn = document.querySelector('.add-patient-btn')
	if (addPatientBtn) {
		addPatientBtn.addEventListener('click', () => {
			showPatientForm('create')
		})
	}

	// Show all doctors button
	const showAllBtn = document.getElementById('show-all-doctors')
	if (showAllBtn) {
		let showAll = false
		showAllBtn.addEventListener('click', () => {
			showAll = !showAll
			loadDoctors(showAll ? doctorsList.length : 6)
			showAllBtn.textContent = showAll ? "Kamroq ko'rsatish" : "Barchasini ko'rish"
		})
	}

	// Search functionality
	const searchInputs = document.querySelectorAll('.search-input')
	searchInputs.forEach(input => {
		input.addEventListener('input', e => {
			const query = e.target.value.toLowerCase().trim()
			
			// If searching doctors
			if (e.target.placeholder.includes('shifokor')) {
				const filtered = doctorsList.filter(d => 
					d.name.toLowerCase().includes(query) || 
					d.specialty.toLowerCase().includes(query)
				)
				const grid = document.getElementById('doctors-grid')
				grid.innerHTML = ''
				filtered.slice(0, 6).forEach(d => grid.appendChild(createDoctorCard(d)))
			} 
			// If searching patients
			else if (e.target.placeholder.includes('bemor')) {
				const filtered = patientsList.filter(p => 
					p.name.toLowerCase().includes(query) || 
					p.phone.includes(query)
				)
				const list = document.getElementById('patients-list')
				list.innerHTML = ''
				filtered.forEach(p => list.appendChild(createPatientItem(p)))
			}
		})
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
			const response = await fetch('https://caretrackclinic2.onrender.com/api/messages', {
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
					const response = await fetch('https://caretrackclinic2.onrender.com/api/messages', {
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
