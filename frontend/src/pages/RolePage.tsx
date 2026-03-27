import { useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen } from 'lucide-react'
import '../styles/RolePage.css'

export default function RolePage() {
  const navigate = useNavigate()

  return (
    <div className="role-container">
      <div className="role-header">
        <div className="role-logo">
          <img src="/logo.png" alt="Drop In Logo" />
        </div>
        <h1>Drop In</h1>
        <p>Student Learning Recommendation System</p>
      </div>

      <div className="role-cards">
        <div className="role-card student-card" onClick={() => navigate('/login')}>
          <GraduationCap size={64} />
          <h2>Student</h2>
          <p>Access your results, recommendations, and reports</p>
        </div>

        <div className="role-card teacher-card" onClick={() => navigate('/teacher/login')}>
          <BookOpen size={64} />
          <h2>Teacher</h2>
          <p>Manage class results and student performance</p>
        </div>
      </div>
    </div>
  )
}
