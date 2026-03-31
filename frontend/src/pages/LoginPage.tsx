import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, studentAPI } from '../api/api'
import { useStudent } from '../context/StudentContext'
import { Mail, Users, AlertCircle, Lock } from 'lucide-react'
import '../styles/LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [className, setClassName] = useState('')
  const [password, setPassword] = useState('')
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setStudent } = useStudent()

  useEffect(() => {
    studentAPI.getClasses()
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
      if (!email.includes('@')) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }
      if (!className) {
        setError('Please select your class')
        setLoading(false)
        return
      }

      const response = await authAPI.login(email, className, password)
      
      if (response.data.success) {
        setStudent(
          response.data.student_id,
          response.data.student_name || `Student ${response.data.student_id}`,
          response.data.token,
          response.data.student_class || className
        )
        navigate('/dashboard')
      } else {
        setError(response.data.message || 'Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to login. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <img src="/logo.png" alt="Drop In Logo" className="logo-image" />
          </div>
          <h1>Drop In</h1>
          <p className="subtitle">Student Learning Recommendation System</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={20} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="e.g., 22001@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="form-input"
              />
            </div>
            <p className="input-hint">Use your rollno@gmail.com format</p>
          </div>

          <div className="form-group">
            <label htmlFor="class-select">Your Class</label>
            <div className="input-wrapper">
              <Users size={20} className="input-icon" />
              <select
                id="class-select"
                value={className}
                onChange={e => setClassName(e.target.value)}
                disabled={loading}
                className="form-input form-select"
              >
                <option value="">-- Select your class --</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <button onClick={() => navigate('/role')} className="back-to-role">
          ← Back to role selection
        </button>
      </div>
    </div>
  )
}
