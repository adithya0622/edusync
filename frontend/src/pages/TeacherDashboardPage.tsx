import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { teacherAPI } from '../api/api'
import { LogOut, Edit2, Save, X, Download, BookOpen, UserPlus, Eye, EyeOff, Trash2, BarChart3, Moon, Sun, Upload } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import '../styles/TeacherDashboardPage.css'

interface CourseData {
  marks: Record<string, number>
  total_marks: number
  performance_level: string
}

interface Student {
  roll_no: string
  masked_roll_no: string
  class: string
  courses: Record<string, CourseData>
}

interface AssessmentStat {
  avg: number
  min: number
  max: number
  count: number
}

interface CourseAnalytics {
  assessment_stats: Record<string, AssessmentStat>
  performance_distribution: Record<string, number>
  total_students: number
  class_avg_total: number
}

const PERF_COLOR: Record<string, string> = {
  Excellent: '#22c55e',
  'Very Good': '#84cc16',
  Good: '#3b82f6',
  Satisfactory: '#f59e0b',
  'Needs Improvement': '#ef4444',
}

export default function TeacherDashboardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingRoll, setEditingRoll] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const [showAddPanel, setShowAddPanel] = useState(false)
  const [newRollNo, setNewRollNo] = useState('')
  const [newMarks, setNewMarks] = useState<Record<string, number>>({})
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [showRollNos, setShowRollNos] = useState(false)
  const [deletingRoll, setDeletingRoll] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'students' | 'analytics'>('students')
  const [analytics, setAnalytics] = useState<Record<string, CourseAnalytics> | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [csvImporting, setCsvImporting] = useState(false)

  const navigate = useNavigate()
  const teacherClass = localStorage.getItem('teacherClass') || ''
  const teacherLoggedIn = localStorage.getItem('teacherLoggedIn')

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (!teacherLoggedIn) {
      navigate('/teacher/login')
      return
    }
    teacherAPI.getClassStudents(teacherClass)
      .then(res => {
        if (res.data.success) {
          const list: Student[] = res.data.students
          setStudents(list)
          if (list.length > 0) {
            setSelectedCourse(Object.keys(list[0].courses)[0])
          }
        }
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load students'))
      .finally(() => setLoading(false))
  }, [teacherClass, teacherLoggedIn, navigate])

  const handleLogout = () => {
    localStorage.removeItem('teacherLoggedIn')
    localStorage.removeItem('teacherClass')
    localStorage.removeItem('teacherToken')
    navigate('/role')
  }

  const handleShowAnalytics = () => {
    setActiveTab('analytics')
    if (!analytics) {
      setAnalyticsLoading(true)
      teacherAPI.getAnalytics(teacherClass)
        .then(res => { if (res.data.success) setAnalytics(res.data.analytics) })
        .catch(() => {})
        .finally(() => setAnalyticsLoading(false))
    }
  }

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedCourse) return
    if (!window.confirm(`Import students from ${file.name} into ${selectedCourse}? Duplicates will be skipped.`)) return
    setCsvImporting(true)
    try {
      const res = await teacherAPI.importCSV(teacherClass, selectedCourse, file)
      if (res.data.success) {
        alert(`✅ Imported ${res.data.added} students. ${res.data.skipped} duplicates skipped.`)
        // Reload students
        const reload = await teacherAPI.getClassStudents(teacherClass)
        if (reload.data.success) setStudents(reload.data.students)
      }
    } catch (err: any) {
      alert('Import failed: ' + (err.response?.data?.detail || 'Unknown error'))
    } finally {
      setCsvImporting(false)
      e.target.value = '' // reset file input
    }
  }

  const handleDelete = async (student: Student) => {
    const displayId = showRollNos ? student.roll_no : student.masked_roll_no
    if (!window.confirm(`Remove student ${displayId} from ${teacherClass}? This cannot be undone.`)) return
    setDeletingRoll(student.roll_no)
    try {
      await teacherAPI.deleteStudent(student.roll_no, teacherClass)
      setStudents(prev => prev.filter(s => s.roll_no !== student.roll_no))
    } catch (err: any) {
      alert('Failed to remove student: ' + (err.response?.data?.detail || 'Unknown error'))
    } finally {
      setDeletingRoll(null)
    }
  }

  const handleEdit = (student: Student) => {
    if (selectedCourse && student.courses[selectedCourse]) {
      setEditingRoll(student.roll_no)
      setEditValues({ ...student.courses[selectedCourse].marks })
    }
  }

  const handleCancel = () => {
    setEditingRoll(null)
    setEditValues({})
  }

  const handleSave = async (roll_no: string) => {
    setSaving(true)
    try {
      await teacherAPI.updateMarks(roll_no, selectedCourse, editValues)
      setStudents(prev =>
        prev.map(s => {
          if (s.roll_no !== roll_no) return s
          const newTotal = Object.values(editValues).reduce((a, b) => a + b, 0)
          let perf = 'Needs Improvement'
          if (newTotal >= 200) perf = 'Excellent'
          else if (newTotal >= 150) perf = 'Very Good'
          else if (newTotal >= 100) perf = 'Good'
          else if (newTotal >= 50) perf = 'Satisfactory'
          return {
            ...s,
            courses: {
              ...s.courses,
              [selectedCourse]: {
                marks: { ...editValues },
                total_marks: Math.round(newTotal * 100) / 100,
                performance_level: perf,
              },
            },
          }
        })
      )
      setEditingRoll(null)
      setEditValues({})
    } catch (err: any) {
      alert('Failed to save: ' + (err.response?.data?.detail || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (student: Student) => {
    if (!selectedCourse || !student.courses[selectedCourse]) return
    setDownloading(student.roll_no)
    const courseData = student.courses[selectedCourse]
    const perf = courseData.performance_level
    const perfColor = PERF_COLOR[perf] || '#667eea'
    const marksRows = Object.entries(courseData.marks)
      .map(([name, val]) => `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;">${name}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">${val}</td></tr>`)
      .join('')
    const reportHTML = `<div style="font-family:Arial,sans-serif;padding:36px;max-width:680px;margin:0 auto;"><div style="text-align:center;border-bottom:3px solid #667eea;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#667eea;font-size:28px;margin:0;">Drop In</h1><h2 style="font-size:18px;color:#374151;margin:4px 0;">Student Performance Report</h2><p style="color:#6b7280;font-size:13px;margin:0;">Generated ${new Date().toLocaleDateString()}</p></div><div style="background:#f8f9ff;border-radius:10px;padding:16px 20px;margin-bottom:24px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:5px 0;color:#6b7280;width:140px;">Roll No</td><td style="font-weight:600;">${student.roll_no}</td></tr><tr><td style="padding:5px 0;color:#6b7280;">Class</td><td style="font-weight:600;">${student.class}</td></tr><tr><td style="padding:5px 0;color:#6b7280;">Course</td><td style="font-weight:600;">${selectedCourse}</td></tr><tr><td style="padding:5px 0;color:#6b7280;">Total Marks</td><td style="font-weight:700;font-size:18px;color:#667eea;">${courseData.total_marks}</td></tr><tr><td style="padding:5px 0;color:#6b7280;">Performance</td><td style="font-weight:700;color:${perfColor};">${perf}</td></tr></table></div><h3 style="font-size:16px;margin-bottom:10px;">Assessment Breakdown</h3><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr style="background:#667eea;color:white;"><th style="padding:10px 12px;text-align:left;border:1px solid #667eea;">Assessment</th><th style="padding:10px 12px;text-align:center;border:1px solid #667eea;">Marks</th></tr></thead><tbody>${marksRows}</tbody></table></div>`
    const el = document.createElement('div')
    el.innerHTML = reportHTML
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    try {
      await html2pdf().set({ margin: 0.4, filename: `Report_${student.roll_no}_${selectedCourse}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(el).save()
    } finally {
      document.body.removeChild(el)
      setDownloading(null)
    }
  }

  const courses = students.length > 0 ? Object.keys(students[0].courses) : []

  const openAddPanel = () => {
    setNewRollNo('')
    setAddError('')
    // Only ask for the currently-viewed course; other courses get 0s automatically
    const cols = selectedCourse && students.length > 0 && students[0].courses[selectedCourse]
      ? Object.keys(students[0].courses[selectedCourse].marks)
      : []
    setNewMarks(Object.fromEntries(cols.map(c => [c, 0])))
    setShowAddPanel(true)
  }

  const handleAddStudent = async () => {
    setAddError('')
    if (!newRollNo.trim()) { setAddError('Please enter a roll number'); return }
    if (!/^\d+$/.test(newRollNo.trim())) { setAddError('Roll number must be numeric'); return }
    if (students.some(s => s.roll_no === newRollNo.trim())) {
      setAddError('Roll number already exists in this class')
      return
    }
    setAddSaving(true)
    try {
      // Build full payload: selected course gets real marks, others get 0s
      const fullPayload: Record<string, Record<string, number>> = {}
      courses.forEach(courseId => {
        if (courseId === selectedCourse) {
          fullPayload[courseId] = newMarks
        } else {
          const cols = students.length > 0 && students[0].courses[courseId]
            ? Object.keys(students[0].courses[courseId].marks)
            : []
          fullPayload[courseId] = Object.fromEntries(cols.map(c => [c, 0]))
        }
      })
      await teacherAPI.addStudent(newRollNo.trim(), teacherClass, fullPayload)
      const rn = newRollNo.trim()
      const newStudent: Student = {
        roll_no: rn,
        masked_roll_no: rn.substring(0, 2) + '*'.repeat(Math.max(0, rn.length - 2)),
        class: teacherClass,
        courses: {},
      }
      courses.forEach(courseId => {
        const marks = fullPayload[courseId] || {}
        const total = Object.values(marks).reduce((a, b) => a + b, 0)
        let perf = 'Needs Improvement'
        if (total >= 200) perf = 'Excellent'
        else if (total >= 150) perf = 'Very Good'
        else if (total >= 100) perf = 'Good'
        else if (total >= 50) perf = 'Satisfactory'
        newStudent.courses[courseId] = { marks, total_marks: Math.round(total * 100) / 100, performance_level: perf }
      })
      setStudents(prev => [...prev, newStudent].sort((a, b) => a.roll_no.localeCompare(b.roll_no)))
      setShowAddPanel(false)
    } catch (err: any) {
      setAddError(err.response?.data?.detail || 'Failed to add student')
    } finally {
      setAddSaving(false)
    }
  }

  const markColumns =
    students.length > 0 && selectedCourse && students[0].courses[selectedCourse]
      ? Object.keys(students[0].courses[selectedCourse].marks)
      : []

  return (
    <div className="teacher-dashboard">
      <header className="teacher-header">
        <div className="header-left">
          <div className="logo-mini"><img src="/logo.png" alt="Logo" className="logo-image-mini" /></div>
          <div className="header-title">
            <h1>Drop In Teacher Portal</h1>
            <p>Class: <strong>{teacherClass}</strong></p>
          </div>
        </div>
        <div className="header-right">
          <span className="student-count">{students.length} Students</span>
          <button onClick={() => setActiveTab('students')} className={`btn-toggle-rolls ${activeTab === 'students' ? 'active' : ''}`}>
            <BookOpen size={15} /> Students
          </button>
          <button onClick={handleShowAnalytics} className={`btn-toggle-rolls ${activeTab === 'analytics' ? 'active' : ''}`}>
            <BarChart3 size={15} /> Analytics
          </button>
          <button onClick={openAddPanel} className="btn-add-student">
            <UserPlus size={16} /> Add Student
          </button>
          <button
            onClick={() => setShowRollNos(prev => !prev)}
            className="btn-toggle-rolls"
            title={showRollNos ? 'Hide roll numbers' : 'Reveal roll numbers'}
          >
            {showRollNos ? <EyeOff size={15} /> : <Eye size={15} />}
            {showRollNos ? 'Hide IDs' : 'Show IDs'}
          </button>
          <button onClick={() => setDarkMode(d => !d)} className="btn-toggle-rolls" title="Toggle dark mode">
            {darkMode ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <main className="teacher-content">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div><p>Loading students...</p></div>
        ) : error ? (
          <div className="error-full">{error}</div>
        ) : activeTab === 'analytics' ? (
          /* ── Analytics Tab ─────────────────────────────────────────── */
          <div style={{padding:'1.5rem'}}>
            <h2 style={{marginBottom:'1.5rem',color:'var(--text-primary)',fontSize:'1.25rem',fontWeight:700}}>Class Analytics — {teacherClass}</h2>
            {analyticsLoading ? (
              <div className="loading-spinner"><div className="spinner"></div><p>Loading analytics...</p></div>
            ) : analytics ? (
              Object.entries(analytics).map(([courseId, data]) => (
                <div key={courseId} style={{marginBottom:'2rem',background:'var(--surface)',borderRadius:'12px',padding:'1.25rem',boxShadow:'var(--shadow-sm)'}}>
                  <h3 style={{marginBottom:'1rem',color:'#667eea'}}>{courseId}</h3>
                  <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginBottom:'1rem'}}>
                    <div style={{background:'#f0f9ff',borderRadius:'8px',padding:'0.75rem 1.25rem',minWidth:140}}>
                      <div style={{fontSize:'0.75rem',color:'#6b7280',marginBottom:'2px'}}>Students</div>
                      <div style={{fontSize:'1.5rem',fontWeight:700,color:'#0ea5e9'}}>{data.total_students}</div>
                    </div>
                    <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'0.75rem 1.25rem',minWidth:140}}>
                      <div style={{fontSize:'0.75rem',color:'#6b7280',marginBottom:'2px'}}>Class Avg Total</div>
                      <div style={{fontSize:'1.5rem',fontWeight:700,color:'#22c55e'}}>{data.class_avg_total}</div>
                    </div>
                  </div>
                  {/* Performance distribution */}
                  <div style={{marginBottom:'1rem'}}>
                    <div style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'0.5rem'}}>Performance Distribution</div>
                    <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                      {Object.entries(data.performance_distribution).map(([lvl, count]) => (
                        <div key={lvl} style={{display:'flex',alignItems:'center',gap:'0.3rem',background:PERF_COLOR[lvl]+'22',color:PERF_COLOR[lvl],borderRadius:'20px',padding:'0.3rem 0.8rem',fontSize:'0.8rem',fontWeight:600}}>
                          {lvl}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Assessment averages bar chart */}
                  <div style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'0.5rem'}}>Assessment Averages</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                    {Object.entries(data.assessment_stats).map(([col, stat]) => {
                      const pct = Math.min(100, stat.max > 0 ? (stat.avg / stat.max) * 100 : 50)
                      const barColor = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={col} style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                          <span style={{fontSize:'0.78rem',color:'var(--text-secondary)',width:180,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{col}</span>
                          <div style={{flex:1,height:16,background:'#f3f4f6',borderRadius:'8px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${pct}%`,background:barColor,borderRadius:'8px',transition:'width 0.5s ease'}}/>
                          </div>
                          <span style={{fontSize:'0.78rem',fontWeight:600,color:barColor,width:70,textAlign:'right',flexShrink:0}}>avg {stat.avg} / max {stat.max}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p style={{color:'var(--text-secondary)'}}>No analytics available.</p>
            )}
          </div>
        ) : (
          /* ── Students Tab ──────────────────────────────────────────── */
          <>
            {courses.length > 1 && (
              <div className="course-tabs">
                {courses.map(c => (
                  <button
                    key={c}
                    onClick={() => { setSelectedCourse(c); setEditingRoll(null) }}
                    className={`course-tab ${selectedCourse === c ? 'active' : ''}`}
                  >
                    <BookOpen size={15} /> {c}
                  </button>
                ))}
                {/* CSV Import */}
                <label style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.4rem 0.9rem',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:'8px',fontSize:'0.82rem',fontWeight:600,cursor:csvImporting?'wait':'pointer',opacity:csvImporting?0.7:1}} title="Import students from CSV">
                  <Upload size={14}/>{csvImporting ? 'Importing...' : 'Import CSV'}
                  <input type="file" accept=".csv" onChange={handleCSVImport} style={{display:'none'}} disabled={csvImporting}/>
                </label>
              </div>
            )}
            {students.length === 0 ? (
              <div className="error-full">No students found. Add one using Add Student.</div>
            ) : (
              <div className="table-wrapper">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th className="col-roll">Roll No</th>
                      {markColumns.map(col => <th key={col}>{col}</th>)}
                      <th>Total</th>
                      <th>Performance</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const courseData = selectedCourse ? student.courses[selectedCourse] : null
                      if (!courseData) return null
                      const isEditing = editingRoll === student.roll_no
                      return (
                        <tr key={student.roll_no} className={isEditing ? 'editing-row' : ''}>
                          <td className="col-roll">{showRollNos ? student.roll_no : student.masked_roll_no}</td>
                          {markColumns.map(col => (
                            <td key={col}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={editValues[col] ?? 0}
                                  onChange={e => setEditValues(prev => ({ ...prev, [col]: parseFloat(e.target.value) || 0 }))}
                                  className="mark-input"
                                />
                              ) : (courseData.marks[col] ?? 0)}
                            </td>
                          ))}
                          <td className="total-col">{courseData.total_marks}</td>
                          <td>
                            <span
                              className="perf-badge"
                              style={{
                                backgroundColor: PERF_COLOR[courseData.performance_level] + '22',
                                color: PERF_COLOR[courseData.performance_level],
                              }}
                            >
                              {courseData.performance_level}
                            </span>
                          </td>
                          <td className="actions-col">
                            {isEditing ? (
                              <div className="action-btns">
                                <button onClick={() => handleSave(student.roll_no)} disabled={saving} className="btn-save">
                                  <Save size={15} /> {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={handleCancel} className="btn-cancel"><X size={15} /></button>
                              </div>
                            ) : (
                              <div className="action-btns">
                                <button onClick={() => handleEdit(student)} className="btn-edit"><Edit2 size={15} /> Edit</button>
                                <button onClick={() => handleDownload(student)} disabled={downloading === student.roll_no} className="btn-download">
                                  <Download size={15} /> {downloading === student.roll_no ? '...' : 'Report'}
                                </button>
                                <button
                                  onClick={() => handleDelete(student)}
                                  disabled={deletingRoll === student.roll_no}
                                  className="btn-delete"
                                  title="Remove student"
                                >
                                  <Trash2 size={15} /> {deletingRoll === student.roll_no ? '...' : 'Remove'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {showAddPanel && (
        <div className="add-panel-overlay" onClick={() => setShowAddPanel(false)}>
          <div className="add-panel" onClick={e => e.stopPropagation()}>
            <div className="add-panel-header">
              <h2><UserPlus size={20} /> Add New Student</h2>
              <button onClick={() => setShowAddPanel(false)} className="close-panel-btn"><X size={20} /></button>
            </div>
            <div className="add-panel-body">
              <div className="add-form-group">
                <label>Roll Number <span className="required">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 22091"
                  value={newRollNo}
                  onChange={e => setNewRollNo(e.target.value)}
                  className="add-input"
                />
                <p className="add-hint">Class will be set to <strong>{teacherClass}</strong></p>
              </div>
              {selectedCourse && (
                <div className="add-course-section">
                  <h3>{selectedCourse}</h3>
                  <p className="add-hint" style={{ margin: '0 0 0.7rem' }}>
                    Marks for other courses will default to 0 and can be edited later.
                  </p>
                  <div className="add-marks-grid">
                    {Object.keys(newMarks).map(col => (
                      <div key={col} className="add-mark-field">
                        <label>{col}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={newMarks[col]}
                          onChange={e => setNewMarks(prev => ({
                            ...prev,
                            [col]: parseFloat(e.target.value) || 0,
                          }))}
                          className="add-input small"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {addError && <div className="add-error">{addError}</div>}
            </div>
            <div className="add-panel-footer">
              <button onClick={() => setShowAddPanel(false)} className="btn-cancel-add">Cancel</button>
              <button onClick={handleAddStudent} disabled={addSaving} className="btn-confirm-add">
                {addSaving ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
