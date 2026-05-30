// ==================== AUTHENTICATION MODULE ====================

// Default mock users
const defaultMockUsers = {
	admin_uz: {
		password: 'Admin@12345',
		role: 'admin',
		fullName: 'Administrator',
		userId: 'admin_001',
	},
	reception_uz: {
		password: 'Recept@12345',
		role: 'receptionist',
		fullName: 'Qabulxonachi',
		userId: 'receptionist_001',
	},
	doctor_shukur: {
		password: 'Doctor@12345',
		role: 'doctor',
		fullName: 'Shukur Karimov',
		specialty: 'Terapeut',
		userId: 'doctor_001',
	},
	doctor_zarina: {
		password: 'Doctor@12345',
		role: 'doctor',
		fullName: 'Zarina Valiyeva',
		specialty: 'Kardiolog',
		userId: 'doctor_002',
	},
	doctor_anvar: {
		password: 'Doctor@12345',
		role: 'doctor',
		fullName: 'Anvar Abdullayev',
		specialty: 'Pediatr',
		userId: 'doctor_003',
	},
}

// Load mock users from localStorage or use defaults
let mockUsers = (() => {
	const saved = localStorage.getItem('caretrack_mock_users')
	return saved ? JSON.parse(saved) : { ...defaultMockUsers }
})()

// Save mock users to localStorage
function saveMockUsers() {
	localStorage.setItem('caretrack_mock_users', JSON.stringify(mockUsers))
}

// Add new doctor user to authentication system
function addDoctorUser(username, password, fullName, specialty, userId) {
	mockUsers[username] = {
		password: password,
		role: 'doctor',
		fullName: fullName,
		specialty: specialty,
		userId: userId,
	}
	saveMockUsers() // Save to localStorage
}

// Get current session
function getCurrentSession() {
	const session = localStorage.getItem('caretrack_session')
	return session ? JSON.parse(session) : null
}

// Set session
function setSession(user) {
	const sessionData = {
		userId: user.userId,
		username: user.username,
		role: user.role,
		fullName: user.fullName,
		specialty: user.specialty || null,
		loginTime: new Date().toISOString(),
	}
	localStorage.setItem('caretrack_session', JSON.stringify(sessionData))
}

// Clear session
function clearSession() {
	localStorage.removeItem('caretrack_session')
}

// Check authentication
function isAuthenticated() {
	return getCurrentSession() !== null
}

// Redirect to login if not authenticated
function requireAuth() {
	if (!isAuthenticated()) {
		window.location.href = '/'
		return false
	}
	return true
}

// Redirect to specific role dashboard
function redirectToDashboard(role) {
	switch (role) {
		case 'admin':
			window.location.href = '/dashboard/admin'
			break
		case 'doctor':
			window.location.href = '/dashboard/doctor'
			break
		case 'receptionist':
			window.location.href = '/dashboard/receptionist'
			break
		default:
			window.location.href = '/'
	}
}

// Login handler
async function handleLogin(event) {
	event.preventDefault()

	const username = document.getElementById('username').value.trim()
	const password = document.getElementById('password').value
	const errorMessage = document.getElementById('error-message')

	// Validate input
	if (!username || !password) {
		showError('Foydalanuvchi nomi va parol majburiy!', errorMessage)
		return
	}

	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ username, password })
		})

		const data = await response.json()

		if (!response.ok || !data.success) {
			showError(data.message || "Foydalanuvchi nomi yoki parol noto'g'ri!", errorMessage)
			return
		}

		// Store session
		setSession(data.user)

		// Redirect to dashboard
		redirectToDashboard(data.user.role)
	} catch (error) {
		console.error("Login Error:", error)
		showError("Server bilan bog'lanishda xatolik yuz berdi!", errorMessage)
	}
}

// Show error message
function showError(message, element) {
	element.textContent = message
	element.classList.add('show')
	setTimeout(() => {
		element.classList.remove('show')
	}, 4000)
}

// Logout handler
function handleLogout() {
	clearSession()
	window.location.href = '/'
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.getElementById('login-form')
	if (loginForm) {
		loginForm.addEventListener('submit', handleLogin)
	}

	// Toggle password visibility
	const togglePasswordBtn = document.getElementById('toggle-password')
	if (togglePasswordBtn) {
		togglePasswordBtn.addEventListener('click', () => {
			const passwordInput = document.getElementById('password')
			const icon = document.getElementById('toggle-password-icon')
			
			if (passwordInput.type === 'password') {
				passwordInput.type = 'text'
				icon.innerHTML = `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>`
				icon.setAttribute('class', 'lucide lucide-eye-off')
			} else {
				passwordInput.type = 'password'
				icon.innerHTML = `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/>`
				icon.setAttribute('class', 'lucide lucide-eye')
			}
		})
	}

	// If already logged in and on login page, redirect to dashboard
	if (isAuthenticated() && window.location.pathname === '/') {
		const session = getCurrentSession()
		redirectToDashboard(session.role)
	}
})

// Export functions for use in other modules
window.authModule = {
	getCurrentSession,
	setSession,
	clearSession,
	isAuthenticated,
	requireAuth,
	redirectToDashboard,
	handleLogout,
	addDoctorUser,
}
