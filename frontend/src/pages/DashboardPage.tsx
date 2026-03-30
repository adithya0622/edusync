import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { studentAPI, curriculumAPI } from '../api/api'
import { useStudent } from '../context/StudentContext'
import { LogOut, TrendingUp, BookOpen, Award, Lightbulb, CheckCircle, BarChart3, MessageCircle, Pencil, Save, X } from 'lucide-react'
import '../styles/DashboardPage.css'

interface CourseResult {
  course: string
  student_name: string
  roll_no: string
  marks: Record<string, number>
  total_marks: number
  performance_level: string
  recommendations: string[]
  curriculum_map?: Record<string, string>
}

export default function DashboardPage() {
  const [results, setResults] = useState<Record<string, CourseResult> | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingCurriculum, setEditingCurriculum] = useState<string | null>(null)
  const [curriculumDraft, setCurriculumDraft] = useState('')
  const [savingCurriculum, setSavingCurriculum] = useState(false)
  const navigate = useNavigate()
  const { studentId, studentName, studentClass, logout } = useStudent()

  useEffect(() => {
    if (!studentId) {
      navigate('/role')
      return
    }

    const fetchResults = async () => {
      try {
        const response = await studentAPI.getResults(studentId, studentClass ?? undefined)
        if (response.data.data) {
          const data = response.data.data

          // If recommendations are missing or empty, pull explicit endpoint
          const recResponse = await studentAPI.getRecommendations(studentId, studentClass ?? undefined)
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
  }, [studentId, studentClass, navigate])

  const handleLogout = () => {
    logout()
    navigate('/role')
  }

  const handleSaveCurriculum = async (assessment: string) => {
    if (!selectedCourse) return
    setSavingCurriculum(true)
    try {
      await curriculumAPI.update(selectedCourse, assessment, curriculumDraft)
      setResults(prev => {
        if (!prev || !selectedCourse) return prev
        const updated = { ...prev }
        updated[selectedCourse] = {
          ...updated[selectedCourse],
          curriculum_map: {
            ...updated[selectedCourse].curriculum_map,
            [assessment]: curriculumDraft,
          },
        }
        return updated
      })
      setEditingCurriculum(null)
    } catch (err: any) {
      alert('Failed to save curriculum: ' + (err.response?.data?.detail || 'Unknown error'))
    } finally {
      setSavingCurriculum(false)
    }
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
          <div className="logo-mini">
            <img src="/logo.png" alt="Drop In Logo" className="logo-image-mini" />
          </div>
          <div className="header-title">
            <h1>Drop In</h1>
            <p>Student Learning Recommendations</p>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{studentName}</span>
            <span className="user-id">Roll No: {studentId}</span>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/recommendations')} className="btn-recommendations">
              <TrendingUp size={18} />
              <span>AI Recommendations</span>
            </button>
            <button onClick={() => navigate('/report')} className="btn-report">
              <BarChart3 size={18} />
              <span>Report</span>
            </button>
            <button onClick={() => navigate('/counselor')} className="btn-counselor">
              <MessageCircle size={18} />
              <span>AI Counselor</span>
            </button>
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Sidebar - Course Selection */}
        <aside className="courses-sidebar">
          <h2 className="sidebar-title">Courses</h2>
          <div className="courses-list">
            {results &&
              Object.entries(results).map(([courseId]) => (
                <button
                  key={courseId}
                  onClick={() => setSelectedCourse(courseId)}
                  className={`course-item ${
                    selectedCourse === courseId ? 'active' : ''
                  }`}
                >
                  <BookOpen size={18} />
                  <span>Marks</span>
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
                <div className="marks-grid" style={{display:'flex', flexDirection:'column', gap:'0.6rem'}}>
                  {Object.entries(currentResult.marks)
                    .filter(([assessment]) => !assessment.includes('Converted'))
                    .map(([assessment, marks]) => {
                      const curriculum = currentResult.curriculum_map?.[assessment]
                      return (
                        <div key={assessment} className="mark-item" style={{display:'flex', flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', padding:'0.85rem 1.25rem', background:'linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)', borderRadius:'8px', borderLeft:'4px solid #667eea', gap:'1rem'}}>
                          <div className="mark-item-left" style={{display:'flex', flexDirection:'column', gap:'0.15rem', flex:1, minWidth:0}}>
                            <span className="assessment-name" style={{fontSize:'0.9rem', color:'#374151', fontWeight:600}}>{assessment}</span>
                            {editingCurriculum === assessment ? (
                              <div style={{display:'flex', flexDirection:'column', gap:'0.4rem', marginTop:'0.25rem'}}>
                                <textarea
                                  value={curriculumDraft}
                                  onChange={e => setCurriculumDraft(e.target.value)}
                                  rows={2}
                                  style={{fontSize:'0.8rem', padding:'0.4rem 0.6rem', borderRadius:'6px', border:'1.5px solid #667eea', resize:'vertical', fontFamily:'inherit', outline:'none'}}
                                  autoFocus
                                />
                                <div style={{display:'flex', gap:'0.4rem'}}>
                                  <button
                                    onClick={() => handleSaveCurriculum(assessment)}
                                    disabled={savingCurriculum}
                                    style={{display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.3rem 0.7rem', background:'#667eea', color:'white', border:'none', borderRadius:'6px', fontSize:'0.78rem', fontWeight:600, cursor:'pointer'}}
                                  >
                                    <Save size={13} /> {savingCurriculum ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingCurriculum(null)}
                                    style={{display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.3rem 0.7rem', background:'#f3f4f6', color:'#374151', border:'1px solid #d1d5db', borderRadius:'6px', fontSize:'0.78rem', fontWeight:600, cursor:'pointer'}}
                                  >
                                    <X size={13} /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{display:'flex', alignItems:'center', gap:'0.4rem'}}>
                                {curriculum && (
                                  <span className="mark-curriculum" style={{fontSize:'0.8rem', color:'#6b7280', fontStyle:'italic', lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const}}>📚 {curriculum}</span>
                                )}
                                <button
                                  onClick={() => { setEditingCurriculum(assessment); setCurriculumDraft(curriculum || '') }}
                                  title="Edit curriculum"
                                  style={{flexShrink:0, background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:'0.15rem', borderRadius:'4px', display:'flex', alignItems:'center'}}
                                >
                                  <Pencil size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                          <span className="mark-value" style={{fontSize:'1.5rem', fontWeight:700, color:'white', flexShrink:0, minWidth:40, textAlign:'right', background:'#667eea', borderRadius:'8px', padding:'0.25rem 0.6rem'}}>{marks}</span>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Recommendations */}
              <div className="recommendations-section">
                <div className="recommendations-header">
                  <Lightbulb size={24} />
                  <h3>Recommended Strategies & Actions</h3>
                </div>
                <div className="recommendations-content">
                  {currentResult.recommendations && currentResult.recommendations.length > 0 ? (
                    <>
                      <div className="recommendations-intro">
                        <CheckCircle size={20} />
                        <p>Based on your performance, here are personalized learning strategies:</p>
                      </div>
                      <div className="recommendations-list">
                        {currentResult.recommendations.map((rec, idx) => (
                          <div key={idx} className="recommendation-item">
                            <div className="rec-icon">
                              <span className="rec-number">{idx + 1}</span>
                            </div>
                            <div className="rec-content">
                              <p className="rec-text">{rec}</p>
                              <p className="rec-hint">💡 Tip: Focus on this area to improve your overall performance</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="recommendations-footer">
                        <p>✅ Need more details? Click "AI Recommendations" button to explore in-depth strategies.</p>
                      </div>
                    </>
                  ) : (
                    <div className="no-recommendations">
                      <div className="recommendation-tips">
                        <h4>📖 Study Tips to Improve Your Performance:</h4>
                        <ul>
                          <li>Review your assessment scores to identify weak areas</li>
                          <li>Visit the "AI Recommendations" page for detailed insights</li>
                          <li>Focus on topics where you scored below 60%</li>
                          <li>Practice previous years' questions related to those topics</li>
                          <li>Form study groups with classmates to learn together</li>
                        </ul>
                      </div>
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
