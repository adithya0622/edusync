import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { studentAPI } from '../api/api'
import { useStudent } from '../context/StudentContext'
import { LogOut, TrendingUp, Target, BookOpen, Award } from 'lucide-react'
import '../styles/DashboardPage.css'

interface CourseResult {
  course: string
  student_name: string
  roll_no: string
  marks: Record<string, number>
  total_marks: number
  performance_level: string
  recommendations: string[]
}

export default function DashboardPage() {
  const [results, setResults] = useState<Record<string, CourseResult> | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { studentId, studentName, logout } = useStudent()

  useEffect(() => {
    if (!studentId) {
      navigate('/login')
      return
    }

    const fetchResults = async () => {
      try {
        const response = await studentAPI.getResults(studentId)
        if (response.data.data) {
          const data = response.data.data

          // If recommendations are missing or empty, pull explicit endpoint
          const recResponse = await studentAPI.getRecommendations(studentId)
          if (recResponse.data?.recommendations) {
            for (const [courseId, recList] of Object.entries(recResponse.data.recommendations)) {
              if (data[courseId]) {
                data[courseId].recommendations = recList
              }
            }
          }

          setResults(data)
          const firstCourse = Object.keys(data)[0]
          setSelectedCourse(firstCourse)
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch results')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [studentId, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-full">
          <p>{error}</p>
          <button onClick={handleLogout} className="btn-secondary">
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  const currentResult = selectedCourse && results ? results[selectedCourse] : null

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-mini">U</div>
          <div className="header-title">
            <h1>Upgrade</h1>
            <p>Student Learning Recommendations</p>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{studentName}</span>
            <span className="user-id">Roll No: {studentId}</span>
          </div>
          <button onClick={() => navigate('/recommendations')} className="btn-recommendations">
            <TrendingUp size={20} />
            AI Recommendations
          </button>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Sidebar - Course Selection */}
        <aside className="courses-sidebar">
          <h2 className="sidebar-title">Courses</h2>
          <div className="courses-list">
            {results &&
              Object.entries(results).map(([courseId, data]) => (
                <button
                  key={courseId}
                  onClick={() => setSelectedCourse(courseId)}
                  className={`course-item ${
                    selectedCourse === courseId ? 'active' : ''
                  }`}
                >
                  <BookOpen size={18} />
                  <span>{courseId}</span>
                </button>
              ))}
          </div>
        </aside>

        {/* Main Content */}
        <section className="dashboard-main">
          {currentResult && (
            <>
              {/* Performance Card */}
              <div className="performance-card">
                <div className="performance-header">
                  <h2>Marks</h2>
                  <span
                    className={`performance-badge ${currentResult.performance_level
                      .toLowerCase()
                      .replace(' ', '-')}`}
                  >
                    {currentResult.performance_level}
                  </span>
                </div>

                <div className="performance-stats">
                  <div className="stat-item">
                    <Award className="stat-icon" />
                    <div className="stat-content">
                      <span className="stat-label">Total Marks</span>
                      <span className="stat-value">
                        {currentResult.total_marks}
                      </span>
                    </div>
                  </div>

                  <div className="stat-item">
                    <TrendingUp className="stat-icon" />
                    <div className="stat-content">
                      <span className="stat-label">Performance</span>
                      <span className="stat-value">
                        {currentResult.performance_level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marks Breakdown */}
              <div className="marks-breakdown">
                <h3>Marks Breakdown</h3>
                <div className="marks-grid">
                  {Object.entries(currentResult.marks)
                    .filter(([assessment]) => !assessment.includes('Converted'))
                    .map(([assessment, marks]) => (
                      <div key={assessment} className="mark-item">
                        <span className="mark-label">{assessment}</span>
                        <span className="mark-value">{marks}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="recommendations-section">
                <div className="recommendations-header">
                  <Target size={24} />
                  <h3>Recommended Strategies</h3>
                </div>
                <div className="recommendations-list">
                  {currentResult.recommendations && currentResult.recommendations.length > 0 ? (
                    currentResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <span className="rec-number">{idx + 1}</span>
                        <span className="rec-text">{rec}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-recommendations">
                      <p>📚 ML models are being trained...</p>
                      <p>Strategies from Courses.xlsx will appear here once training is complete.</p>
                      <p style={{ fontSize: '0.9em', marginTop: '10px', color: '#666' }}>
                        Visit the "AI Recommendations" page for more details.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
