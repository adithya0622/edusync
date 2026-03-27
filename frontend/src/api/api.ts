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
  login: (email: string, class_name: string) =>
    api.post('/api/login', { email, class_name }),
}

export const studentAPI = {
  getClasses: () =>
    api.get('/api/student/classes'),

  getResults: (rollNo: string, className?: string) =>
    api.get(`/api/student/${rollNo}/results`, { params: className ? { class_name: className } : {} }),
  
  getProfile: (rollNo: string) =>
    api.get(`/api/student/${rollNo}/profile`),

  getRecommendations: (rollNo: string, className?: string) =>
    api.get(`/api/student/${rollNo}/recommendations`, { params: className ? { class_name: className } : {} }),
  
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

export const teacherAPI = {
  login: (email: string, class_name: string) =>
    api.post('/api/teacher/login', { email, class_name }),

  getClasses: () =>
    api.get('/api/teacher/classes'),

  getClassStudents: (class_name: string) =>
    api.get(`/api/teacher/class/${encodeURIComponent(class_name)}/students`),

  updateMarks: (roll_no: string, course: string, marks: Record<string, number>) =>
    api.put(`/api/teacher/student/${roll_no}/marks`, { course, marks }),

  addStudent: (roll_no: string, class_name: string, courses: Record<string, Record<string, number>>) =>
    api.post('/api/teacher/student/add', { roll_no, class_name, courses }),
}

export default api
