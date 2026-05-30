// ==================== ADMIN DASHBOARD MODULE ====================

// Check authentication
if (!window.authModule.requireAuth()) {
	throw new Error('Not authenticated')
}

// Get current user session
const currentUser = window.authModule.getCurrentSession()

// Check if user is admin
if (currentUser.role !== 'admin') {
	window.location.href = '/'
}

// Global data stores
let mockDoctors = []
let mockPatients = []
let mockDiagnoses = []
let activeChatContact = null
let dashboardStatsData = null
let notificationsList = []


// ==================== UI INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
	// Set user info in header
	updateHeaderWithUserInfo()

	// Initialize switcher
	initializeSwitcher()

	// Load initial data from APIs
	await loadDoctorsTable() // Load doctors first as patients linkedDoctor depends on it
	await loadPatientsTable()
	await loadDiagnosesTable()
	await loadDashboardStats()
	await loadChatList()
	await fetchNotifications()
	setupAnnouncementForm()

	// Update notification badge count
	updateNotificationBadge()

	// Poll notifications every 4 seconds
	setInterval(fetchNotifications, 4000)

	// Setup event listeners
	setupEventListeners()
})

// ==================== HEADER & USER INFO ====================

function updateHeaderWithUserInfo() {
	const cabinetBtn = document.getElementById('cabinet-btn')
	const closeProfileBtn = document.getElementById('close-profile-modal')
	const logoutBtn = document.getElementById('logout-btn')

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
	const notificationBtn = document.querySelector('.header-right .icon-button[title="Bildirishnomalar"]')
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

// ==================== NOTIFICATION MODAL ====================

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

function setupAnnouncementForm() {
	const form = document.getElementById('announcement-form')
	if (form) {
		form.addEventListener('submit', async (e) => {
			e.preventDefault()
			const contentInput = document.getElementById('announcement-content')
			const content = contentInput.value.trim()
			if (!content) return

			const session = window.authModule.getCurrentSession()
			const senderId = session ? session.userId : 'admin_001'

			try {
				const response = await fetch('/api/notifications', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ senderId, content })
				})
				const data = await response.json()
				if (data.success) {
					alert("Yangilik/E'lon muvaffaqiyatli yuborildi!")
					contentInput.value = ''
					await fetchNotifications()
				} else {
					alert("Xatolik: " + data.message)
				}
			} catch (err) {
				console.error(err)
				alert("Xatolik yuz berdi!")
			}
		})
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

// ==================== DASHBOARD STATS ====================

async function loadDashboardStats() {
	const statsCards = document.getElementById('stats-cards')
	const barChart = document.getElementById('stats-bar-chart')
	const topDoctorsTbody = document.getElementById('top-doctors-tbody')
	
	try {
		const response = await fetch('/api/doctors/dashboard-stats')
		const data = await response.json()
		if (data.success) {
			dashboardStatsData = data.stats
			const stats = data.stats
			
			// Populate Stats Cards
			statsCards.innerHTML = `
				<div class="premium-stat-card theme-blue">
					<div class="stat-card-header">
						<div class="stat-icon-wrapper">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>
						</div>
						<span class="stat-trend-badge">Real vaqt</span>
					</div>
					<div class="stat-card-body">
						<span class="stat-card-label">Jami bemorlar</span>
						<span class="stat-card-value">${stats.totalPatients}</span>
					</div>
				</div>
				<div class="premium-stat-card theme-amber">
					<div class="stat-card-header">
						<div class="stat-icon-wrapper">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>
						</div>
						<span class="stat-trend-badge">Reyting</span>
					</div>
					<div class="stat-card-body">
						<span class="stat-card-label">Mutaxassislar</span>
						<span class="stat-card-value">${stats.totalDoctors}</span>
					</div>
				</div>
				<div class="premium-stat-card theme-emerald">
					<div class="stat-card-header">
						<div class="stat-icon-wrapper">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
						</div>
						<span class="stat-trend-badge">Bugun</span>
					</div>
					<div class="stat-card-body">
						<span class="stat-card-label">Bugungi qabullar</span>
						<span class="stat-card-value">${stats.todayAppointments}</span>
					</div>
				</div>
				<div class="premium-stat-card theme-pink">
					<div class="stat-card-header">
						<div class="stat-icon-wrapper">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-check"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="m9 9.5 2 2 4-4"/></svg>
						</div>
						<span class="stat-trend-badge">Tashxislar</span>
					</div>
					<div class="stat-card-body">
						<span class="stat-card-label">Faol tashxislar</span>
						<span class="stat-card-value">${stats.totalDiagnoses}</span>
					</div>
				</div>
			`
			
			// Populate CSS Bar Chart for Visits Dynamics
			barChart.innerHTML = ''
			const maxCount = Math.max(...stats.visitsDynamics.map(item => item.count), 1)
			stats.visitsDynamics.forEach(item => {
				const barPercent = Math.round((item.count / maxCount) * 100)
				const barContainer = document.createElement('div')
				barContainer.className = 'chart-bar-container'
				barContainer.innerHTML = `
					<div class="chart-bar" style="height: ${Math.max(barPercent, 5)}%;">
						<div class="chart-bar-tooltip">${item.count} ta tashrif</div>
					</div>
					<span class="chart-label">${item.label}</span>
				`
				barChart.appendChild(barContainer)
			})
			
			// Populate KPI Report Table
			topDoctorsTbody.innerHTML = ''
			if (stats.kpiReport.length === 0) {
				topDoctorsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Hozircha shifokorlar samaradorligi ma\'lumotlari yo\'q</td></tr>'
				return
			}
			
			stats.kpiReport.forEach(item => {
				const row = document.createElement('tr')
				
				let stars = ''
				const fullStars = Math.floor(item.rating)
				for (let s = 0; s < 5; s++) {
					if (s < fullStars) {
						stars += '★'
					} else {
						stars += '☆'
					}
				}
				
				row.innerHTML = `
					<td style="padding: 10px 12px; font-weight: 600;">${item.doctorName}</td>
					<td style="padding: 10px 12px; color: var(--text-secondary);">${item.specialty}</td>
					<td style="padding: 10px 12px;">
						<div class="kpi-progress-wrapper">
							<span class="kpi-progress-text">${item.efficiency}%</span>
							<div class="kpi-progress-bar">
								<div class="kpi-progress-fill" style="width: ${item.efficiency}%;"></div>
							</div>
						</div>
					</td>
					<td style="padding: 10px 12px; text-align: center;">
						<div class="star-rating" title="Reyting: ${item.rating}">
							<span class="star-icon">${stars}</span>
							<span class="rating-value">${item.rating}</span>
						</div>
					</td>
					<td style="padding: 10px 12px; text-align: center; font-weight: bold; color: var(--neon-cyan);">${item.patientsCount} ta</td>
				`
				topDoctorsTbody.appendChild(row)
			})
			
			// Setup CSV exports
			setupCSVExport()
		}
	} catch (error) {
		console.error("Load Dashboard Stats Error:", error)
		statsCards.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Statistikalarni yuklashda xatolik!</div>'
	}
}

