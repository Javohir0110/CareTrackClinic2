import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB || 'caretrack'

let client
let db

export async function connectDB() {
	if (db) return db
	try {
		client = new MongoClient(uri)
		await client.connect()
		db = client.db(dbName)
		console.log('🔌 MongoDB-ga muvaffaqiyatli ulanildi!')
		
		// Seed database
		await seedDatabase(db)
		
		return db
	} catch (error) {
		console.error('❌ MongoDB-ga ulanishda xatolik:', error)
		throw error
	}
}

export function getDB() {
	if (!db) {
		throw new Error("Ma'lumotlar bazasi ishga tushmagan. Avval connectDB() ni chaqiring.")
	}
	return db
}

async function seedDatabase(database) {
	// 1. Seed Users (for auth)
	const usersCollection = database.collection('users')
	const adminExists = await usersCollection.findOne({ username: 'admin_uz' })
	const receptionExists = await usersCollection.findOne({ username: 'reception_uz' })
	const doctorGulnozaExists = await usersCollection.findOne({ username: 'doctor_gulnoza' })
	if (!adminExists || !receptionExists || !doctorGulnozaExists) {
		console.log('🌱 Dastlabki tizim foydalanuvchilari (admin, qabulxona, shifokorlar) topilmadi yoki yangilanish talab etiladi, yuklanmoqda...')
		await usersCollection.deleteMany({ username: { $in: ['admin_uz', 'reception_uz', 'doctor_shukur', 'doctor_zarina', 'doctor_anvar', 'doctor_gulnoza', 'doctor_rustam', 'doctor_laylo'] } })
		const defaultUsers = [
			{
				username: 'admin_uz',
				password: 'Admin@12345',
				role: 'admin',
				fullName: 'Administrator',
				userId: 'admin_001',
			},
			{
				username: 'reception_uz',
				password: 'Recept@12345',
				role: 'receptionist',
				fullName: 'Qabulxonachi',
				userId: 'receptionist_001',
			},
			{
				username: 'doctor_shukur',
				password: 'Doctor@12345',
				role: 'doctor',
				fullName: 'Shukur Karimov',
				specialty: 'Oilaviy shifokor',
				userId: 'doctor_001',
			},
			{
				username: 'doctor_zarina',
				password: 'Doctor@12345',
				role: 'doctor',
				fullName: 'Zarina Valiyeva',
				specialty: 'Kardiolog',
				userId: 'doctor_002',
			},
			{
				username: 'doctor_anvar',
				password: 'Doctor@12345',
				role: 'doctor',
				fullName: 'Anvar Abdullayev',
				specialty: 'Pediatr',
				userId: 'doctor_003',
			},
			{
				username: 'doctor_gulnoza',
				password: 'Doctor@12345',
				role: 'doctor',
				fullName: 'Gulnoza Rahimova',
				specialty: 'Oilaviy shifokor',
				userId: 'doctor_004',
			},
			{
				username: 'doctor_rustam',
				password: 'Doctor@12345',
				role: 'doctor',
				fullName: 'Rustam Nazarov',
				specialty: 'Oilaviy shifokor',
				userId: 'doctor_005',
			},
			{
				username: 'doctor_laylo',
				password: 'Doctor@12345',
				role: 'doctor',
				fullName: 'Laylo Ismoilova',
				specialty: 'Oilaviy shifokor',
				userId: 'doctor_006',
			},
		]
		await usersCollection.insertMany(defaultUsers)
	}

	// 2. Seed Doctors
	const doctorsCollection = database.collection('doctors')
	const doctorGulnozaDoc = await doctorsCollection.findOne({ id: 'doctor_004', specialty: 'Oilaviy shifokor' })
	if (!doctorGulnozaDoc) {
		console.log('🌱 Shifokorlar topilmadi yoki yangilanish talab etiladi, dastlabki shifokorlar yuklanmoqda...')
		await doctorsCollection.deleteMany({ id: { $in: ['doctor_001', 'doctor_002', 'doctor_003', 'doctor_004', 'doctor_005', 'doctor_006'] } })
		const defaultDoctors = [
			{
				id: 'doctor_001',
				name: 'Shukur Karimov',
				specialty: 'Oilaviy shifokor',
				dob: '1980-05-15',
				gender: 'Erkak',
				phone: '+998901111111',
				address: 'Tashkent',
				workingDays: 'Du-Se-Ch-Pa-Ju',
				workingHours: '09:00-18:00',
				username: 'doctor_shukur',
				password: 'Doctor@12345',
			},
			{
				id: 'doctor_002',
				name: 'Zarina Valiyeva',
				specialty: 'Kardiolog',
				dob: '1985-08-22',
				gender: 'Ayol',
				phone: '+998902222222',
				address: 'Tashkent',
				workingDays: 'Du-Se-Ch-Pa-Ju',
				workingHours: '10:00-17:00',
				username: 'doctor_zarina',
				password: 'Doctor@12345',
			},
			{
				id: 'doctor_003',
				name: 'Anvar Abdullayev',
				specialty: 'Pediatr',
				dob: '1982-03-10',
				gender: 'Erkak',
				phone: '+998903333333',
				address: 'Tashkent',
				workingDays: 'Du-Se-Ch-Pa-Ju-Sha',
				workingHours: '08:00-16:00',
				username: 'doctor_anvar',
				password: 'Doctor@12345',
			},
			{
				id: 'doctor_004',
				name: 'Gulnoza Rahimova',
				specialty: 'Oilaviy shifokor',
				dob: '1988-11-20',
				gender: 'Ayol',
				phone: '+998904444444',
				address: 'Samarkand',
				workingDays: 'Du-Se-Ch-Pa-Ju',
				workingHours: '09:00-17:00',
				username: 'doctor_gulnoza',
				password: 'Doctor@12345',
			},
			{
				id: 'doctor_005',
				name: 'Rustam Nazarov',
				specialty: 'Oilaviy shifokor',
				dob: '1979-06-15',
				gender: 'Erkak',
				phone: '+998905555555',
				address: 'Bukhara',
				workingDays: 'Du-Se-Ch-Pa',
				workingHours: '10:00-18:00',
				username: 'doctor_rustam',
				password: 'Doctor@12345',
			},
			{
				id: 'doctor_006',
				name: 'Laylo Ismoilova',
				specialty: 'Oilaviy shifokor',
				dob: '1992-02-14',
				gender: 'Ayol',
				phone: '+998906666666',
				address: 'Fergona',
				workingDays: 'Se-Ch-Pa-Ju-Sha',
				workingHours: '09:00-16:00',
				username: 'doctor_laylo',
				password: 'Doctor@12345',
			},
		]
		await doctorsCollection.insertMany(defaultDoctors)
	}

	// 3. Seed Patients
	const patientsCollection = database.collection('patients')
	const patientExists = await patientsCollection.findOne({ id: 'patient_001', passport: { $exists: true } })
	if (!patientExists) {
		console.log('🌱 Bemorlar topilmadi yoki pasport ma\'lumotlari yetishmayapti, dastlabki bemorlar yuklanmoqda...')
		await patientsCollection.deleteMany({ id: { $in: ['patient_001', 'patient_002', 'patient_003', 'patient_004', 'patient_005', 'patient_006', 'patient_007', 'patient_008'] } })
		const defaultPatients = [
			{
				id: 'patient_001',
				name: 'Fatima Aliyeva',
				dob: '1990-05-15',
				phone: '+998901234567',
				address: 'Tashkent',
				gender: 'Ayol',
				linkedDoctor: 'doctor_001',
				passport: 'AA1234567',
			},
			{
				id: 'patient_002',
				name: "Ali Qo'chqorov",
				dob: '1985-08-22',
				phone: '+998902345678',
				address: 'Samarkand',
				gender: 'Erkak',
				linkedDoctor: 'doctor_002',
				passport: 'AB7654321',
			},
			{
				id: 'patient_003',
				name: 'Nodira Shermatova',
				dob: '2010-03-10',
				phone: '+998903456789',
				address: 'Bukhara',
				gender: 'Ayol',
				linkedDoctor: 'doctor_003',
				passport: 'AC1122334',
			},
			{
				id: 'patient_004',
				name: 'Muhammad Xoliyev',
				dob: '1995-12-28',
				phone: '+998904567890',
				address: 'Tashkent',
				gender: 'Erkak',
				linkedDoctor: 'doctor_001',
				passport: 'AD4433221',
			},
			{
				id: 'patient_005',
				name: 'Yasmin Muhammadova',
				dob: '1988-07-03',
				phone: '+998905678901',
				address: 'Fergona',
				gender: 'Ayol',
				linkedDoctor: 'doctor_004',
				passport: 'AE9988776',
			},
			{
				id: 'patient_006',
				name: 'Uktam Yodgorov',
				dob: '2005-09-19',
				phone: '+998906789012',
				address: 'Andijan',
				gender: 'Erkak',
				linkedDoctor: 'doctor_005',
				passport: 'AF5566778',
			},
			{
				id: 'patient_007',
				name: 'Salohat Ibragimova',
				dob: '1992-01-11',
				phone: '+998907890123',
				address: 'Tashkent',
				gender: 'Ayol',
				linkedDoctor: 'doctor_002',
				passport: 'AG2233445',
			},
			{
				id: 'patient_008',
				name: 'Javohir Sattoriy',
				dob: '1998-04-22',
				phone: '+998908901234',
				address: 'Samarkand',
				gender: 'Erkak',
				linkedDoctor: 'doctor_006',
				passport: 'AH9900112',
			},
		]
		await patientsCollection.insertMany(defaultPatients)
	}

	// 4. Seed Diagnoses
	const diagnosesCollection = database.collection('diagnoses')
	const diagnosisExists = await diagnosesCollection.findOne({ id: 'diagnosis_001' })
	if (!diagnosisExists) {
		console.log('🌱 Tashxislar topilmadi, dastlabki tashxislar yuklanmoqda...')
		await diagnosesCollection.deleteMany({ id: { $in: ['diagnosis_001', 'diagnosis_002', 'diagnosis_003', 'diagnosis_004', 'diagnosis_005'] } })
		const defaultDiagnoses = [
			{
				id: 'diagnosis_001',
				patientId: 'patient_001',
				patientName: 'Fatima Aliyeva',
				diseaseName: "Og'riklik",
				severity: 'ortacha',
				status: 'davolanmoqda',
				createdDate: '2026-05-20',
			},
			{
				id: 'diagnosis_002',
				patientId: 'patient_002',
				patientName: "Ali Qo'chqorov",
				diseaseName: 'Yurak arimiyasi',
				severity: 'ogir',
				status: 'davolanmoqda',
				createdDate: '2026-05-15',
			},
			{
				id: 'diagnosis_003',
				patientId: 'patient_001',
				patientName: 'Fatima Aliyeva',
				diseaseName: 'Saharli diabet',
				severity: 'yengil',
				status: 'yakunlangan',
				createdDate: '2026-04-10',
			},
			{
				id: 'diagnosis_004',
				patientId: 'patient_004',
				patientName: 'Muhammad Xoliyev',
				diseaseName: 'Bronxit',
				severity: 'ortacha',
				status: 'davolanmoqda',
				createdDate: '2026-05-25',
			},
			{
				id: 'diagnosis_005',
				patientId: 'patient_005',
				patientName: 'Yasmin Muhammadova',
				diseaseName: 'Allergiya',
				severity: 'yengil',
				status: 'davolanmoqda',
				createdDate: '2026-05-22',
			},
		]
		await diagnosesCollection.insertMany(defaultDiagnoses)
	}
}
