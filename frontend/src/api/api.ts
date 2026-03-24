import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
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

export default api
