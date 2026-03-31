import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecommendationsPage from './pages/RecommendationsPage'
import ReportPage from './pages/ReportPage'
import CounselorPage from './pages/CounselorPage'
import RolePage from './pages/RolePage'
import TeacherLoginPage from './pages/TeacherLoginPage'
import TeacherDashboardPage from './pages/TeacherDashboardPage'
import IntroSplash from './components/IntroSplash'
import './App.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <IntroSplash onDone={() => setShowSplash(false)} />
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/role" replace />} />
        <Route path="/role" element={<RolePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/counselor" element={<CounselorPage />} />
        <Route path="/teacher/login" element={<TeacherLoginPage />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
      </Routes>
    </Router>
  )
}

export default App
