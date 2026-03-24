# Upgrade - Full Stack Application

A complete full-stack learning recommendation system built with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + Python ML-KNN
- **Database**: Excel (Students.xlsx, Courses.xlsx)

## Architecture

```
Client-Server Architecture
├── Frontend (React TypeScript)
│   ├── Login Page
│   └── Dashboard (Results & Recommendations)
├── FastAPI Server (Single API)
│   ├── Authentication Endpoints
│   ├── Student Results Endpoints
│   └── ML Model Integration
└── Python ML Module (mlcode.py)
    ├── ML-KNN Training
    ├── Data Preprocessing
    └── Recommendation Generation
```

## Setup Instructions

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start FastAPI server:
```bash
python app.py
```

Server will run at: `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will run at: `http://localhost:3000`

## API Endpoints

### Authentication
- **POST** `/api/login` - Login with email (rollno@gmail.com)

### Student Data
- **GET** `/api/student/{roll_no}/results` - Get student results for all courses
- **GET** `/api/student/{roll_no}/profile` - Get student profile
- **GET** `/api/courses` - Get all available courses

### System
- **GET** `/api/health` - Health check
- **POST** `/api/train-models` - Train ML models (optional admin endpoint)

## Features

✅ Roll number based login (email format: rollno@gmail.com)
✅ ML-KNN based personalized recommendations
✅ Multi-course support
✅ Marks breakdown visualization
✅ Performance level assessment
✅ Responsive modern UI
✅ FastAPI single API architecture

## File Structure

```
Upgrade-main/
├── backend/
│   ├── app.py (FastAPI application)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/ (Login, Dashboard)
│   │   ├── api/ (API integration)
│   │   ├── context/ (Auth context)
│   │   ├── styles/ (CSS files)
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── main.py (existing)
├── mlcode.py (existing ML module)
├── Students.xlsx
└── Courses.xlsx
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Axios, React Router, Lucide React
- **Backend**: FastAPI, Uvicorn, Pandas, Scikit-learn, Joblib
- **ML**: MLkNN, MultiLabelBinarizer
- **Database**: Excel (xlsx)

## Notes

- All API calls go through FastAPI (single API gateway)
- Existing Python ML modules are integrated seamlessly
- Login credentials must match Students.xlsx entries
- Recommendations are generated using trained ML-KNN models
- If ML models don't exist, fallback to rule-based recommendations