function setupCSVExport() {
	const downloadReportBtn = document.getElementById('download-report-btn')
	const downloadKPIBtn = document.getElementById('download-kpi-btn')

	if (downloadReportBtn) {
		downloadReportBtn.onclick = () => {
			if (!dashboardStatsData || !dashboardStatsData.visitsDynamics) return
			let csvContent = "data:text/csv;charset=utf-8,Sana,Kun,Tashriflar Soni\n"
			dashboardStatsData.visitsDynamics.forEach(item => {
				csvContent += `${item.date},"${item.label.split(' ')[0]}",${item.count}\n`
			})
			const encodedUri = encodeURI(csvContent)
			const link = document.createElement("a")
			link.setAttribute("href", encodedUri)
			link.setAttribute("download", "Tashriflar_Dinamikasi_Hisoboti.csv")
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		}
	}

	if (downloadKPIBtn) {
		downloadKPIBtn.onclick = () => {
			if (!dashboardStatsData || !dashboardStatsData.kpiReport) return
			let csvContent = "data:text/csv;charset=utf-8,Shifokor,Ixtisosi,Samaradorlik,Reyting,Bemorlar Soni\n"
			dashboardStatsData.kpiReport.forEach(item => {
				csvContent += `"${item.doctorName}","${item.specialty}",${item.efficiency}%,${item.rating},${item.patientsCount}\n`
			})
			const encodedUri = encodeURI(csvContent)
			const link = document.createElement("a")
			link.setAttribute("href", encodedUri)
			link.setAttribute("download", "Shifokorlar_KPI_Hisoboti.csv")
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		}
	}
}

// ==================== DOCTORS MANAGEMENT ====================

