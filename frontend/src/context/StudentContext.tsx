import React, { createContext, useContext, useState } from 'react'

interface StudentContextType {
  studentId: string | null
  studentName: string | null
  studentClass: string | null
  token: string | null
  setStudent: (id: string, name: string, token: string, studentClass: string) => void
  logout: () => void
}

const StudentContext = createContext<StudentContextType | undefined>(undefined)

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [studentId, setStudentId] = useState<string | null>(localStorage.getItem('studentId'))
  const [studentName, setStudentName] = useState<string | null>(localStorage.getItem('studentName'))
  const [studentClass, setStudentClass] = useState<string | null>(localStorage.getItem('studentClass'))
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  const setStudent = (id: string, name: string, tkn: string, cls: string) => {
    setStudentId(id)
    setStudentName(name)
    setToken(tkn)
    setStudentClass(cls)
    localStorage.setItem('studentId', id)
    localStorage.setItem('studentName', name)
    localStorage.setItem('token', tkn)
    localStorage.setItem('studentClass', cls)
  }

  const logout = () => {
    setStudentId(null)
    setStudentName(null)
    setToken(null)
    setStudentClass(null)
    localStorage.removeItem('studentId')
    localStorage.removeItem('studentName')
    localStorage.removeItem('token')
    localStorage.removeItem('studentClass')
  }

  return (
    <StudentContext.Provider value={{ studentId, studentName, studentClass, token, setStudent, logout }}>
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
