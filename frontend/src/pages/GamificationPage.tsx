import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { gamificationAPI } from '../api/api'
import { Trophy, Star, Zap, Users, ArrowLeft, Crown } from 'lucide-react'
import '../styles/GamificationPage.css'

interface Badge { name: string; description: string }
interface LeaderEntry { rank: number; masked_roll: string; name: string; total: number; level: number; top_badge: string }

export default function GamificationPage() {
  const { studentId, studentClass } = useStudent()
  const navigate = useNavigate()
  const [achievements, setAchievements] = useState<{ badges: Badge[]; xp: number; level: number; next_level_xp: number } | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) { navigate('/role'); return }
    Promise.all([
      gamificationAPI.getAchievements(studentId),
      gamificationAPI.getLeaderboard(studentClass || '')
    ]).then(([achRes, lbRes]) => {
      setAchievements(achRes.data)
      setLeaderboard(lbRes.data.leaderboard || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [studentId, studentClass, navigate])

  if (loading) return <div className="gam-loading"><div className="gam-spinner" /><p>Loading your achievements...</p></div>

  const progressPct = achievements ? Math.min(100, (achievements.xp % 50) / 50 * 100) : 0

  return (
    <div className="gam-page">
      <div className="gam-header">
        <button className="gam-back" onClick={() => navigate('/dashboard')}><ArrowLeft size={18} /> Back</button>
        <h1><Trophy size={24} /> Achievements & Leaderboard</h1>
      </div>

      <div className="gam-grid">
        {/* XP Card */}
        <div className="gam-card gam-xp-card">
          <div className="gam-level-badge">Level {achievements?.level ?? 1}</div>
          <h2><Zap size={20} /> {achievements?.xp ?? 0} XP</h2>
          <div className="gam-progress-bar"><div className="gam-progress-fill" style={{ width: `${progressPct}%` }} /></div>
          <p>{achievements?.next_level_xp ?? 50} XP to next level</p>
        </div>

        {/* Badges */}
        <div className="gam-card gam-badges-card">
          <h2><Star size={20} /> Your Badges</h2>
          <div className="gam-badges-grid">
            {achievements?.badges.map((b, i) => (
              <div key={i} className="gam-badge-item">
                <div className="gam-badge-emoji">{b.name.split(' ')[0]}</div>
                <div className="gam-badge-name">{b.name.split(' ').slice(1).join(' ')}</div>
                <div className="gam-badge-desc">{b.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="gam-card gam-leaderboard-card">
          <h2><Crown size={20} /> Class Leaderboard</h2>
          <div className="gam-leaderboard">
            {leaderboard.map((entry) => (
              <div key={entry.rank} className={`gam-lb-row ${entry.rank <= 3 ? 'gam-top-' + entry.rank : ''}`}>
                <div className="gam-lb-rank">
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </div>
                <div className="gam-lb-info">
                  <span className="gam-lb-name">{entry.name}</span>
                  <span className="gam-lb-badge">{entry.top_badge}</span>
                </div>
                <div className="gam-lb-score">
                  <span className="gam-lb-total">{entry.total} pts</span>
                  <span className="gam-lb-level">Lv {entry.level}</span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="gam-empty">No leaderboard data yet.</p>}
          </div>
        </div>

        {/* Tips */}
        <div className="gam-card gam-tips-card">
          <h2><Users size={20} /> How to Earn XP</h2>
          <ul className="gam-tips-list">
            <li>🎯 Score 90%+ in an assessment → <strong>+50 XP</strong></li>
            <li>📝 Score 75–89% → <strong>+30 XP</strong></li>
            <li>✅ Score 50–74% → <strong>+15 XP</strong></li>
            <li>📚 Complete all assignments → <strong>Bonus badges</strong></li>
            <li>🔥 Daily login streak → <strong>Streak badges</strong></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
