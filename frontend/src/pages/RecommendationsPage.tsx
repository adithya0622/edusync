import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { recommendationAPI } from '../api/api'
import { ArrowLeft } from 'lucide-react'
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

export default function RecommendationsPage() {
  const { studentId } = useStudent()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [studentRec, setStudentRec] = useState<StudentRecommendation | null>(null)
  const [studentForm, setStudentForm] = useState({
    student_id: studentId || '',
    class_id: '',
    course_id: '19CSE301',
  })
  


  const handleGetStudentRecommendation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentForm.student_id || !studentForm.class_id) {
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

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          <ArrowLeft size={20} />
          Back to Marks
        </button>
        <h1>📊 AI Recommendations</h1>
      </div>
      
      {error && <div className="error-alert">{error}</div>}

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



          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Loading...' : 'Get Recommendations'}
          </button>
        </form>

      {/* Student Recommendation Results */}
      {studentRec && (
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
                  studentRec.recommendations.split('\n').filter(s => s.trim()).map((recommendation, idx) => (
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


    </div>
  )
}
