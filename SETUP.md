# Setup Instructions

## Quick Start Guide

This is a full-stack application with React frontend and FastAPI backend. Follow these steps to get started.

## Prerequisites

- **Python 3.8+**
- **Node.js 16+** (for frontend)
- **npm or yarn** (for package management)

## Backend Setup

### Step 1: Navigate to backend folder

```bash
cd backend
```

### Step 2: Create virtual environment (optional but recommended)

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the FastAPI server

```bash
python app.py
```

You should see output like:
```
INFO:     Started server process [1234]
INFO:     Uvicorn running on http://0.0.0.0:8000
```

The API will be available at: **http://localhost:8000**
API Documentation: **http://localhost:8000/docs**

## Frontend Setup

### Step 1: Navigate to frontend folder (in a NEW terminal)

```bash
cd frontend
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Start development server

```bash
npm run dev
```

You should see output like:
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
```

The frontend will be available at: **http://localhost:5173/**

## Testing the Application

### Test Login

1. Open **http://localhost:5173/** in your browser
2. Use an email in the format: `rollno@gmail.com`
   - Example: `22001@gmail.com`
   - The roll number must exist in your `Students.xlsx` file
3. Click "Sign In"
4. You should be redirected to the dashboard

### Test Dashboard

1. Once logged in, you'll see your courses in the sidebar
2. Click on a course to view:
   - Performance level
   - Total marks
   - Marks breakdown by assessment
   - AI-powered recommendations

## API Endpoints

All endpoints are accessed through FastAPI:

### Authentication
```
POST /api/login
Body: { "email": "22001@gmail.com" }
Response: { "success": true, "student_id": "22001", "student_name": "...", "token": "..." }
```

### Student Results
```
GET /api/student/{roll_no}/results
Response: { "success": true, "data": { "course_1": {...}, "course_2": {...} } }
```

### Student Profile
```
GET /api/student/{roll_no}/profile
Response: { "success": true, "profile": {...} }
```

### Available Courses
```
GET /api/courses
Response: { "success": true, "courses": [{...}, {...}] }
```

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Change port in app.py
python -m uvicorn main:app --reload --port 8001
```

**Module not found errors:**
```bash
# Make sure you're in the backend folder and have activated venv
pip install -r requirements.txt
```

**Students.xlsx not found:**
- Make sure `Students.xlsx` is in the root project folder
- Update file paths in `backend/app.py` if needed

### Frontend Issues

**Port 3000/5173 already in use:**
- Edit `frontend/vite.config.ts` and change port
- Or kill the process using that port

**CORS errors:**
- Make sure FastAPI is running and CORS is enabled
- Check that API_URL in `frontend/src/api/api.ts` is correct

**Module not found:**
```bash
# In frontend folder
npm install
```

## File Locations

- **Students Data**: `Students.xlsx` (in root)
- **Courses Data**: `Courses.xlsx` (in root)
- **Backend API**: `http://localhost:8000`
- **Frontend App**: `http://localhost:5173`
- **ML Models**: Generated in root folder (e.g., `course_id_dataset_model.joblib`)

## Architecture Overview

```
┌─────────────────────────────────────────┐
│      React Frontend (Port 5173)         │
│  ├─ Login Page                          │
│  └─ Dashboard Page                      │
└────────────┬────────────────────────────┘
             │ HTTP Requests (Axios)
             ▼
┌─────────────────────────────────────────┐
│    FastAPI Backend (Port 8000)          │
│  ├─ Authentication                      │
│  ├─ Student Data Retrieval              │
│  └─ ML Model Integration                │
└────────────┬────────────────────────────┘
             │ Python
             ▼
┌─────────────────────────────────────────┐
│   ML Models & Data Processing           │
│  ├─ mlcode.py (ML-KNN)                  │
│  ├─ Students.xlsx                       │
│  └─ Courses.xlsx                        │
└─────────────────────────────────────────┘
```

## Production Deployment

### Backend (Heroku/Cloud)

1. Create `Procfile`:
```
web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

2. Install gunicorn:
```bash
pip install gunicorn
```

3. Deploy to Heroku:
```bash
git push heroku main
```

### Frontend (Vercel/Netlify)

1. Build for production:
```bash
npm run build
```

2. Deploy `dist/` folder to your hosting service

## Need Help?

- Check the README.md in project root
- Review FastAPI docs at `http://localhost:8000/docs`
- Check browser console for frontend errors (F12)
- Check terminal output for backend errors
