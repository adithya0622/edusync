import React, { useState } from 'react'
import { useStudent } from '../context/StudentContext'
import { recommendationAPI, studentAPI } from '../api/api'
import '../styles/RecommendationsPage.css'

interface StudentRecommendation {
  success: boolean
  student_id: number
  class_id: string
  course_id: string
  marks: Record<string, number>
  total_marks: number
  recommendations: string
}

interface ClassRecommendation {
  success: boolean
  class_id: string
  course_id: string
  average_marks: Record<string, number>
  recommendations: string
}

interface Course {
  id: string
  name: string
}

export default function RecommendationsPage() {
  const { studentId } = useStudent()
  
  // Recommendation type: 'student' or 'class'
  const [recommendationType, setRecommendationType] = useState<'student' | 'class'>('student')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Student recommendation form
  const [studentRec, setStudentRec] = useState<StudentRecommendation | null>(null)
  const [studentForm, setStudentForm] = useState({
    student_id: studentId || '',
    class_id: '',
    course_id: '',
  })
  
  // Class recommendation form
  const [classRec, setClassRec] = useState<ClassRecommendation | null>(null)
  const [classForm, setClassForm] = useState({
    class_id: '',
    course_id: '',
  })

  // Load courses on mount
  React.useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const response = await studentAPI.getCourses()
      if (response.data.success) {
        setCourses(response.data.courses)
      }
    } catch (err: any) {
      setError('Failed to load courses: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGetStudentRecommendation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentForm.student_id || !studentForm.class_id || !studentForm.course_id) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError('')
      const response = await recommendationAPI.getStudentRecommendation(
        parseInt(studentForm.student_id),
        studentForm.class_id,
        studentForm.course_id
      )
      setStudentRec(response.data)
    } catch (err: any) {
      setError('Failed to get student recommendations: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGetClassRecommendation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classForm.class_id || !classForm.course_id) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError('')
      const response = await recommendationAPI.getClassRecommendation(
        classForm.class_id,
        classForm.course_id
      )
      setClassRec(response.data)
    } catch (err: any) {
      setError('Failed to get class recommendations: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="recommendations-container">
      <h1>📊 AI Recommendations</h1>
      
      <div className="recommendation-type-selector">
        <button
          className={`type-btn ${recommendationType === 'student' ? 'active' : ''}`}
          onClick={() => {
            setRecommendationType('student')
            setError('')
            setClassRec(null)
          }}
        >
          👤 Student Recommendations
        </button>
        <button
          className={`type-btn ${recommendationType === 'class' ? 'active' : ''}`}
          onClick={() => {
            setRecommendationType('class')
            setError('')
            setStudentRec(null)
          }}
        >
          👥 Class Recommendations
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {recommendationType === 'student' ? (
        // Student Recommendation Form
        <form onSubmit={handleGetStudentRecommendation} className="recommendation-form">
          <h2>Get Student Recommendations</h2>
          
          <div className="form-group">
            <label>Student ID:</label>
            <input
              type="number"
              value={studentForm.student_id}
              onChange={(e) => setStudentForm({ ...studentForm, student_id: e.target.value })}
              placeholder="Enter student ID"
              required
            />
          </div>

          <div className="form-group">
            <label>Class ID:</label>
            <input
              type="text"
              value={studentForm.class_id}
              onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })}
              placeholder="e.g., CSE A"
              required
            />
          </div>

          <div className="form-group">
            <label>Course ID:</label>
            <select
              value={studentForm.course_id}
              onChange={(e) => setStudentForm({ ...studentForm, course_id: e.target.value })}
              required
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.id})
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Loading...' : 'Get Recommendations'}
          </button>
        </form>
      ) : (
        // Class Recommendation Form
        <form onSubmit={handleGetClassRecommendation} className="recommendation-form">
          <h2>Get Class Recommendations</h2>
          
          <div className="form-group">
            <label>Class ID:</label>
            <input
              type="text"
              value={classForm.class_id}
              onChange={(e) => setClassForm({ ...classForm, class_id: e.target.value })}
              placeholder="e.g., CSE A"
              required
            />
          </div>

          <div className="form-group">
            <label>Course ID:</label>
            <select
              value={classForm.course_id}
              onChange={(e) => setClassForm({ ...classForm, course_id: e.target.value })}
              required
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.id})
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Loading...' : 'Get Recommendations'}
          </button>
        </form>
      )}

      {/* Student Recommendation Results */}
      {studentRec && recommendationType === 'student' && (
        <div className="recommendation-results">
          <h2>📈 Student Recommendations</h2>
          <div className="result-card">
            <div className="result-header">
              <h3>Student #{studentRec.student_id} - Class {studentRec.class_id}</h3>
              <p className="course-badge">{studentRec.course_id}</p>
            </div>

            <div className="marks-section">
              <h4>📝 Assessment Marks:</h4>
              <div className="marks-grid">
                {Object.entries(studentRec.marks).map(([assessment, mark]) => (
                  <div key={assessment} className="mark-item">
                    <span className="assessment-name">{assessment}</span>
                    <span className="mark-value">{mark.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="total-marks">
                <strong>Total Score:</strong> <span>{studentRec.total_marks.toFixed(2)}</span>
              </div>
            </div>

            <div className="recommendations-section">
              <h4>💡 Recommended Strategies from Course:</h4>
              <div className="recommendations-text">
                {studentRec.recommendations ? (
                  studentRec.recommendations.split(';').filter(s => s.trim()).map((recommendation, idx) => (
                    <div key={idx} className="strategy-item">
                      <span className="strategy-number">{idx + 1}.</span>
                      <span>{recommendation.trim()}</span>
                    </div>
                  ))
                ) : (
                  <p>No strategies available. Models may still be training.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Recommendation Results */}
      {classRec && recommendationType === 'class' && (
        <div className="recommendation-results">
          <h2>📊 Class Recommendations</h2>
          <div className="result-card">
            <div className="result-header">
              <h3>Class {classRec.class_id}</h3>
              <p className="course-badge">{classRec.course_id}</p>
            </div>

            <div className="marks-section">
              <h4>📊 Average Assessment Marks:</h4>
              <div className="marks-grid">
                {Object.entries(classRec.average_marks).map(([assessment, mark]) => (
                  <div key={assessment} className="mark-item">
                    <span className="assessment-name">{assessment}</span>
                    <span className="mark-value">{mark.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="recommendations-section">
              <h4>💡 Recommended Strategies for the Class:</h4>
              <div className="recommendations-text">
                {classRec.recommendations ? (
                  classRec.recommendations.split(';').filter(s => s.trim()).map((strategy, idx) => (
                    <div key={idx} className="strategy-item">
                      <span className="strategy-number">{idx + 1}.</span>
                      <span>{strategy.trim()}</span>
                    </div>
                  ))
                ) : (
                  <p>No strategies available. Models may still be training.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