async function loadDoctorsTable() {
	const grid = document.getElementById('doctors-grid')
	grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'

	try {
		const res = await fetch('/api/doctors')
		const data = await res.json()
		if (data.success) {
			const doctors = data.doctors
			mockDoctors = doctors // Cache globally
			grid.innerHTML = ''

			if (doctors.length === 0) {
				grid.innerHTML = `
					<div class="empty-state" style="grid-column: 1/-1;">
						<div class="empty-state-icon">👨‍⚕️</div>
						<div>Hozircha shifokorlar mavjud emas</div>
					</div>
				`
				return
			}

			doctors.forEach(doctor => {
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
					<div class="action-buttons" style="gap: 8px; justify-content: center; padding-top: 12px; border-top: 1px solid rgba(0, 212, 255, 0.1); display: flex;">
						<button class="btn btn-primary btn-sm" data-action="edit" data-id="${doctor.id}" style="display: inline-flex; align-items: center; gap: 4px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line" style="width: 12px; height: 12px;"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg> Tahrirlash</button>
						<button class="btn btn-sm" data-action="delete" data-id="${doctor.id}" style="background: linear-gradient(135deg, #ff6b6b 0%, #ef4444 100%); color: white; display: inline-flex; align-items: center; gap: 4px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash" style="width: 12px; height: 12px;"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> O'chirish</button>
					</div>
				`

				const editBtn = card.querySelector('[data-action="edit"]')
				const deleteBtn = card.querySelector('[data-action="delete"]')

				editBtn.addEventListener('click', () => {
					showDoctorForm('edit', doctor)
				})

				deleteBtn.addEventListener('click', async () => {
					if (confirm(`${doctor.name} shifokorni o'chirishni xohlaysizmi?`)) {
						try {
							const delRes = await fetch(`/api/doctors/${doctor.id}`, { method: 'DELETE' })
							const delData = await delRes.json()
							if (delData.success) {
								await loadDoctorsTable()
								await loadDashboardStats()
								alert("Shifokor muvaffaqiyatli o'chirildi!")
							} else {
								alert("Xatolik: " + delData.message)
							}
						} catch (err) {
							console.error(err)
							alert("Server bilan bog'lanishda xatolik!")
						}
					}
				})

				grid.appendChild(card)
			})
		}
	} catch (error) {
		console.error("Load Doctors Error:", error)
		grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red; padding: 20px;">Shifokorlarni yuklashda xatolik yuz berdi!</div>'
	}
}

