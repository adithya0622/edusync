import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { studentAPI, curriculumAPI } from '../api/api'
import { useStudent } from '../context/StudentContext'
import { LogOut, BookOpen, BarChart3, MessageCircle, Pencil, Save, X, Moon, Sun, Flame, Download, Trophy, Heart, Sparkles, TrendingUp, Bell, Search, FileText, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
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

// â”€â”€ streak helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function scoreColor(pct: number) {
  if (pct >= 70) return '#10b981'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

// no custom chart components — using Recharts directly

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

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (!studentId) { navigate('/role'); return }
    setStreak(updateStreak())
    const fetchResults = async () => {
      try {
        const response = await studentAPI.getResults(studentId, studentClass ?? undefined)
        if (response.data.data) {
          const data = response.data.data
          const recResponse = await studentAPI.getRecommendations(studentId, studentClass ?? undefined)
          if (recResponse.data?.recommendations) {
            for (const [courseId, recList] of Object.entries(recResponse.data.recommendations)) {
              if (data[courseId]) data[courseId].recommendations = recList as string[]
            }
          }
          setResults(data)
          setSelectedCourse(Object.keys(data)[0])
          const alerts: string[] = []
          for (const [, courseData] of Object.entries(data) as [string, CourseResult][]) {
            const maxMap = courseData.max_marks_map || {}
            for (const [assessment, mark] of Object.entries(courseData.marks)) {
              if (assessment.includes('Converted')) continue
              const max = maxMap[assessment]
              if (max && max > 0 && mark / max < 0.5) alerts.push(`${assessment} (${courseData.course})`)
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
    if (studentId && studentClass) {
      studentAPI.getRank(studentId, studentClass)
        .then(res => { if (res.data.success) setPeerRank(res.data) })
        .catch(() => {})
    }
  }, [studentId, studentClass, navigate])

  const handleLogout = () => { logout(); navigate('/role') }

  const handleDownloadStudyPlan = async () => {
    if (!results) return
    const weakAreas: { course: string; assessment: string; mark: number; max: number | null; curriculum: string }[] = []
    for (const [courseId, courseData] of Object.entries(results) as [string, CourseResult][]) {
      const maxMap = courseData.max_marks_map || {}
      const currMap = courseData.curriculum_map || {}
      for (const [assessment, mark] of Object.entries(courseData.marks)) {
        if (assessment.includes('Converted')) continue
        const max = maxMap[assessment] ?? null
        if (!max || max <= 0 || mark / max < 0.60) {
          weakAreas.push({ course: courseId, assessment, mark, max: max ? Math.round(max) : null, curriculum: currMap[assessment] || '' })
        }
      }
    }
    const weakRows = weakAreas.map(w => {
      const pct = w.max ? Math.round((w.mark / w.max) * 100) : null
      const color = pct === null ? '#6b7280' : pct >= 50 ? '#f59e0b' : '#ef4444'
      const scoreText = w.max ? `${w.mark}/${w.max}${pct !== null ? ` (${pct}%)` : ''}` : String(w.mark)
      return `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;">${w.course}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${w.assessment}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;color:${color};font-weight:700;">${scoreText}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${w.curriculum || 'â€”'}</td></tr>`
    }).join('')
    const html = `<div style="font-family:Arial,sans-serif;padding:36px;max-width:700px;margin:0 auto;"><div style="text-align:center;border-bottom:3px solid #667eea;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#667eea;font-size:28px;margin:0;">Drop In</h1><h2 style="font-size:18px;color:#374151;margin:4px 0;">Personalised Study Plan</h2><p style="color:#6b7280;font-size:13px;margin:0;">Student: ${studentName} | Roll No: ${studentId} | ${new Date().toLocaleDateString()}</p></div>${weakAreas.length > 0 ? `<h3 style="font-size:16px;margin-bottom:10px;color:#374151;">Assessments &amp; Focus Areas</h3><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr style="background:#667eea;color:white;"><th style="padding:10px 12px;text-align:left;">Course</th><th style="padding:10px 12px;text-align:left;">Assessment</th><th style="padding:10px 12px;text-align:center;">Score</th><th style="padding:10px 12px;text-align:left;">Topics</th></tr></thead><tbody>${weakRows}</tbody></table>` : '<p style="color:#22c55e;font-weight:600;">âœ“ All assessments above 60%!</p>'}<ul style="color:#374151;line-height:2;font-size:14px;"><li>Use Pomodoro Technique: 25 min focused â†’ 5 min break</li><li>Practice active recall</li><li>Review weak topics 30 mins daily</li></ul></div>`
    try {
      await (html2pdf as any)().set({ margin: 0.4, filename: `StudyPlan_${studentId}.pdf`, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(html).save()
    } catch (err) { console.error(err) }
  }

  const handleSaveCurriculum = async (assessment: string) => {
    if (!selectedCourse) return
    setSavingCurriculum(true)
    try {
      await curriculumAPI.update(selectedCourse, assessment, curriculumDraft)
      setResults(prev => {
        if (!prev || !selectedCourse) return prev
        const updated = { ...prev }
        updated[selectedCourse] = { ...updated[selectedCourse], curriculum_map: { ...updated[selectedCourse].curriculum_map, [assessment]: curriculumDraft } }
        return updated
      })
      setEditingCurriculum(null)
    } catch (err: any) {
      alert('Failed to save: ' + (err.response?.data?.detail || 'Unknown error'))
    } finally {
      setSavingCurriculum(false)
    }
  }

  if (loading) return (
    <div className="db-loading">
      <div className="db-spinner" />
      <p>Loading your results...</p>
    </div>
  )

  if (error) return (
    <div className="db-loading">
      <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
      <button onClick={handleLogout} className="db-logout-btn">Return to Login</button>
    </div>
  )

  const currentResult = selectedCourse && results ? results[selectedCourse] : null
  const currentAssessments = currentResult
    ? Object.entries(currentResult.marks).filter(([a]) => !a.includes('Converted'))
    : []
  const avgPct = currentAssessments.length > 0
    ? Math.round(currentAssessments.reduce((acc, [a, m]) => {
        const max = currentResult?.max_marks_map?.[a]
        return acc + (max && max > 0 ? m / max : 0)
      }, 0) / currentAssessments.length * 100)
    : 0

  return (
    <div className={`db-root${darkMode ? ' db-dark' : ''}`}>

      {/* â”€â”€ LEFT SIDEBAR â”€â”€ */}
      <aside className="db-sidebar">
        <div className="db-sidebar-brand">
          <img src="/logo.png" alt="Drop In" className="db-sidebar-logo" />
          <div>
            <div className="db-sidebar-title">Drop In</div>
            <div className="db-sidebar-sub">Student Learning Recommendations</div>
          </div>
        </div>

        <nav className="db-nav">
          <button className="db-nav-item db-nav-active">
            <BarChart3 size={17} /><span>Dashboard</span>
          </button>

          <div className="db-nav-section">Courses</div>
          {results && Object.entries(results).map(([courseId, courseData]) => (
            <button key={courseId}
              className={`db-nav-item db-nav-course ${selectedCourse === courseId ? 'db-nav-course-active' : ''}`}
              onClick={() => setSelectedCourse(courseId)}>
              <BookOpen size={15} /><span>{courseData.course || courseId}</span>
            </button>
          ))}

          <div className="db-nav-divider" />

          <button className="db-nav-item" onClick={handleDownloadStudyPlan}>
            <Download size={17} /><span>Study Plan</span>
          </button>
          <button className="db-nav-item" onClick={() => navigate('/report')}>
            <FileText size={17} /><span>Report</span>
          </button>
          <button className="db-nav-item" onClick={() => navigate('/counselor')}>
            <MessageCircle size={17} /><span>AI Counselor</span>
          </button>
          <button className="db-nav-item" onClick={() => navigate('/achievements')}>
            <Trophy size={17} /><span>Achievements</span>
          </button>
          <button className="db-nav-item" onClick={() => navigate('/wellness')}>
            <Heart size={17} /><span>Wellness</span>
          </button>
          <button className="db-nav-item" onClick={() => navigate('/insights')}>
            <Sparkles size={17} /><span>Insights</span>
          </button>
        </nav>

        <div className="db-sidebar-date">
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </aside>

      {/* â”€â”€ MAIN PANEL â”€â”€ */}
      <div className="db-main">

        {/* Topbar */}
        <header className="db-topbar">
          <div className="db-topbar-left">
            <div className="db-search-box">
              <Search size={15} className="db-search-icon" />
              <input type="text" placeholder="Search..." className="db-search-input" readOnly />
            </div>
          </div>
          <div className="db-topbar-right">
            <button className="db-icon-btn" title="Notifications"><Bell size={18} /></button>
            <button className="db-icon-btn" onClick={() => setDarkMode(d => !d)} title="Toggle theme">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="db-user-card">
              <div className="db-user-avatar">{studentName?.charAt(0) || 'S'}</div>
              <div className="db-user-info">
                <span className="db-user-name">{studentName}</span>
                <span className="db-user-roll">Roll No: {studentId}</span>
                <div className="db-user-badges">
                  {streak > 0 && <span className="db-badge db-badge-fire"><Flame size={11} /> {streak}d streak</span>}
                  {peerRank && <span className="db-badge db-badge-rank"><Trophy size={11} /> Top {100 - peerRank.percentile}%</span>}
                </div>
              </div>
            </div>
            <button className="db-logout-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="db-content">

          {/* Critical Alert */}
          {!alertDismissed && lowScoreAlerts.length > 0 && (
            <div className="db-alert">
              <div className="db-alert-icon"><AlertTriangle size={20} color="#dc2626" /></div>
              <div className="db-alert-text">
                <strong>CRITICAL ALERT:</strong> Your recent assessment{lowScoreAlerts.length > 1 ? 's are' : ' is'} below 50%
                <div className="db-alert-detail">{lowScoreAlerts.slice(0, 2).join(' · ')}{lowScoreAlerts.length > 2 ? ` +${lowScoreAlerts.length - 2} more` : ''}</div>
              </div>
              <div className="db-alert-actions">
                <button className="db-alert-btn-primary" onClick={() => navigate('/counselor')}>Revise with AI Counselor</button>
                <button className="db-alert-btn-secondary" onClick={() => navigate('/recommendations')}>Adjust Study Plan</button>
              </div>
              <button className="db-alert-close" onClick={() => setAlertDismissed(true)}><X size={16} /></button>
            </div>
          )}

          {currentResult && (
            <>
              {/* â”€â”€ Stat Cards â”€â”€ */}
              <div className="db-stats">

                {/* Total Marks */}
                <div className="db-stat-card">
                  <div className="db-stat-header">
                    <span className="db-stat-label">Total Marks</span>
                  </div>
                  <div className="db-stat-value">{currentResult.total_marks}</div>
                  <ResponsiveContainer width="100%" height={65}>
                    <BarChart
                      data={currentAssessments.slice(-6).map(([key, m]) => ({
                        name: key.replace(/assignment/i, 'A').replace(/quiz/i, 'Q'),
                        pct: currentResult.max_marks_map?.[key]
                          ? Math.round((m / currentResult.max_marks_map[key]!) * 100) : 0
                      }))}
                      margin={{ top: 4, right: 0, left: -30, bottom: 0 }}
                    >
                      <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                        {currentAssessments.slice(-6).map(([key, m], i) => {
                          const maxM = currentResult.max_marks_map?.[key]
                          return <Cell key={i} fill={maxM ? scoreColor(Math.round((m / maxM) * 100)) : '#667eea'} />
                        })}
                      </Bar>
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} contentStyle={{ fontSize: '11px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Performance */}
                <div className="db-stat-card">
                  <div className="db-stat-header">
                    <span className="db-stat-label">Performance</span>
                  </div>
                  <div className="db-donut-wrap">
                    <ResponsiveContainer width="100%" height={110}>
                      <PieChart>
                        <Pie
                          data={[{ value: avgPct }, { value: 100 - avgPct }]}
                          cx="50%" cy="50%"
                          innerRadius={30} outerRadius={46}
                          startAngle={90} endAngle={-270}
                          dataKey="value" strokeWidth={0}
                        >
                          <Cell fill={scoreColor(avgPct)} />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill={scoreColor(avgPct)}>{avgPct}%</text>
                        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9ca3af">{currentResult.performance_level}</text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Class Rank */}
                <div className="db-stat-card">
                  <div className="db-stat-header">
                    <span className="db-stat-label">Class Rank</span>
                  </div>
                  <div className="db-rank-display">
                    <Trophy size={28} color="#f59e0b" />
                    <span className="db-rank-value">{peerRank ? `#${peerRank.rank}` : '--'}</span>
                  </div>
                </div>

                {/* Avg Score */}
                <div className="db-stat-card">
                  <div className="db-stat-header">
                    <span className="db-stat-label">Avg Score</span>
                  </div>
                  <div className="db-donut-wrap">
                    <ResponsiveContainer width="100%" height={110}>
                      <PieChart>
                        <Pie
                          data={[{ value: avgPct }, { value: 100 - avgPct }]}
                          cx="50%" cy="50%"
                          innerRadius={30} outerRadius={46}
                          startAngle={90} endAngle={-270}
                          dataKey="value" strokeWidth={0}
                        >
                          <Cell fill={scoreColor(avgPct)} />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="800" fill={scoreColor(avgPct)}>{avgPct}%</text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* â”€â”€ Marks Breakdown â”€â”€ */}
              <div className="db-breakdown-header">
                <h2 className="db-section-title">Marks Breakdown</h2>
                <button className="db-btn-recs" onClick={() => navigate('/recommendations')}>
                  <TrendingUp size={14} /> AI Recommendations
                </button>
              </div>

              <div className="db-assignments">
                {currentAssessments.map(([assessment, marks]) => {
                  const curriculum = currentResult.curriculum_map?.[assessment]
                  const maxMark = currentResult.max_marks_map?.[assessment]
                  const pct = maxMark && maxMark > 0 ? Math.round((marks / maxMark) * 100) : null
                  const color = pct !== null ? scoreColor(pct) : '#667eea'
                  return (
                    <div key={assessment} className="db-assignment-card">
                      <div className="db-assignment-top">
                        <div className="db-assignment-left">
                          <h3 className="db-assignment-title">
                            {assessment}
                            {pct !== null && (
                              <span className="db-pct-chip" style={{ background: color + '22', color }}>{pct}%</span>
                            )}
                          </h3>
                          {editingCurriculum === assessment ? (
                            <div className="db-curriculum-edit">
                              <textarea value={curriculumDraft} onChange={e => setCurriculumDraft(e.target.value)}
                                rows={2} className="db-curriculum-textarea" autoFocus />
                              <div className="db-curriculum-btns">
                                <button onClick={() => handleSaveCurriculum(assessment)} disabled={savingCurriculum} className="db-save-btn">
                                  <Save size={12} /> {savingCurriculum ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => setEditingCurriculum(null)} className="db-cancel-btn">
                                  <X size={12} /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="db-curriculum-row">
                              {curriculum && <p className="db-curriculum-text"><BookOpen size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />{curriculum}</p>}
                              <button onClick={() => { setEditingCurriculum(assessment); setCurriculumDraft(curriculum || '') }} className="db-edit-btn">
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="db-score-circle" style={{ borderColor: color }}>
                          <span className="db-score-val" style={{ color }}>{marks}</span>
                          {maxMark && <span className="db-score-denom">/{maxMark}</span>}
                        </div>
                      </div>
                      {pct !== null && (
                        <div className="db-score-bar">
                          <div className="db-score-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      )}
                      {pct !== null && pct < 70 && (
                        <button className="db-review-btn" onClick={() => navigate('/counselor')}>
                          Get Tailored AI Review
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
