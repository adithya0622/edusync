import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { teacherAPI } from '../api/api'
import { Mail, Users, AlertCircle, Lock } from 'lucide-react'
import '../styles/TeacherLoginPage.css'

export default function TeacherLoginPage() {
  const [email, setEmail] = useState('')
  const [className, setClassName] = useState('')
  const [password, setPassword] = useState('')
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    teacherAPI.getClasses()
      .then(res => {
        if (res.data.success) {
          setClasses(res.data.classes)
        } else {
          setError('Failed to load class names. Please try again later.')
        }
      })
      .catch(() => {
        setError('Unable to fetch class names. Please check your connection.')
      })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await teacherAPI.login(email, className, password)
      if (res.data.success) {
        localStorage.setItem('teacherLoggedIn', 'true')
        localStorage.setItem('teacherClass', className)
        localStorage.setItem('teacherToken', res.data.token || '')
        navigate('/teacher/dashboard')
      } else {
        setError(res.data.message || 'Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid teacher credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="teacher-login-container">
      <div className="teacher-login-card">
        <div className="teacher-login-header">
          <div className="logo-circle">
            <img src="/logo.png" alt="Drop In Logo" className="logo-image" />
          </div>
          <h1>Teacher Login</h1>
          <p className="subtitle">Drop In — Educator Portal</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="teacher-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={20} className="input-icon" />
              <input
                id="teacher-email"
                type="email"
                placeholder="teacher123@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="class-select">Select Class</label>
            <div className="input-wrapper">
              <Users size={20} className="input-icon" />
              <select
                id="class-select"
                value={className}
                onChange={e => setClassName(e.target.value)}
                disabled={loading}
                className="form-input form-select"
              >
                <option value="">-- Select Class --</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="teacher-password">Password</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="teacher-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="form-input"
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !className || !password}
            className="login-button"
          >
            {loading ? (
              <><span className="spinner"></span>Signing in...</>
            ) : (
              'Sign In as Teacher'
            )}
          </button>
        </form>

        <button onClick={() => navigate('/role')} className="back-link">
          ← Back to role selection
        </button>
      </div>
    </div>
  )
}
