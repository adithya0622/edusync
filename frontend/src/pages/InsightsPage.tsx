import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { peerAPI, forecastAPI, careerAPI, resourceAPI } from '../api/api'
import { Users, TrendingUp, Briefcase, BookOpen, ArrowLeft } from 'lucide-react'
import '../styles/InsightsPage.css'

export default function InsightsPage() {
  const { studentId, studentClass } = useStudent()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'peers' | 'forecast' | 'career' | 'resources'>('forecast')
  const [peers, setPeers] = useState<any>(null)
  const [forecast, setForecast] = useState<any>(null)
  const [career, setCareer] = useState<any>(null)
  const [resources, setResources] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!studentId) { navigate('/role'); return }
  }, [studentId, navigate])

  const loadTab = async (tab: typeof activeTab) => {
    setActiveTab(tab)
    setLoading(true)
    try {
      if (tab === 'peers' && !peers) setPeers((await peerAPI.getBuddies(studentId!)).data)
      if (tab === 'forecast' && !forecast) setForecast((await forecastAPI.getForecast(studentId!)).data)
      if (tab === 'career' && !career) setCareer((await careerAPI.getInsights(studentId!)).data)
      if (tab === 'resources' && !resources) setResources((await resourceAPI.getResources(studentId!)).data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (studentId) loadTab('forecast') }, [studentId])

  return (
    <div className="ins-page">
      <div className="ins-header">
        <button className="ins-back" onClick={() => navigate('/dashboard')}><ArrowLeft size={18} /> Back</button>
        <h1>✨ Smart Insights</h1>
      </div>

      <div className="ins-tabs">
        {([['forecast', 'forecast', TrendingUp, '📈 Forecast'], ['peers', 'peers', Users, '👥 Peers'], ['career', 'career', Briefcase, '💼 Career'], ['resources', 'resources', BookOpen, '📚 Resources']] as const).map(([id, , Icon, label]) => (
          <button key={id} className={`ins-tab ${activeTab === id ? 'ins-tab-active' : ''}`} onClick={() => loadTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="ins-content">
        {loading && <div className="ins-loading"><div className="ins-spinner" />Loading...</div>}

        {!loading && activeTab === 'forecast' && forecast && (
          <div className="ins-forecast">
            <div className="ins-forecast-hero" style={{ background: forecast.forecast_score >= 65 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : forecast.forecast_score >= 50 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <div className="ins-forecast-score">{forecast.forecast_score}%</div>
              <div className="ins-forecast-grade">Predicted Grade: {forecast.predicted_grade}</div>
              <div className="ins-forecast-trend">Trend: {forecast.trend === 'improving' ? '📈 Improving' : forecast.trend === 'declining' ? '📉 Declining' : '➡️ Stable'}</div>
            </div>
            <p className="ins-forecast-msg">{forecast.message}</p>
            <div className="ins-section">
              <h3>📋 Your Action Plan</h3>
              <ul>{forecast.action_plan?.map((a: string, i: number) => <li key={i}>✅ {a}</li>)}</ul>
            </div>
            <div className="ins-section">
              <h3>📊 Score History</h3>
              <div className="ins-bars">{forecast.scores_history?.map((s: number, i: number) => (
                <div key={i} className="ins-bar-wrap">
                  <div className="ins-bar" style={{ height: `${s}%`, background: s >= 60 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444' }} />
                  <span>{Math.round(s)}%</span>
                </div>
              ))}</div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'peers' && peers && (
          <div className="ins-peers">
            <p className="ins-peers-msg">{peers.message}</p>
            {peers.your_weak_subjects?.length > 0 && (
              <div className="ins-section"><h3>📉 Your Weak Areas</h3>
                <div className="ins-tags">{peers.your_weak_subjects.map((s: string, i: number) => <span key={i} className="ins-tag ins-tag-red">{s}</span>)}</div>
              </div>
            )}
            <div className="ins-section"><h3>👥 Recommended Study Buddies</h3>
              {peers.buddies?.length > 0 ? peers.buddies.map((b: any, i: number) => (
                <div key={i} className="ins-buddy">
                  <div className="ins-buddy-avatar">{b.name[0]}</div>
                  <div className="ins-buddy-info">
                    <span className="ins-buddy-name">{b.name}</span>
                    <span className="ins-buddy-badge">{b.top_badge} · Lv {b.level}</span>
                    <div className="ins-buddy-strong">Strong in: {b.strong_in?.join(', ')}</div>
                  </div>
                  <div className="ins-buddy-compat">{b.compatibility}</div>
                </div>
              )) : <p>No buddy matches found yet.</p>}
            </div>
          </div>
        )}

        {!loading && activeTab === 'career' && career && (
          <div className="ins-career">
            {career.your_strengths?.length > 0 && (
              <div className="ins-section"><h3>💪 Your Academic Strengths</h3>
                <div className="ins-tags">{career.your_strengths.map((s: string, i: number) => <span key={i} className="ins-tag ins-tag-green">{s}</span>)}</div>
              </div>
            )}
            <div className="ins-section"><h3>💼 Career Path Matches</h3>
              {career.career_paths?.map((c: any, i: number) => (
                <div key={i} className="ins-career-card">
                  <div className="ins-career-header">
                    <span className="ins-career-title">{c.title}</span>
                    <span className="ins-career-match">{c.match} match</span>
                  </div>
                  <p className="ins-career-desc">{c.description}</p>
                  <div className="ins-career-salary">💰 {c.salary_range}</div>
                  <div className="ins-tags">{c.skills_needed?.map((s: string, j: number) => <span key={j} className="ins-tag ins-tag-blue">{s}</span>)}</div>
                </div>
              ))}
            </div>
            <div className="ins-section"><h3>🚀 Next Steps</h3>
              <ul>{career.next_steps?.map((s: string, i: number) => <li key={i}>→ {s}</li>)}</ul>
            </div>
          </div>
        )}

        {!loading && activeTab === 'resources' && resources && (
          <div className="ins-resources">
            <p className="ins-resources-tip">💡 {resources.personalised_tip}</p>
            <div className="ins-resources-grid">
              {resources.resources?.map((r: any, i: number) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="ins-resource-card">
                  <div className="ins-resource-type">{r.type}</div>
                  <div className="ins-resource-title">{r.title}</div>
                  <div className="ins-resource-diff">{r.difficulty}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
