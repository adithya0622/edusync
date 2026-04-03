import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { wellnessAPI } from '../api/api'
import { Heart, ArrowLeft, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import '../styles/WellnessPage.css'

interface WellnessResult {
  burnout_score: number
  risk_level: string
  message: string
  color: string
  risk_factors: string[]
  action_tips: string[]
  counselor_recommended: boolean
}

export default function WellnessPage() {
  const { studentId } = useStudent()
  const navigate = useNavigate()
  const [form, setForm] = useState({ study_hours_per_day: 6, sleep_hours_per_day: 7, stress_level: 5, missed_classes_this_week: 0, energy_level: 6 })
  const [result, setResult] = useState<WellnessResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId) return
    setLoading(true)
    setError(null)
    try {
      const res = await wellnessAPI.check({ roll_no: studentId, ...form })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to reach the server. Please check your connection and try again.')
    } finally { setLoading(false) }
  }

  const slider = (label: string, key: keyof typeof form, min: number, max: number, unit: string) => (
    <div className="well-field">
      <label>{label}: <strong>{form[key]} {unit}</strong></label>
      <input type="range" min={min} max={max} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))} />
      <div className="well-range-labels"><span>{min}{unit}</span><span>{max}{unit}</span></div>
    </div>
  )

  return (
    <div className="well-page">
      <div className="well-header">
        <button className="well-back" onClick={() => navigate('/dashboard')}><ArrowLeft size={18} /> Back</button>
        <h1><Heart size={24} /> Wellness & Burnout Check</h1>
        <p>Answer 5 quick questions to assess your wellbeing</p>
      </div>

      <div className="well-container">
        {!result ? (
          <form className="well-form" onSubmit={handleSubmit}>
            {slider('Study Hours Per Day', 'study_hours_per_day', 0, 16, 'hrs')}
            {slider('Sleep Hours Per Day', 'sleep_hours_per_day', 0, 12, 'hrs')}
            {slider('Stress Level', 'stress_level', 1, 10, '/10')}
            {slider('Energy Level', 'energy_level', 1, 10, '/10')}
            {slider('Missed Classes This Week', 'missed_classes_this_week', 0, 7, 'days')}
            <button type="submit" className="well-btn" disabled={loading}>
              {loading ? 'Analysing...' : '🔍 Check My Wellness'}
            </button>
            {error && (
              <div className="well-error">
                ⚠️ {error}
              </div>
            )}
          </form>
        ) : (
          <div className="well-result">
            <div className="well-gauge" style={{ borderColor: result.color }}>
              <div className="well-score" style={{ color: result.color }}>{result.burnout_score}</div>
              <div className="well-score-label">Burnout Score</div>
              <div className="well-risk" style={{ background: result.color }}>{result.risk_level} RISK</div>
            </div>
            <p className="well-message">{result.message}</p>

            {result.risk_factors.length > 0 && (
              <div className="well-section">
                <h3><AlertTriangle size={18} /> Risk Factors Detected</h3>
                <ul>{result.risk_factors.map((r, i) => <li key={i}>⚠️ {r}</li>)}</ul>
              </div>
            )}

            <div className="well-section">
              <h3><CheckCircle size={18} /> Action Plan</h3>
              <ul>{result.action_tips.map((t, i) => <li key={i}>✅ {t}</li>)}</ul>
            </div>

            {result.counselor_recommended && (
              <div className="well-alert">
                <Zap size={18} /> High risk detected! <button onClick={() => navigate('/counselor')} className="well-counselor-btn">Talk to Counselor Now →</button>
              </div>
            )}

            <button className="well-btn" onClick={() => setResult(null)}>Retake Assessment</button>
          </div>
        )}
      </div>
    </div>
  )
}
