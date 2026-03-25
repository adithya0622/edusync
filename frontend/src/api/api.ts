import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8082'
const API_KEY = import.meta.env.VITE_API_KEY || 'upgrade-ai-key-2026'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  }
})

export const authAPI = {
  login: (email: string) =>
    api.post('/api/login', { email }),
}

export const studentAPI = {
  getResults: (rollNo: string) =>
    api.get(`/api/student/${rollNo}/results`),
  
  getProfile: (rollNo: string) =>
    api.get(`/api/student/${rollNo}/profile`),

  getRecommendations: (rollNo: string) =>
    api.get(`/api/student/${rollNo}/recommendations`),
  
  getCourses: () =>
    api.get('/api/courses'),

  getAllResults: () =>
    api.get('/api/students/results'),
}

export const recommendationAPI = {
  getStudentRecommendation: (studentId: number, classId: string, courseId: string) =>
    api.post('/api/recommendations/student', {
      student_id: studentId,
      class_id: classId,
      course_id: courseId,
    }),
}

export const systemAPI = {
  health: () =>
    api.get('/api/health'),
}

export const securityAPI = {
  threatScan: (email: string) =>
    api.post('/api/security/threat-scan', { email }),

  threatAssessment: (email: string, studentId?: string) =>
    api.post('/api/security/threat-assessment', { email, student_id: studentId }),

  encryptNotes: (studentId: string, subject: string, notes: string) =>
    api.post('/api/security/encrypt-notes', { student_id: studentId, subject, notes }),

  decryptNotes: (studentId: string, subject: string) =>
    api.post('/api/security/decrypt-notes', { student_id: studentId, subject }),

  threatDashboard: () =>
    api.get('/api/security/threat-dashboard'),

  kyberHandshake: (clientPublicKey: string) =>
    api.post('/api/security/pqc/kyber-handshake', { client_public_key: clientPublicKey }),

  checkPasswordBreach: (passwordHash: string) =>
    api.get(`/api/security/pwned-password/${passwordHash}`),
}

export const chatAPI = {
  sendMessage: (message: string, studentId?: string, conversationHistory?: { role: string; content: string }[]) =>
    api.post('/api/chat', {
      message,
      student_id: studentId || 'guest',
      conversation_history: conversationHistory || [],
    }),
}

export default api
