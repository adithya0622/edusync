import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { studentAPI } from '../api/api'
import { ArrowLeft, RefreshCw, BookOpen, CheckCircle, ExternalLink } from 'lucide-react'
import '../styles/RecommendationsPage.css'

interface OnlineResource {
  title: string
  url: string
  platform: string
  icon: string
  how_to_use: string
}

interface WeakAssessmentResource {
  assessment: string
  topic: string
  resources: OnlineResource[]
}

interface CourseResult {
  course: string
  marks: Record<string, number>
  total_marks: number
  performance_level: string
  recommendations: string[]
  online_resources: WeakAssessmentResource[]
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  YouTube:      { bg: '#fee2e2', text: '#dc2626', label: '▶ YouTube' },
  NPTEL:        { bg: '#fef3c7', text: '#d97706', label: '🎓 NPTEL' },
  Coursera:     { bg: '#dbeafe', text: '#2563eb', label: '📚 Coursera' },
  GeeksForGeeks:{ bg: '#d1fae5', text: '#059669', label: '💻 GFG' },
  'MIT OCW':    { bg: '#ede9fe', text: '#7c3aed', label: '🏛 MIT OCW' },
}

const PERF_COLOR: Record<string, string> = {
  Excellent: '#22c55e',
  'Very Good': '#84cc16',
  Good: '#3b82f6',
  Satisfactory: '#f59e0b',
  'Needs Improvement': '#ef4444',
}

export default function RecommendationsPage() {
  const { studentId, studentClass } = useStudent()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Record<string, CourseResult>>({})

  useEffect(() => {
    if (!studentId) {
      navigate('/role')
      return
    }
    fetchRecommendations()
  }, [studentId, navigate])

  const fetchRecommendations = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await studentAPI.getResults(studentId!, studentClass || undefined)
      if (res.data.success) {
        setResults(res.data.data || {})
      } else {
        setError('Could not load recommendations.')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <div className="header-left">
          <div className="logo-mini">
            <img src="/logo.png" alt="Drop In Logo" className="logo-image-mini" />
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            <ArrowLeft size={18} /> Back to Marks
          </button>
        </div>
        <h1>📊 AI Recommendations</h1>
      </div>

      {/* Identity strip — locked, not editable */}
      <div className="identity-strip">
        <div className="identity-item">
          <span className="identity-label">Student ID</span>
          <span className="identity-value">{studentId}</span>
        </div>
        <div className="identity-divider" />
        <div className="identity-item">
          <span className="identity-label">Class</span>
          <span className="identity-value">{studentClass}</span>
        </div>
        <button onClick={fetchRecommendations} className="btn-refresh" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading your personalized recommendations…</p>
        </div>
      ) : Object.keys(results).length === 0 ? (
        <div className="error-alert">No data found for your account. Please contact your instructor.</div>
      ) : (
        Object.entries(results).map(([courseId, data]) => (
          <div key={courseId} className="recommendation-results">
            <div className="result-card">
              <div className="result-header">
                <div className="result-header-left">
                  <BookOpen size={20} />
                  <h3>{courseId}</h3>
                </div>
                <span
                  className="perf-badge-large"
                  style={{
                    background: (PERF_COLOR[data.performance_level] || '#667eea') + '20',
                    color: PERF_COLOR[data.performance_level] || '#667eea',
                  }}
                >
                  {data.performance_level}
                </span>
              </div>

              <div className="marks-section">
                <h4>📝 Assessment Marks</h4>
                <div className="marks-grid">
                  {Object.entries(data.marks).map(([assessment, mark]) => (
                    <div key={assessment} className="mark-item">
                      <span className="assessment-name">{assessment}</span>
                      <span className="mark-value">{mark}</span>
                    </div>
                  ))}
                </div>
                <div className="total-marks">
                  <strong>Total Score:</strong>
                  <span>{Number(data.total_marks).toFixed(2)}</span>
                </div>
              </div>

              <div className="recommendations-section">
                <h4>💡 Your Personalized Study Plan</h4>
                {data.recommendations && data.recommendations.length > 0 ? (
                  <div className="strategy-list">
                    {data.recommendations.map((rec, idx) => {
                      const lines = rec.split('\n').filter(l => l.trim())
                      return (
                        <div key={idx} className="strategy-block">
                          <div className="strategy-block-header">
                            <CheckCircle size={16} />
                            <span>Strategy {idx + 1}</span>
                          </div>
                          <div className="strategy-steps">
                            {lines.map((line, li) => (
                              <p key={li} className={line.startsWith('Step') ? 'step-line' : 'step-detail'}>
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="no-recs">
                    <CheckCircle size={20} color="#22c55e" />
                    <p>Great job! You're performing well in all areas. Keep it up!</p>
                  </div>
                )}
              </div>

              {/* ── Online courses section ── */}
              {data.online_resources && data.online_resources.length > 0 && (
                <div className="online-resources-section">
                  <h4>🌐 Free Online Courses to Improve</h4>
                  <p className="resources-sub">Your weak topics are matched to free learning resources below. Here's how to use each platform:</p>

                  {/* Platform guide */}
                  <div className="platform-guide">
                    {(Object.entries(PLATFORM_COLORS) as [string, { bg: string; text: string; label: string }][]).map(([platform, style]) => {
                      const guide: Record<string, string> = {
                        YouTube:       'Watch the top video/playlist for a visual walkthrough.',
                        NPTEL:         'Enroll free → open the relevant Week → watch IIT lectures.',
                        Coursera:      'Click Audit for free → access all videos & readings.',
                        GeeksForGeeks: 'Open the first matching article → read theory + examples.',
                        'MIT OCW':     'Open a course → Lecture Notes or Video Lectures tab.',
                      }
                      return (
                        <div key={platform} className="guide-chip" style={{ background: style.bg, color: style.text }}>
                          <span className="guide-chip-label">{style.label}</span>
                          <span className="guide-chip-text">{guide[platform]}</span>
                        </div>
                      )
                    })}
                  </div>

                  {data.online_resources.map((weakItem, wi) => (
                    <div key={wi} className="weak-assessment-block">
                      <div className="weak-assessment-header">
                        <span className="weak-badge">⚠ Needs attention</span>
                        <span className="weak-name">{weakItem.assessment}</span>
                        <span className="weak-topic">{weakItem.topic}</span>
                      </div>
                      <div className="resource-cards">
                        {weakItem.resources.map((res, ri) => {
                          const style = PLATFORM_COLORS[res.platform] || { bg: '#f3f4f6', text: '#374151', label: res.platform }
                          return (
                            <div key={ri} className="resource-card-wrapper">
                              <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resource-card"
                                style={{ background: style.bg, color: style.text }}
                              >
                                <span className="resource-platform">{style.label}</span>
                                <ExternalLink size={13} />
                              </a>
                              {res.how_to_use && (
                                <p className="resource-how-to">{res.how_to_use}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
