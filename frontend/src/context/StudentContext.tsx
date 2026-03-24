import React, { createContext, useContext, useState } from 'react'

interface StudentContextType {
  studentId: string | null
  studentName: string | null
  token: string | null
  setStudent: (id: string, name: string, token: string) => void
  logout: () => void
}

const StudentContext = createContext<StudentContextType | undefined>(undefined)

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const setStudent = (id: string, name: string, tkn: string) => {
    setStudentId(id)
    setStudentName(name)
    setToken(tkn)
    localStorage.setItem('studentId', id)
    localStorage.setItem('studentName', name)
    localStorage.setItem('token', tkn)
  }

  const logout = () => {
    setStudentId(null)
    setStudentName(null)
    setToken(null)
    localStorage.removeItem('studentId')
    localStorage.removeItem('studentName')
    localStorage.removeItem('token')
  }

  return (
    <StudentContext.Provider value={{ studentId, studentName, token, setStudent, logout }}>
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  const context = useContext(StudentContext)
  if (!context) {
    throw new Error('useStudent must be used within StudentProvider')
  }
  return context
}
