import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { gamificationAPI } from '../api/api'
import { Trophy, Star, Zap, Users, ArrowLeft, Crown, Lock, TrendingUp, Target, BookOpen, Shield, Award } from 'lucide-react'
import '../styles/GamificationPage.css'

interface Achievement {
  id: string; emoji: string; name: string; tier: string; category: string
  description: string; unlocked: boolean; progress: number; xp_reward: number; hint: string
}
interface AchievementsData {
  xp: number; level: number; next_level_xp: number
  all_achievements: Achievement[]; earned_count: number; total_count: number
  stats: { total_assessments: number; perfect_scores: number; above_90_pct: number; above_75_pct: number; subjects_mastered: number; total_subjects: number }
}
interface LeaderEntry { rank: number; masked_roll: string; name: string; total: number; level: number; top_badge: string }

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  'First Steps': <Star size={15} />,
  'Performance': <TrendingUp size={15} />,
  'Consistency': <Target size={15} />,
  'Mastery': <BookOpen size={15} />,
  'Resilience': <Shield size={15} />,
  'XP Milestones': <Zap size={15} />,
}

const TIER_COLORS: Record<string, string> = {
  starter:  '#94a3b8',
  bronze:   '#cd7f32',
  silver:   '#94a3b8',
  gold:     '#fbbf24',
  platinum: '#a78bfa',
}

export default function GamificationPage() {
  const { studentId, studentClass } = useStudent()
  const navigate = useNavigate()
  const [data, setData]         = useState<AchievementsData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [showUnlocked, setShowUnlocked] = useState<'all' | 'earned' | 'locked'>('all')

  useEffect(() => {
    if (!studentId) { navigate('/role'); return }
    Promise.all([
      gamificationAPI.getAchievements(studentId),
      gamificationAPI.getLeaderboard(studentClass || '')
    ]).then(([achRes, lbRes]) => {
      setData(achRes.data)
      setLeaderboard(lbRes.data.leaderboard || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [studentId, studentClass, navigate])

  if (loading) return (
    <div className="gam-loading">
      <div className="gam-spinner" />
      <p>Loading your achievements...</p>
    </div>
  )

  const achievements = data?.all_achievements ?? []
  const categories = ['All', ...Array.from(new Set(achievements.map(a => a.category)))]
  const progressPct = data ? Math.min(100, ((data.xp % 50) / 50) * 100) : 0

  const filtered = achievements.filter(a => {
    const catOk = activeCategory === 'All' || a.category === activeCategory
    const stateOk = showUnlocked === 'all' || (showUnlocked === 'earned' ? a.unlocked : !a.unlocked)
    return catOk && stateOk
  })

  return (
    <div className="gam-page">
      <div className="gam-header">
        <button className="gam-back" onClick={() => navigate('/dashboard')}><ArrowLeft size={18} /> Back</button>
        <h1><Trophy size={22} /> Achievements</h1>
      </div>

      {/* ── Top Stats Row ─────────────────────────────────────────── */}
      <div className="gam-stats-row">
        {/* XP + Level */}
        <div className="gam-stat-card gam-xp-card">
          <div className="gam-level-pill">Level {data?.level ?? 1}</div>
          <div className="gam-xp-number"><Zap size={18} /> {data?.xp ?? 0} XP</div>
          <div className="gam-progress-wrap">
            <div className="gam-progress-bar">
              <div className="gam-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="gam-progress-label">{data?.next_level_xp ?? 50} XP to Level {(data?.level ?? 1) + 1}</span>
          </div>
        </div>

        {/* Badges earned */}
        <div className="gam-stat-card gam-count-card">
          <Award size={28} className="gam-stat-icon" />
          <div className="gam-stat-big">{data?.earned_count ?? 0}<span>/{data?.total_count ?? 0}</span></div>
          <div className="gam-stat-label">Badges Earned</div>
        </div>

        {/* Assessments */}
        <div className="gam-stat-card gam-count-card">
          <BookOpen size={28} className="gam-stat-icon" />
          <div className="gam-stat-big">{data?.stats.total_assessments ?? 0}</div>
          <div className="gam-stat-label">Assessments Done</div>
        </div>

        {/* Perfect scores */}
        <div className="gam-stat-card gam-count-card">
          <Star size={28} className="gam-stat-icon" />
          <div className="gam-stat-big">{data?.stats.perfect_scores ?? 0}</div>
          <div className="gam-stat-label">Perfect Scores</div>
        </div>

        {/* Subjects mastered */}
        <div className="gam-stat-card gam-count-card">
          <Trophy size={28} className="gam-stat-icon" />
          <div className="gam-stat-big">{data?.stats.subjects_mastered ?? 0}<span>/{data?.stats.total_subjects ?? 0}</span></div>
          <div className="gam-stat-label">Subjects Mastered</div>
        </div>
      </div>

      <div className="gam-main-grid">
        {/* ── Achievements Panel ──────────────────────────────────── */}
        <div className="gam-achievements-panel">
          {/* Controls */}
          <div className="gam-controls">
            <div className="gam-category-tabs">
              {categories.map(cat => (
                <button key={cat} className={`gam-cat-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
            <div className="gam-filter-btns">
              {(['all','earned','locked'] as const).map(f => (
                <button key={f} className={`gam-filter-btn ${showUnlocked === f ? 'active' : ''}`} onClick={() => setShowUnlocked(f)}>
                  {f === 'all' ? 'All' : f === 'earned' ? '✅ Earned' : '🔒 Locked'}
                </button>
              ))}
            </div>
          </div>

          {/* Badge Grid */}
          <div className="gam-achievements-grid">
            {filtered.map(a => (
              <div key={a.id} className={`gam-achieve-card ${a.unlocked ? 'unlocked' : 'locked'} tier-${a.tier}`}>
                <div className="gam-achieve-top">
                  <div className="gam-achieve-emoji">{a.unlocked ? a.emoji : <Lock size={22} />}</div>
                  <div className="gam-tier-badge" style={{ color: TIER_COLORS[a.tier] }}>{a.tier}</div>
                </div>
                <div className="gam-achieve-name">{a.name}</div>
                <div className="gam-achieve-desc">{a.description}</div>
                {!a.unlocked && a.hint && (
                  <div className="gam-achieve-hint">🎯 {a.hint}</div>
                )}
                {/* Progress bar for partially-unlocked achievements */}
                {!a.unlocked && a.progress > 0 && a.progress < 100 && (
                  <div className="gam-achieve-progress">
                    <div className="gam-achieve-progress-fill" style={{ width: `${a.progress}%` }} />
                  </div>
                )}
                {a.unlocked && (
                  <div className="gam-achieve-unlocked-badge">✅ Unlocked</div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="gam-empty-state">No achievements in this filter.</div>
            )}
          </div>
        </div>

        {/* ── Leaderboard Sidebar ─────────────────────────────────── */}
        <div className="gam-sidebar">
          <div className="gam-card">
            <h2><Crown size={18} /> Leaderboard</h2>
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

          {/* How to earn XP */}
          <div className="gam-card gam-tips-card">
            <h2><Users size={18} /> How to Earn XP</h2>
            <ul className="gam-tips-list">
              <li>💎 <strong>Perfect 100%</strong> → +60 XP</li>
              <li>🔥 <strong>Score ≥90%</strong> → +50 XP</li>
              <li>⭐ <strong>Score ≥75%</strong> → +30 XP</li>
              <li>✅ <strong>Score ≥50%</strong> → +15 XP</li>
              <li>📝 <strong>Any attempt</strong> → +5 XP</li>
              <li>🏆 <strong>Unlock badges</strong> → Bonus XP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

