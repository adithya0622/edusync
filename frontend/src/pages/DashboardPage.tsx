import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { studentAPI, curriculumAPI } from '../api/api'
import { useStudent } from '../context/StudentContext'
import { LogOut, TrendingUp, BookOpen, Award, Lightbulb, CheckCircle, BarChart3, MessageCircle, Pencil, Save, X, Moon, Sun, Flame, Download, Users } from 'lucide-react'
import html2pdf from 'html2pdf.js'
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
  max_marks_map?: Record<string, number>
}

interface PeerRank {
  rank: number
  total_students: number
  percentile: number
  your_total: number
  class_avg: number
}

// ── streak helpers ──────────────────────────────────────────────
function updateStreak(): number {
  const today = new Date().toDateString()
  const lastLogin = localStorage.getItem('lastLoginDay')
  let streak = parseInt(localStorage.getItem('loginStreak') || '0', 10)
  if (lastLogin === today) return streak
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  streak = lastLogin === yesterday ? streak + 1 : 1
  localStorage.setItem('loginStreak', String(streak))
  localStorage.setItem('lastLoginDay', today)
  return streak
}

// ── mark heat-map color ─────────────────────────────────────────
function heatColor(value: number, max: number | undefined): { bg: string; border: string } {
  if (!max || max <= 0) return { bg: '#667eea', border: '#4f46e5' }
  const pct = value / max
  if (pct >= 0.75) return { bg: '#22c55e', border: '#16a34a' }   // green – strong
  if (pct >= 0.50) return { bg: '#f59e0b', border: '#d97706' }   // amber – acceptable
  return { bg: '#ef4444', border: '#dc2626' }                     // red – needs work
}

