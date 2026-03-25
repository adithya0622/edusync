import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/api'
import { useStudent } from '../context/StudentContext'
import { Mail, AlertCircle } from 'lucide-react'
import '../styles/LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setStudent } = useStudent()

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

      const response = await authAPI.login(email)
      
      if (response.data.success) {
        setStudent(
          response.data.student_id,
          response.data.student_name,
          response.data.token
        )
        navigate('/dashboard')
      } else {
        setError(response.data.message || 'Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your email.')
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

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
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
      </div>
    </div>
  )
}
