-- Supabase SQL Schema for EduSync / DropIn
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS courses (
  course_code TEXT PRIMARY KEY,
  department TEXT NOT NULL,
  has_converted_marks BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  course_code TEXT NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_marks NUMERIC NOT NULL,
  converted_marks NUMERIC,
  curriculum TEXT,
  strategies TEXT,
  UNIQUE(course_code, name)
);

CREATE TABLE IF NOT EXISTS student_results (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT DEFAULT '',
  class TEXT NOT NULL,
  course_code TEXT NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
  marks JSONB NOT NULL DEFAULT '{}',
  assessments_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_code)
);

CREATE INDEX IF NOT EXISTS idx_student_results_student_id ON student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_student_results_course_code ON student_results(course_code);
CREATE INDEX IF NOT EXISTS idx_student_results_class ON student_results(class);
CREATE INDEX IF NOT EXISTS idx_assessments_course_code ON assessments(course_code);
