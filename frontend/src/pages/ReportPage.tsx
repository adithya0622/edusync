import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { studentAPI } from '../api/api'
import { ArrowLeft, Download } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import '../styles/ReportPage.css'

interface CourseResult {
  course: string
  student_name: string
  roll_no: string
  marks: Record<string, number>
  total_marks: number
  performance_level: string
  recommendations: string[]
}

export default function ReportPage() {
  const { studentId, studentName, studentClass } = useStudent()
  const navigate = useNavigate()
  const reportRef = useRef<HTMLDivElement>(null)
  
  const [results, setResults] = useState<Record<string, CourseResult> | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!studentId) {
      navigate('/role')
      return
    }

    const fetchResults = async () => {
      try {
        const response = await studentAPI.getResults(studentId, studentClass ?? undefined)
        if (response.data.data) {
          const data = response.data.data
          setResults(data)
          const firstCourse = Object.keys(data)[0]
          setSelectedCourse(firstCourse)
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch results')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [studentId, studentClass, navigate])

  if (loading) {
    return (
      <div className="report-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !results || !selectedCourse) {
    return (
      <div className="report-container">
        <div className="error-container">
          <p>{error || 'No data available'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-back-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentResult = results[selectedCourse]
  const courseList = Object.keys(results)

  // Helper function to get max marks for each assessment type
  const getMaxMarks = (assessmentName: string): number => {
    const lower = assessmentName.toLowerCase()
    
    // Quiz: 10 marks each
    if (lower.includes('quiz')) return 10
    
    // Assignment: 10 marks each
    if (lower.includes('assignment')) return 10
    
    // Mid Lab Exam: 30 marks
    if (lower.includes('mid') && lower.includes('lab')) return 30
    
    // Mid Exam: 50 marks
    if (lower.includes('mid') && lower.includes('exam') && !lower.includes('lab')) return 50
    
    // Final Exam: 100 marks
    if (lower.includes('final')) return 100
    
    return 50 // default fallback
  }

  // Prepare data for bar chart (individual assessments) - CONVERTED TO PERCENTAGE
  const barChartData = Object.entries(currentResult.marks)
    .filter(([key]) => {
      const lowerKey = key.toLowerCase()
      return (
        lowerKey.includes('quiz') ||
        lowerKey.includes('assignment') ||
        lowerKey.includes('mid') ||
        lowerKey.includes('final') ||
        lowerKey.includes('lab')
      )
    })
    .map(([name, value]) => {
      const maxMarks = getMaxMarks(name)
      const percentage = (parseFloat(value.toString()) / maxMarks) * 100
      return {
        name: name,
        percentage: parseFloat(percentage.toFixed(2)),
        marks: parseFloat(value.toString()), // Keep for reference
        maxMarks: maxMarks
      }
    })

  // Prepare data for pie chart (student total vs maximum possible)
  const totalAttainable = 220 // Total marks for the course
  const pieChartData = [
    {
      name: 'Student Marks',
      value: parseFloat(currentResult.total_marks.toString()),
      fill: '#667eea'
    },
    {
      name: 'Remaining Marks',
      value: totalAttainable - parseFloat(currentResult.total_marks.toString()),
      fill: '#e0e0e0'
    }
  ]

  const handleExport = async () => {
    if (!reportRef.current || !selectedCourse) return
    
    setExporting(true)
    try {
      const element = reportRef.current
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${studentName}_${selectedCourse}_Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          removeContainer: true,
          windowHeight: element.scrollHeight
        },
        jsPDF: { 
          orientation: 'portrait', 
          unit: 'mm', 
          format: 'a4',
          compress: true
        },
        pagebreak: {mode: ['avoid-all', 'css', 'legacy']}
      }
      html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="report-container">
      {/* Header */}
      <header className="report-header">
        <div className="header-left">
          <div className="logo-mini">
            <img src="/logo.png" alt="Drop In Logo" className="logo-image-mini" />
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
        </div>
        <h1>📊 Performance Report</h1>
        <button 
          onClick={handleExport} 
          className="btn-export"
          disabled={exporting}
          title="Download report as PDF"
        >
          <Download size={20} />
          {exporting ? 'Exporting...' : 'Export'}
        </button>
      </header>

      <main className="report-content" ref={reportRef}>
        {/* Student Info */}
        <section className="student-info-section">
          <div className="info-card">
            <h2>Student Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Name:</label>
                <span>{studentName}</span>
              </div>
              <div className="info-item">
                <label>Roll No:</label>
                <span>{studentId}</span>
              </div>
              <div className="info-item">
                <label>Course:</label>
                <span>{selectedCourse}</span>
              </div>
              <div className="info-item">
                <label>Performance Level:</label>
                <span className={`performance-badge ${currentResult.performance_level.toLowerCase()}`}>
                  {currentResult.performance_level}
                </span>
              </div>
            </div>
          </div>

          {/* Course Selector */}
          {courseList.length > 1 && (
            <div className="course-selector">
              <label>Select Course:</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {courseList.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Assessment Marks Table */}
        <section className="assessments-section">
          <div className="assessments-card">
            <h3>📋 Assessment-wise Marks</h3>
            <div className="assessments-table">
              <div className="table-header">
                <div className="table-cell col-name">Assessment</div>
                <div className="table-cell col-marks">Marks Obtained</div>
                <div className="table-cell col-max">Max Marks</div>
                <div className="table-cell col-percentage">Percentage</div>
              </div>
              {barChartData.map((item, index) => (
                <div key={index} className="table-row">
                  <div className="table-cell col-name">{item.name}</div>
                  <div className="table-cell col-marks">{item.marks.toFixed(2)}</div>
                  <div className="table-cell col-max">{item.maxMarks}</div>
                  <div className="table-cell col-percentage">{item.percentage.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="charts-section">
          {/* Bar Chart */}
          <div className="chart-container bar-chart-container">
            <h3>📈 Assessment-wise Performance</h3>
            <div className="chart-wrapper">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={barChartData}
                    margin={{ top: 15, right: 20, left: 15, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '2px solid #667eea',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="percentage" fill="#667eea" radius={[8, 8, 0, 0]} name="Score %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="no-data">No assessment data available</p>
              )}
            </div>
          </div>

          {/* Pie Chart */}
          <div className="chart-container pie-chart-container pdf-page-break">
            <h3>🎯 Overall Score Progress</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry: any) =>
                      `${entry.name}: ${((entry.value / totalAttainable) * 100).toFixed(0)}%`
                    }
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      `${parseFloat(value).toFixed(2)} marks`,
                      'Score'
                    ]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #667eea',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#667eea' }}></div>
                  <span>Your Score: {currentResult.total_marks.toFixed(2)}/{totalAttainable}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#e0e0e0' }}></div>
                  <span>Remaining: {(totalAttainable - currentResult.total_marks).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="summary-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h4>Total Score</h4>
              <p>{currentResult.total_marks.toFixed(2)}/{totalAttainable}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h4>Performance</h4>
              <p>{currentResult.performance_level}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h4>Percentage</h4>
              <p>{((currentResult.total_marks / totalAttainable) * 100).toFixed(2)}%</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