function showDoctorForm(mode, doctor = null) {
	const modal = document.getElementById('entity-modal')
	const title = document.getElementById('entity-modal-title')
	const body = document.getElementById('entity-form-body')

	title.textContent =
		mode === 'edit' ? 'Shifokorni Tahrirlash' : "Yangi Shifokor Qo'shish"

	const formHTML = `
		<div class="form-group">
			<label class="form-label">F.I.Sh</label>
			<input type="text" class="form-input" id="form-name" value="${doctor?.name || ''}" placeholder="Shifokorning F.I.Shini kiriting">
		</div>
		<div class="form-group">
			<label class="form-label">Ixtisosi</label>
			<input type="text" class="form-input" id="form-specialty" value="${doctor?.specialty || ''}" placeholder="Ixtisosi">
		</div>
		<div class="grid-2">
			<div class="form-group">
				<label class="form-label">Foydalanuvchi nomi *</label>
				<input type="text" class="form-input" id="form-username" value="${doctor?.username || ''}" placeholder="masalan: doctor_shukur" ${mode === 'edit' ? 'disabled' : ''}>
			</div>
			<div class="form-group">
				<label class="form-label">Parol *</label>
				<div style="position: relative; width: 100%;">
					<input type="password" class="form-input" id="form-password" value="${doctor?.password || ''}" placeholder="Maxfiy parol" style="padding-right: 40px; width: 100%;">
					<button type="button" id="toggle-form-password" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0;">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" style="width: 18px; height: 18px; color: #fff;" id="toggle-form-password-icon"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
					</button>
				</div>
			</div>
		</div>
		<div class="grid-2">
			<div class="form-group">
				<label class="form-label">Tug'ilgan sanasi</label>
				<input type="date" class="form-input" id="form-dob" value="${doctor?.dob || ''}">
			</div>
			<div class="form-group">
				<label class="form-label">Jinsi</label>
				<select class="select-field" id="form-gender">
					<option value="">Tanlang...</option>
					<option value="Erkak" ${doctor?.gender === 'Erkak' ? 'selected' : ''}>Erkak</option>
					<option value="Ayol" ${doctor?.gender === 'Ayol' ? 'selected' : ''}>Ayol</option>
				</select>
			</div>
		</div>
		<div class="grid-2">
			<div class="form-group">
				<label class="form-label">Telefon raqami</label>
				<input type="tel" class="form-input" id="form-phone" value="${doctor?.phone || ''}" placeholder="+998901234567">
			</div>
			<div class="form-group">
				<label class="form-label">Manzili</label>
				<input type="text" class="form-input" id="form-address" value="${doctor?.address || ''}" placeholder="Manzili">
			</div>
		</div>
		<div class="grid-2">
			<div class="form-group">
				<label class="form-label">Ish kunlari</label>
				<div class="working-days-selector">
					${['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya']
						.map(
							day => `
						<label class="day-chip-label">
							<input type="checkbox" class="working-day-checkbox hidden-checkbox" value="${day}" ${doctor?.workingDays?.includes(day) ? 'checked' : ''}>
							<span class="day-chip">${day}</span>
						</label>
					`,
						)
						.join('')}
				</div>
			</div>
			<div class="form-group">
				<label class="form-label">Ish vaqti</label>
				<input type="text" class="form-input" id="form-working-hours" value="${doctor?.workingHours || ''}" placeholder="09:00-18:00">
			</div>
		</div>
	`

	body.innerHTML = formHTML
	modal.classList.add('active')

	// Password toggle logic for doctor form
	const toggleFormPasswordBtn = document.getElementById('toggle-form-password')
	if (toggleFormPasswordBtn) {
		toggleFormPasswordBtn.onclick = () => {
			const passwordInput = document.getElementById('form-password')
			const icon = document.getElementById('toggle-form-password-icon')
			if (passwordInput.type === 'password') {
				passwordInput.type = 'text'
				icon.innerHTML = `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>`
				icon.setAttribute('class', 'lucide lucide-eye-off')
			} else {
				passwordInput.type = 'password'
				icon.innerHTML = `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/>`
				icon.setAttribute('class', 'lucide lucide-eye')
			}
		}
	}

	document.getElementById('save-entity-btn').onclick = async () => {
		const workingDayCheckboxes = document.querySelectorAll(
			'.working-day-checkbox:checked',
		)
		const workingDays = Array.from(workingDayCheckboxes)
			.map(cb => cb.value)
			.join('-')

		const formData = {
			name: document.getElementById('form-name').value.trim(),
			specialty: document.getElementById('form-specialty').value.trim(),
			username: document.getElementById('form-username')?.value.trim() || doctor?.username,
			password: document.getElementById('form-password').value.trim(),
			dob: document.getElementById('form-dob').value,
			gender: document.getElementById('form-gender').value,
			phone: document.getElementById('form-phone').value.trim(),
			address: document.getElementById('form-address').value.trim(),
			workingDays: workingDays,
			workingHours: document.getElementById('form-working-hours').value.trim(),
		}

		if (!formData.name || !formData.specialty || !formData.username || !formData.password) {
			alert('F.I.Sh, Ixtisosi, Foydalanuvchi nomi va Parol majburiy maydonlardir!')
			return
		}

		try {
			let response
			if (mode === 'edit') {
				response = await fetch(`/api/doctors/${doctor.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				})
			} else {
				response = await fetch('/api/doctors', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				})
			}

			const data = await response.json()
			if (data.success) {
				await loadDoctorsTable()
				await loadDashboardStats()
				modal.classList.remove('active')
				alert(mode === 'edit' ? "Shifokor ma'lumotlari yangilandi!" : "Yangi shifokor muvaffaqiyatli qo'shildi!")
			} else {
				alert("Xatolik: " + data.message)
			}
		} catch (error) {
			console.error(error)
			alert("Server bilan ulanishda xatolik yuz berdi!")
		}
	}
}

// ==================== PATIENTS MANAGEMENT ====================

async function loadPatientsTable() {
	const list = document.getElementById('patients-list')
	list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'

	try {
		const res = await fetch('/api/patients')
		const data = await res.json()
		if (data.success) {
			const patients = data.patients
			mockPatients = patients
			list.innerHTML = ''

			if (patients.length === 0) {
				list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Bemorlar mavjud emas</div>'
				return
			}

			patients.forEach(patient => {
				const linkedDoctor = mockDoctors.find(d => d.id === patient.linkedDoctor)
				const item = document.createElement('div')
				item.className = 'patient-item'
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
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar" style="width: 12px; height: 12px; color: var(--neon-cyan);"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
								<span>${patient.dob}</span>
							</div>
							<span style="color: rgba(255,255,255,0.2); margin: 0 4px;">|</span>
							<span>${linkedDoctor?.name || 'Biriktirilmagan'}</span>
						</div>
					</div>
					<div class="patient-actions">
						<button class="action-btn action-btn-secondary" data-action="edit" style="display: inline-flex; align-items: center; gap: 4px;">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line" style="width: 12px; height: 12px;"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
							Tahrirlash
						</button>
						<button class="action-btn action-btn-primary" data-action="delete" style="background: linear-gradient(135deg, #ff6b6b 0%, #ef4444 100%); display: inline-flex; align-items: center; gap: 4px;">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash" style="width: 12px; height: 12px;"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
							O'chirish
						</button>
					</div>
				`

				const editBtn = item.querySelector('[data-action="edit"]')
				const deleteBtn = item.querySelector('[data-action="delete"]')

				editBtn.addEventListener('click', (e) => {
					e.stopPropagation()
					showPatientForm('edit', patient)
				})

				deleteBtn.addEventListener('click', async (e) => {
					e.stopPropagation()
					if (confirm(`${patient.name} bemorni o'chirishni xohlaysizmi?`)) {
						try {
							const delRes = await fetch(`/api/patients/${patient.id}`, { method: 'DELETE' })
							const delData = await delRes.json()
							if (delData.success) {
								await loadPatientsTable()
								await loadDashboardStats()
								alert("Bemor muvaffaqiyatli o'chirildi!")
							} else {
								alert("Xatolik: " + delData.message)
							}
						} catch (err) {
							console.error(err)
							alert("Server bilan bog'lanishda xatolik!")
						}
					}
				})

				item.addEventListener('click', () => {
					showPatientDetailsAndDiagnoses(patient)
				})

				list.appendChild(item)
			})
		}
	} catch (error) {
		console.error("Load Patients Error:", error)
		list.innerHTML = '<div style="text-align: center; color: #ff006e; padding: 20px;">Bemorlarni yuklashda xatolik yuz berdi!</div>'
	}
}