export default function DashboardPage() {
  const [results, setResults] = useState<Record<string, CourseResult> | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingCurriculum, setEditingCurriculum] = useState<string | null>(null)
  const [curriculumDraft, setCurriculumDraft] = useState('')
  const [savingCurriculum, setSavingCurriculum] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [streak, setStreak] = useState(0)
  const [peerRank, setPeerRank] = useState<PeerRank | null>(null)
  const [lowScoreAlerts, setLowScoreAlerts] = useState<string[]>([])
  const [alertDismissed, setAlertDismissed] = useState(false)
  const navigate = useNavigate()
  const { studentId, studentName, studentClass, logout } = useStudent()

  // dark mode side-effect
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (!studentId) {
      navigate('/role')
      return
    }

    // Streak
    setStreak(updateStreak())

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

          // Compute low-score alerts across all courses
          const alerts: string[] = []
          for (const [, courseData] of Object.entries(data) as [string, CourseResult][]) {
            const maxMap = courseData.max_marks_map || {}
            for (const [assessment, mark] of Object.entries(courseData.marks)) {
              if (assessment.includes('Converted')) continue
              const max = maxMap[assessment]
              if (max && max > 0 && mark / max < 0.5) {
                alerts.push(`${assessment} (${courseData.course})`)
              }
            }
          }
          setLowScoreAlerts(alerts)
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch results')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()

    // Fetch peer rank
    if (studentId && studentClass) {
      studentAPI.getRank(studentId, studentClass)
        .then(res => { if (res.data.success) setPeerRank(res.data) })
        .catch(() => {/* rank is optional */})
    }
  }, [studentId, studentClass, navigate])

  const handleLogout = () => {
    logout()
    navigate('/role')
  }

  const handleDownloadStudyPlan = async () => {
    if (!results) return
    const weakAreas: { course: string; assessment: string; mark: number; max: number; curriculum: string }[] = []
    for (const [courseId, courseData] of Object.entries(results) as [string, CourseResult][]) {
      const maxMap = courseData.max_marks_map || {}
      const currMap = courseData.curriculum_map || {}
      for (const [assessment, mark] of Object.entries(courseData.marks)) {
        if (assessment.includes('Converted')) continue
        const max = maxMap[assessment]
        if (max && max > 0 && mark / max < 0.75) {
          weakAreas.push({ course: courseId, assessment, mark, max: Math.round(max), curriculum: currMap[assessment] || '' })
        }
      }
    }
    const weakRows = weakAreas.map(w => {
      const pct = Math.round((w.mark / w.max) * 100)
      const color = pct >= 50 ? '#f59e0b' : '#ef4444'
      return `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;">${w.course}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${w.assessment}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;color:${color};font-weight:700;">${w.mark}/${w.max} (${pct}%)</td><td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${w.curriculum || '—'}</td></tr>`
    }).join('')
    const html = `<div style="font-family:Arial,sans-serif;padding:36px;max-width:700px;margin:0 auto;"><div style="text-align:center;border-bottom:3px solid #667eea;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#667eea;font-size:28px;margin:0;">Drop In</h1><h2 style="font-size:18px;color:#374151;margin:4px 0;">Personalised Study Plan</h2><p style="color:#6b7280;font-size:13px;margin:0;">Student: ${studentName} &nbsp;|&nbsp; Roll No: ${studentId} &nbsp;|&nbsp; ${new Date().toLocaleDateString()}</p></div>${weakAreas.length > 0 ? `<h3 style="font-size:16px;margin-bottom:10px;color:#374151;">Areas Needing Attention (below 75%)</h3><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr style="background:#667eea;color:white;"><th style="padding:10px 12px;border:1px solid #667eea;text-align:left;">Course</th><th style="padding:10px 12px;border:1px solid #667eea;text-align:left;">Assessment</th><th style="padding:10px 12px;border:1px solid #667eea;text-align:center;">Score</th><th style="padding:10px 12px;border:1px solid #667eea;text-align:left;">Topics to Review</th></tr></thead><tbody>${weakRows}</tbody></table>` : '<p style="color:#22c55e;font-weight:600;">&#10003; All assessments above 75%! Keep it up!</p>'}<h3 style="font-size:16px;margin-bottom:10px;color:#374151;">General Study Strategies</h3><ul style="color:#374151;line-height:2;font-size:14px;"><li>Use Pomodoro Technique: 25 min focused → 5 min break</li><li>Practice active recall — test yourself instead of re-reading</li><li>Review weak topics for at least 30 minutes daily</li><li>Form study groups to discuss difficult concepts</li><li>Use NPTEL / Coursera resources for each flagged topic</li></ul></div>`
    const el = document.createElement('div')
    el.innerHTML = html
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    try {
      await (html2pdf as any)().set({ margin: 0.4, filename: `StudyPlan_${studentId}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(el).save()
    } finally {
      document.body.removeChild(el)
    }
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
          {streak > 0 && (
            <div title={`${streak}-day login streak!`} style={{display:'flex',alignItems:'center',gap:'0.3rem',background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'white',borderRadius:'20px',padding:'0.3rem 0.7rem',fontSize:'0.82rem',fontWeight:700,cursor:'default'}}>
              <Flame size={15}/> {streak}d streak
            </div>
          )}
          {peerRank && (
            <div title={`Rank ${peerRank.rank} of ${peerRank.total_students}`} style={{display:'flex',alignItems:'center',gap:'0.3rem',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',borderRadius:'20px',padding:'0.3rem 0.7rem',fontSize:'0.82rem',fontWeight:700,cursor:'default'}}>
              <Users size={15}/> Top {100 - peerRank.percentile}%
            </div>
          )}
          <div className="user-info">
            <span className="user-name">{studentName}</span>
            <span className="user-id">Roll No: {studentId}</span>
          </div>
          <div className="header-actions">
            <button onClick={() => setDarkMode(d => !d)} className="btn-secondary" title="Toggle dark mode" style={{minWidth:'unset',padding:'0.4rem 0.6rem'}}>
              {darkMode ? <Sun size={17}/> : <Moon size={17}/>}
            </button>
            <button onClick={handleDownloadStudyPlan} className="btn-report" title="Download personalised study plan">
              <Download size={18} />
              <span>Study Plan</span>
            </button>
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
        {/* Low-score alert banner */}
        {!alertDismissed && lowScoreAlerts.length > 0 && (
          <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'10px',padding:'0.75rem 1.25rem',margin:'0 0 0.5rem',color:'#991b1b',fontSize:'0.88rem',fontWeight:500}}>
            <span>⚠️ <strong>{lowScoreAlerts.length}</strong> assessment{lowScoreAlerts.length > 1 ? 's' : ''} below 50%: {lowScoreAlerts.slice(0,3).join(', ')}{lowScoreAlerts.length > 3 ? ` +${lowScoreAlerts.length-3} more` : ''} — check your study plan!</span>
            <button onClick={() => setAlertDismissed(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#991b1b',padding:0,flexShrink:0}}><X size={16}/></button>
          </div>
        )}
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
                      const maxMark = currentResult.max_marks_map?.[assessment]
                      const heat = heatColor(marks, maxMark)
                      return (
                        <div key={assessment} className="mark-item" style={{display:'flex', flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', padding:'0.85rem 1.25rem', background:'linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)', borderRadius:'8px', borderLeft:`4px solid ${heat.border}`, gap:'1rem'}}>
                          <div className="mark-item-left" style={{display:'flex', flexDirection:'column', gap:'0.15rem', flex:1, minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                              <span className="assessment-name" style={{fontSize:'0.9rem', color:'#374151', fontWeight:600}}>{assessment}</span>
                              {maxMark && maxMark > 0 && (
                                <span style={{fontSize:'0.72rem',fontWeight:600,color:heat.bg,background:heat.bg+'22',borderRadius:'4px',padding:'1px 6px'}}>{Math.round((marks/maxMark)*100)}%</span>
                              )}
                            </div>
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
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.2rem',flexShrink:0}}>
                            <span className="mark-value" style={{fontSize:'1.5rem', fontWeight:700, color:'white', minWidth:40, textAlign:'center', background:heat.bg, borderRadius:'8px', padding:'0.25rem 0.6rem'}}>{marks}</span>
                            {maxMark && <span style={{fontSize:'0.68rem',color:'#9ca3af'}}>/{maxMark}</span>}
                          </div>
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
