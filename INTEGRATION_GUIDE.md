# Integration Guide - Connecting Frontend, Backend & ML

## Overview

This guide explains how the different components of the Upgrade application work together and communicate.

## Data Flow

### 1. User Login Flow

```
┌─────────────────────┐
│   User clicks       │
│   "Sign In"         │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Frontend (LoginPage.tsx)            │
│  - Get email input                   │
│  - Call authAPI.login(email)         │
└──────────┬─────────────────────────┘
           │
           │ POST /api/login
           │ { "email": "22001@gmail.com" }
           ▼
┌──────────────────────────────────────┐
│  Backend (FastAPI - app.py)          │
│  1. Validate email format            │
│  2. Extract roll number (22001)      │
│  3. Call validate_student(22001)     │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Data Layer (Students.xlsx)          │
│  - Search for roll number            │
│  - Return student record             │
└──────────┬─────────────────────────┘
           │
           │ Success/Failure
           ▼
┌──────────────────────────────────────┐
│  Backend Response                    │
│  {                                   │
│    "success": true,                  │
│    "student_id": "22001",            │
│    "student_name": "John Doe",       │
│    "token": "token_22001_..."        │
│  }                                   │
└──────────┬─────────────────────────┘
           │
           │ Response
           ▼
┌──────────────────────────────────────┐
│  Frontend (Context)                  │
│  - Store in StudentContext           │
│  - Save to localStorage              │
│  - Redirect to /dashboard            │
└──────────────────────────────────────┘
```

### 2. Student Results & Recommendations Flow

```
┌─────────────────────┐
│   User views        │
│   dashboard         │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Frontend (DashboardPage.tsx)        │
│  - Get studentId from context        │
│  - Call studentAPI.getResults(id)    │
└──────────┬─────────────────────────┘
           │
           │ GET /api/student/22001/results
           ▼
┌──────────────────────────────────────┐
│  Backend (app.py)                    │
│  1. Parse roll_no parameter          │
│  2. Call get_student_results(22001)  │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Data Access (Excel Files)           │
│  1. Read Students.xlsx               │
│  2. Find student by roll number      │
│  3. Extract marks from all sheets    │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  ML Integration (mlcode.py)          │
│  1. Load trained model (joblib)      │
│  2. Load MultiLabelBinarizer         │
│  3. Prepare student data             │
│  4. Get ML predictions               │
│  5. Convert to recommendations       │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Backend Response                    │
│  {                                   │
│    "success": true,                  │
│    "data": {                         │
│      "course_1": {                   │
│        "marks": {...},               │
│        "total_marks": 184,           │
│        "performance_level": "...",   │
│        "recommendations": [...]  ◄── ML Generated
│      }                               │
│    }                                 │
│  }                                   │
└──────────┬─────────────────────────┘
           │
           │ Response
           ▼
┌──────────────────────────────────────┐
│  Frontend (DashboardPage.tsx)        │
│  - Parse response data               │
│  - Update UI with recommendations    │
│  - Display performance metrics       │
└──────────────────────────────────────┘
```

## Component Interaction

### Backend Architecture

```
FastAPI Application (Port 8000)
│
├── Authentication Layer
│   ├── /api/login
│   └── Token management
│
├── Student Data Layer
│   ├── /api/student/{roll_no}/results
│   ├── /api/student/{roll_no}/profile
│   └── Data retrieval from Excel
│
├── ML Integration Layer
│   ├── Load models
│   ├── Predict recommendations
│   └── Fallback to rule-based
│
├── Excel Data Access
│   ├── Students.xlsx
│   ├── Courses.xlsx
│   └── Caching
│
└── ML Module (mlcode.py)
    ├── generate_data()
    ├── training_data()
    ├── dataprep()
    └── student_recommendation()
```

### Frontend Architecture

```
React Application (Port 5173)
│
├── Pages
│   ├── LoginPage
│   │   ├── Form handling
│   │   └── API call to /api/login
│   │
│   └── DashboardPage
│       ├── Course selection
│       ├── Data display
│       └── API call to /api/student/{id}/results
│
├── Context (State Management)
│   └── StudentContext
│       ├── studentId
│       ├── studentName
│       ├── token
│       └── Persistence (localStorage)
│
├── API Layer
│   ├── authAPI (login)
│   ├── studentAPI (results, profile)
│   └── Axios instance with base URL
│
└── UI Components
    ├── Login Card
    ├── Performance Card
    ├── Marks Breakdown
    ├── Recommendations List
    └── Responsive Layout
```

## Data Structure Examples

### Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "student_id": "22001",
  "student_name": "John Doe",
  "token": "token_22001_22001@gmail.com"
}
```

### Results Response

```json
{
  "success": true,
  "data": {
    "CSE101": {
      "course": "CSE101",
      "student_name": "John Doe",
      "roll_no": "22001",
      "marks": {
        "Assignment 1": 8.5,
        "Quiz 1": 9.0,
        "Mid Exam": 35.0,
        "Final Exam": 85.0
      },
      "total_marks": 137.5,
      "performance_level": "Very Good",
      "recommendations": [
        "Focus on advanced problem sets",
        "Review fundamentals periodically",
        "Consider peer mentoring"
      ]
    }
  }
}
```

## File Connections

### Backend Files

```
backend/
├── app.py
│   ├── Imports: pandas, numpy, joblib, sklearn
│   ├── Calls: validate_student(), get_student_results()
│   ├── Uses: Students.xlsx, Courses.xlsx
│   ├── Loads: trained ML models (joblib)
│   └── Endpoints: All REST API endpoints
│
└── requirements.txt
    ├── fastapi
    ├── uvicorn
    ├── pandas
    ├── scikit-learn
    ├── scikit-multilearn
    └── joblib
```

### Frontend Files

```
frontend/src/
├── App.tsx
│   └── Routes setup
│
├── pages/
│   ├── LoginPage.tsx
│   │   └── Calls api/api.ts → authAPI.login()
│   │
│   └── DashboardPage.tsx
│       └── Calls api/api.ts → studentAPI.getResults()
│
├── context/
│   └── StudentContext.tsx
│       └── Manages: studentId, studentName, token
│
└── api/
    └── api.ts
        ├── authAPI.login(email)
        ├── studentAPI.getResults(rollNo)
        └── Axios instance pointing to localhost:8000
```

### Data Files

```
Root/
├── Students.xlsx
│   ├── Multiple sheets (one per course)
│   ├── Columns: Roll No, Student Name, Marks...
│   └── Used by: Backend validate_student()
│
└── Courses.xlsx
    ├── Multiple sheets (one per course)
    ├── Columns: Assessments, Max Marks, Strategies...
    └── Used by: ML model training & prediction
```

## ML Model Integration

### Model Training Flow

```
1. Backend receives request for course
   ↓
2. Check if model exists (course_id_dataset_model.joblib)
   ↓
   If NOT exists → Train model:
   ├─ generate_data(course_id)
   ├─ training_data(course_id)
   └─ Save models
   ↓
3. Model ready for predictions
```

### Recommendation Generation

```
Student Data → Preprocessed Features → ML Model → Prediction Labels → Recommendations
   ↓              ↓                        ↓           ↓                   ↓
 Marks      Converted Marks        MLkNN Prediction  Multi-label      Final List
            (via dataprep)         (probability)     Binarizer       (user-friendly)
```

## Error Handling

### Login Errors

```
Invalid Email Format
  ↓
Backend returns 400 with message: "Invalid email format"
  ↓
Frontend displays error message in UI

Student Not Found
  ↓
Backend returns 401 with message: "Student not found"
  ↓
Frontend displays "Invalid credentials" message
```

### Results Errors

```
Roll No Not Found
  ↓
Backend returns 404 with message: "Student not found"
  ↓
Frontend catches and displays error

Excel File Missing
  ↓
Backend returns 500 with message: "Error reading file"
  ↓
Frontend displays "Server error" message
```

## Environment Variables

### Backend
```
BACKEND_PORT=8000
STUDENTS_FILE=../Students.xlsx
COURSES_FILE=../Courses.xlsx
```

### Frontend
```
REACT_APP_API_URL=http://localhost:8000
```

## Debugging Tips

### Backend Debugging

```python
# Enable verbose logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Add print statements in API endpoints
print(f"Login attempt for email: {email}")

# Check Excel data
df = pd.read_excel('Students.xlsx')
print(df.head())
```

### Frontend Debugging

```typescript
// Console logs in LoginPage
console.log('Login response:', response.data)

// Check localStorage
console.log(localStorage.getItem('studentId'))

// Check API calls in Network tab (F12)
```

## Connection Verification

### Test Backend is Running

```bash
curl http://localhost:8000/api/health
# Should return: {"status": "healthy", "service": "Upgrade API"}
```

### Test API Documentation

Visit: http://localhost:8000/docs

### Test Frontend Loading

Visit: http://localhost:5173

### Test Login

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "22001@gmail.com"}'
```

## Performance Considerations

### Caching Strategy
- Excel files cached in memory after first read
- ML models loaded once and reused
- Student context cached in browser locally

### Optimization
- Use indexes in Excel for faster searches
- Lazy load recommendations
- Debounce API calls

### Monitoring
- Check backend logs for errors
- Monitor response times
- Track API usage

## Troubleshooting Connections

| Problem | Cause | Solution |
|---------|-------|----------|
| CORS Error | Frontend/Backend ports mismatch | Check API_URL in frontend config |
| 404 Not Found | Student not in Excel | Verify Students.xlsx format |
| 500 Server Error | Backend crashed | Check backend logs |
| Blank Dashboard | API call failed | Check Network tab in DevTools |
| Models not loading | joblib files missing | Train models via POST /api/train-models |

## Next Steps

1. ✅ Start both servers
2. ✅ Test login functionality
3. ✅ Verify CSV data loads
4. ✅ Train ML models
5. ✅ Check recommendations generation
6. ✅ Deploy to production

---

**For more help, refer to SETUP.md**