async function showPatientDetailsAndDiagnoses(patient) {
	const modal = document.getElementById('patient-details-modal')
	const title = document.getElementById('patient-details-modal-title')
	const body = document.getElementById('patient-details-modal-body')
	const closeBtn = document.getElementById('close-patient-details-modal')
	const closeBtn2 = document.getElementById('close-patient-details-modal-btn')

	title.textContent = `${patient.name} - Tashxislar Tarixi`
	body.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">Yuklanmoqda...</div>'
	
	const linkedDoctor = mockDoctors.find(d => d.id === patient.linkedDoctor)

	modal.classList.add('active')

	const close = () => modal.classList.remove('active')
	closeBtn.onclick = close
	closeBtn2.onclick = close

	try {
		const res = await fetch(`/api/diagnoses/${patient.id}`)
		const data = await res.json()
		
		let diagnosesHtml = ''
		if (data.success && data.diagnoses.length > 0) {
			diagnosesHtml = data.diagnoses.map(d => {
				const severityMap = { yengil: 'Yengil', ortacha: "O'rtacha", ogir: "Og'ir" }
				const statusMap = { faol: 'Faol', davolanmoqda: 'Davolanmoqda', yakunlangan: 'Yakunlangan' }
				return `
					<div class="diagnosis-card" style="margin-bottom: 12px; padding: 16px; pointer-events: none;">
						<div class="diagnosis-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
							<div style="font-weight: 700; font-size: 14px; color: white;">${d.diseaseName}</div>
							<span style="font-size: 11px; background: rgba(0, 212, 255, 0.1); color: var(--neon-cyan); padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(0, 212, 255, 0.2);">${d.createdDate}</span>
						</div>
						<div style="font-size: 12px; color: var(--text-secondary-dark); display: flex; flex-direction: column; gap: 4px;">
							<div><strong>Og'irlik darajasi:</strong> <span class="severity-badge severity-${d.severity}">${severityMap[d.severity] || d.severity}</span></div>
							<div><strong>Holati:</strong> <span class="status-badge status-${d.status}">${statusMap[d.status] || d.status}</span></div>
							<div><strong>Diagnostik natijalar:</strong> ${d.diagnosticResults || 'Kiritilmagan'}</div>
							<div><strong>Tavsiyalar:</strong> ${d.treatmentRecommendations || 'Kiritilmagan'}</div>
							<div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; font-size: 11px; color: var(--text-secondary);">Shifokor: ${d.doctorName || 'Noma\'lum'}</div>
						</div>
					</div>
				`
			}).join('')
		} else {
			diagnosesHtml = '<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-style: italic;">Hozircha tashxislar tarixi mavjud emas.</div>'
		}

		body.innerHTML = `
			<div class="patient-details-info" style="margin-bottom: 20px; padding: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; font-size: 13px; color: var(--text-secondary-dark);">
				<div style="margin-bottom: 6px;"><strong>F.I.Sh:</strong> <span style="color: white; font-weight: bold;">${patient.name}</span></div>
				<div style="margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone" style="width: 12px; height: 12px; color: var(--neon-cyan);"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
					<span>${patient.phone}</span>
				</div>
				<div style="margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar" style="width: 12px; height: 12px; color: var(--neon-cyan);"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
					<span>${patient.dob}</span>
				</div>
				<div><strong>Oilaviy shifokor:</strong> <span style="color: white;">${linkedDoctor?.name || 'Biriktirilmagan'}</span></div>
			</div>
			<h4 style="font-size: 14px; font-weight: bold; color: var(--neon-cyan); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-clock" style="width: 14px; height: 14px; color: var(--neon-cyan);"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><circle cx="12" cy="14" r="4"/><path d="M12 12v2h2"/></svg>
				Tashxislar Tarixi
			</h4>
			<div class="diagnoses-history-list">
				${diagnosesHtml}
			</div>
		`
	} catch (error) {
		console.error(error)
		body.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff006e;">Bemor tashxislari tarixini yuklashda xatolik yuz berdi!</div>'
	}
}

function showPatientForm(mode, patient = null) {
	const modal = document.getElementById('entity-modal')
	const title = document.getElementById('entity-modal-title')
	const body = document.getElementById('entity-form-body')

	title.textContent =
		mode === 'edit' ? 'Bemorni Tahrirlash' : "Yangi Bemor Qo'shish"

	const formHTML = `
		<div class="form-group">
			<label class="form-label">F.I.Sh</label>
			<input type="text" class="form-input" id="form-name" value="${patient?.name || ''}" placeholder="Bemorning F.I.Shini kiriting">
		</div>
		<div class="grid-2">
			<div class="form-group">
				<label class="form-label">Tug'ilgan sanasi</label>
				<input type="date" class="form-input" id="form-dob" value="${patient?.dob || ''}">
			</div>
			<div class="form-group">
				<label class="form-label">Jinsi</label>
				<select class="select-field" id="form-gender">
					<option value="">Tanlang...</option>
					<option value="Erkak" ${patient?.gender === 'Erkak' ? 'selected' : ''}>Erkak</option>
					<option value="Ayol" ${patient?.gender === 'Ayol' ? 'selected' : ''}>Ayol</option>
				</select>
			</div>
		</div>
		<div class="grid-2">
			<div class="form-group">
				<label class="form-label">Telefon raqami</label>
				<input type="tel" class="form-input" id="form-phone" value="${patient?.phone || ''}" placeholder="+998901234567">
			</div>
			<div class="form-group">
				<label class="form-label">Manzili</label>
				<input type="text" class="form-input" id="form-address" value="${patient?.address || ''}" placeholder="Manzili">
			</div>
		</div>
		<div class="form-group">
			<label class="form-label">Bog'lanish uchun shifokor</label>
			<select class="select-field" id="form-linked-doctor">
				<option value="">Tanlang...</option>
				${mockDoctors.map(d => `<option value="${d.id}" ${patient?.linkedDoctor === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
			</select>
		</div>
	`

	body.innerHTML = formHTML
	modal.classList.add('active')

	document.getElementById('save-entity-btn').onclick = async () => {
		const formData = {
			name: document.getElementById('form-name').value.trim(),
			dob: document.getElementById('form-dob').value,
			gender: document.getElementById('form-gender').value,
			phone: document.getElementById('form-phone').value.trim(),
			address: document.getElementById('form-address').value.trim(),
			linkedDoctor: document.getElementById('form-linked-doctor').value,
		}

		if (!formData.name || !formData.phone) {
			alert('F.I.Sh va Telefon raqami majburiy!')
			return
		}

		try {
			let response
			if (mode === 'edit') {
				response = await fetch(`/api/patients/${patient.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				})
			} else {
				response = await fetch('/api/patients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				})
			}

			const data = await response.json()
			if (data.success) {
				await loadPatientsTable()
				await loadDashboardStats()
				modal.classList.remove('active')
				alert(mode === 'edit' ? "Bemor ma'lumotlari yangilandi!" : "Yangi bemor muvaffaqiyatli qo'shildi!")
			} else {
				alert("Xatolik: " + data.message)
			}
		} catch (error) {
			console.error(error)
			alert("Server bilan bog'lanishda xatolik!")
		}
	}
}

// ==================== DIAGNOSES MANAGEMENT ====================

async function loadDiagnosesTable() {
	const tbody = document.getElementById('diagnoses-tbody')
	tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Yuklanmoqda...</td></tr>'

	try {
		const res = await fetch('/api/diagnoses')
		const data = await res.json()
		if (data.success) {
			const diagnoses = data.diagnoses
			mockDiagnoses = diagnoses
			tbody.innerHTML = ''

			if (diagnoses.length === 0) {
				tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Tashxislar mavjud emas</td></tr>'
				return
			}

			diagnoses.forEach(diagnosis => {
				const row = document.createElement('tr')

				const severityMap = { yengil: 'Yengil', ortacha: "O'rtacha", ogir: "Og'ir" }
				const statusMap = {
					faol: 'Faol',
					davolanmoqda: 'Davolanmoqda',
					yakunlangan: 'Yakunlangan',
				}

				row.innerHTML = `
					<td>${diagnosis.patientName}</td>
					<td>${diagnosis.diseaseName}</td>
					<td><span class="severity-badge severity-${diagnosis.severity}">${severityMap[diagnosis.severity] || diagnosis.severity}</span></td>
					<td><span class="status-badge status-${diagnosis.status}">${statusMap[diagnosis.status] || diagnosis.status}</span></td>
					<td>
						<div style="display: flex; align-items: center; gap: 6px;">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar" style="width: 12px; height: 12px; color: var(--neon-cyan);"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
							<span>${diagnosis.createdDate}</span>
						</div>
					</td>
					<td>
						<div class="action-buttons">
							<button class="btn-icon" data-action="history" style="display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 212, 255, 0.1); color: var(--neon-cyan);">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-clock" style="width: 12px; height: 12px; color: var(--neon-cyan);"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><circle cx="12" cy="14" r="4"/><path d="M12 12v2h2"/></svg>
								Tarix
							</button>
							<button class="btn-icon" data-action="edit" data-id="${diagnosis.id}" style="display: inline-flex; align-items: center; gap: 4px;">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line" style="width: 12px; height: 12px;"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
								Tahrirlash
							</button>
							<button class="btn-icon btn-delete" data-action="delete" data-id="${diagnosis.id}" style="display: inline-flex; align-items: center; gap: 4px;">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash" style="width: 12px; height: 12px;"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
								O'chirish
							</button>
						</div>
					</td>
				`

				const historyBtn = row.querySelector('[data-action="history"]')
				const editBtn = row.querySelector('[data-action="edit"]')
				const deleteBtn = row.querySelector('[data-action="delete"]')

				historyBtn.addEventListener('click', () => {
					const patient = mockPatients.find(p => p.id === diagnosis.patientId)
					if (patient) {
						showPatientDetailsAndDiagnoses(patient)
					} else {
						showPatientDetailsAndDiagnoses({
							id: diagnosis.patientId,
							name: diagnosis.patientName,
							phone: 'Noma\'lum',
							dob: 'Noma\'lum',
							linkedDoctor: ''
						})
					}
				})

				editBtn.addEventListener('click', () => {
					showDiagnosisForm(diagnosis)
				})

				deleteBtn.addEventListener('click', async () => {
					if (confirm(`${diagnosis.diseaseName} tashxisini o'chirishni xohlaysizmi?`)) {
						try {
							const delRes = await fetch(`/api/diagnoses/${diagnosis.id}`, { method: 'DELETE' })
							const delData = await delRes.json()
							if (delData.success) {
								await loadDiagnosesTable()
								await loadDashboardStats()
								alert("Tashxis o'chirildi!")
							} else {
								alert("Xatolik: " + delData.message)
							}
						} catch (err) {
							console.error(err)
							alert("Server bilan bog'lanishda xatolik yuz berdi!")
						}
					}
				})

				tbody.appendChild(row)
			})
		}
	} catch (error) {
		console.error("Load Diagnoses Error:", error)
		tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Tashxislarni yuklashda xatolik yuz berdi!</td></tr>'
	}
}

function showDiagnosisForm(diagnosis) {
	const modal = document.getElementById('entity-modal')
	const title = document.getElementById('entity-modal-title')
	const body = document.getElementById('entity-form-body')

	title.textContent = 'Tashxisni Tahrirlash'

	const formHTML = `
		<div class="form-group">
			<label class="form-label">Bemor nomi</label>
			<input type="text" class="form-input" value="${diagnosis.patientName}" disabled>
		</div>
		<div class="form-group">
			<label class="form-label">Kasallik nomi *</label>
			<input type="text" class="form-input" id="form-disease-name" value="${diagnosis.diseaseName}" placeholder="Kasallik nomi">
		</div>
		<div class="grid-2">
			<div class="form-group">
				<label class="form-label">Og'irlik darajasi</label>
				<select class="select-field" id="form-severity">
					<option value="yengil" ${diagnosis.severity === 'yengil' ? 'selected' : ''}>Yengil</option>
					<option value="ortacha" ${diagnosis.severity === 'ortacha' ? 'selected' : ''}>O'rtacha</option>
					<option value="ogir" ${diagnosis.severity === 'ogir' ? 'selected' : ''}>Og'ir</option>
				</select>
			</div>
			<div class="form-group">
				<label class="form-label">Holati</label>
				<select class="select-field" id="form-status">
					<option value="faol" ${diagnosis.status === 'faol' ? 'selected' : ''}>Faol</option>
					<option value="davolanmoqda" ${diagnosis.status === 'davolanmoqda' ? 'selected' : ''}>Davolanmoqda</option>
					<option value="yakunlangan" ${diagnosis.status === 'yakunlangan' ? 'selected' : ''}>Yakunlangan</option>
				</select>
			</div>
		</div>
		<div class="form-group">
			<label class="form-label">Tashxis natijalari</label>
			<textarea class="textarea-field" id="form-diagnostic-results" placeholder="Klinik natijalar...">${diagnosis.diagnosticResults || ''}</textarea>
		</div>
		<div class="form-group">
			<label class="form-label">Umumiy eslatmalar</label>
			<textarea class="textarea-field" id="form-general-notes" placeholder="Tavsif yoki maxsus qaydlar...">${diagnosis.generalNotes || ''}</textarea>
		</div>
		<div class="form-group">
			<label class="form-label">Davolash tavsiyalari</label>
			<textarea class="textarea-field" id="form-treatment" placeholder="Dori-darmonlar yoki rejim...">${diagnosis.treatmentRecommendations || ''}</textarea>
		</div>
	`

	body.innerHTML = formHTML
	modal.classList.add('active')

	document.getElementById('save-entity-btn').onclick = async () => {
		const updatedData = {
			diseaseName: document.getElementById('form-disease-name').value.trim(),
			severity: document.getElementById('form-severity').value,
			status: document.getElementById('form-status').value,
			diagnosticResults: document.getElementById('form-diagnostic-results').value.trim(),
			generalNotes: document.getElementById('form-general-notes').value.trim(),
			treatmentRecommendations: document.getElementById('form-treatment').value.trim(),
		}

		if (!updatedData.diseaseName) {
			alert('Kasallik nomi majburiy!')
			return
		}

		try {
			const res = await fetch(`/api/diagnoses/${diagnosis.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedData)
			})
			const data = await res.json()
			if (data.success) {
				await loadDiagnosesTable()
				await loadDashboardStats()
				modal.classList.remove('active')
				alert('Tashxis muvaffaqiyatli yangilandi!')
			} else {
				alert('Xatolik: ' + data.message)
			}
		} catch (error) {
			console.error(error)
			alert('Server bilan bog\'lanishda xatolik!')
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
		if (data.success) {
			const users = data.users.filter(u => {
				if (!u.userId || !u.fullName || u.fullName === 'undefined') return false
				if (u.userId === currentUser.userId) return false
				if (u.role === 'doctor') {
					return mockDoctors.some(d => d.id === u.userId)
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
							<div style="font-weight: 600; font-size: 14px;">${contact.fullName}</div>
							<div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${roleLabel}</div>
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
		}
	} catch (error) {
		console.error("Load Chat List Error:", error)
		chatList.innerHTML = '<div style="text-align: center; color: red; padding: 10px;">Xatolik</div>'
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
	messagesContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Yuklanmoqda...</div>'

	try {
		const res = await fetch(`/api/messages/${currentUser.userId}`)
		const data = await res.json()
		if (data.success) {
			messagesContainer.innerHTML = ''
			
			const filtered = data.messages.filter(msg => {
				if (contact.id === 'group_general') {
					return msg.recipientId === 'group_general'
				} else {
					return (msg.senderId === currentUser.userId && msg.recipientId === contact.id) ||
					       (msg.senderId === contact.id && msg.recipientId === currentUser.userId)
				}
			})

			if (filtered.length === 0) {
				messagesContainer.innerHTML = `
					<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-secondary); padding: 40px; text-align: center; width: 100%;">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-more" style="width: 24px; height: 24px; color: var(--neon-cyan);"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>
						<span style="font-style: italic; font-size: 13px;">Bu yerda suhbat hali boshlanmagan</span>
					</div>
				`
				return
			}

			filtered.forEach(msg => {
				const isSent = msg.senderId === currentUser.userId
				const messageDiv = document.createElement('div')
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
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file" style="width: 20px; height: 20px; color: var(--neon-cyan); flex-shrink: 0;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
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
		}
	} catch (error) {
		console.error("Load Messages Error:", error)
		messagesContainer.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">Xabarlarni yuklashda xatolik!</div>'
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
	// Add buttons
	const addDoctorBtn = document.getElementById('add-doctor-btn')
	const addPatientBtn = document.getElementById('add-patient-btn')

	if (addDoctorBtn) {
		addDoctorBtn.onclick = () => {
			showDoctorForm('create')
		}
	}

	if (addPatientBtn) {
		addPatientBtn.onclick = () => {
			showPatientForm('create')
		}
	}

	// Modal close buttons
	const closeEntityModal = document.getElementById('close-entity-modal')
	const cancelEntityBtn = document.getElementById('cancel-entity-btn')
	const entityModal = document.getElementById('entity-modal')

	if (closeEntityModal) {
		closeEntityModal.addEventListener('click', () => {
			entityModal.classList.remove('active')
		})
	}

	if (cancelEntityBtn) {
		cancelEntityBtn.addEventListener('click', () => {
			entityModal.classList.remove('active')
		})
	}

	// Close modal on overlay click
	entityModal.addEventListener('click', e => {
		if (e.target === entityModal) {
			entityModal.classList.remove('active')
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
			if (!activeChatContact) alert("Iltimos, avval suhbatdosh yoki guruhni tanlang!")
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
				await loadChatMessages(activeChatContact)
			}
		} catch (error) {
			console.error("Send Message Error:", error)
			alert("Xabar yuborishda xatolik yuz berdi!")
		}
	}

	if (chatSendBtn) {
		chatSendBtn.onclick = sendMessageText
	}

	if (chatInput) {
		chatInput.onkeydown = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				sendMessageText()
			}
		}
	}

	if (fileBtn && fileInput) {
		fileBtn.onclick = () => fileInput.click()
		
		fileInput.onchange = async () => {
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
						await loadChatMessages(activeChatContact)
					}
				} catch (error) {
					console.error("Send File Error:", error)
					alert("Fayl yuborishda xatolik yuz berdi!")
				}
			}
			reader.readAsDataURL(file)
		}
	}
}
