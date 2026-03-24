# Upgrade - Full Stack Application

## Overview

**Upgrade** is a comprehensive student learning recommendation system that combines machine learning with a modern web interface to provide personalized learning recommendations based on student performance.

### Key Features

✅ **Modern Web Interface** - React TypeScript frontend with responsive design
✅ **Single API Gateway** - FastAPI-based RESTful API
✅ **ML-Powered Recommendations** - MLkNN algorithm for intelligent suggestions
✅ **Multi-Course Support** - Handle multiple courses and assessments
✅ **Real-Time Analytics** - Performance tracking and breakdown
✅ **Secure Login** - Roll number based authentication
✅ **Responsive Design** - Works on desktop, tablet, and mobile

## Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Axios, React Router, Lucide Icons |
| **Backend** | FastAPI, Uvicorn, Pandas, Scikit-learn, Joblib |
| **ML** | MLkNN Algorithm, MultiLabelBinarizer |
| **Database** | Excel (xlsx) - Students.xlsx, Courses.xlsx |
| **Deployment** | Can be deployed to Heroku, Vercel, AWS, etc. |

### System Design

```
                     ┌─────────────────────┐
                     │   React Frontend    │
                     │   (Port 5173)       │
                     └──────────┬──────────┘
                                │
                                │ REST API
                                ▼
                     ┌─────────────────────┐
                     │   FastAPI Server    │
                     │   (Port 8000)       │
                     └──────────┬──────────┘
                                │
                    ┌───────────┴────────────┐
                    ▼                        ▼
            ┌──────────────┐        ┌─────────────────┐
            │  mlcode.py   │        │  Excel Files    │
            │  (ML-KNN)    │        │  - Students     │
            └──────────────┘        │  - Courses      │
                                    └─────────────────┘
```

## Quick Start

### Backend Setup (Terminal 1)

```bash
cd backend
python -m venv venv          # Create virtual environment
venv\Scripts\activate        # Activate (Windows)
pip install -r requirements.txt
python app.py
```

**Result**: API running at `http://localhost:8000`

### Frontend Setup (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

**Result**: App running at `http://localhost:5173`

### Test Login

1. Visit `http://localhost:5173`
2. Enter email: `22001@gmail.com` (or any valid roll number)
3. Click "Sign In"
4. View your personalized dashboard

## API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/api/login` | User login with email |
| **GET** | `/api/student/{roll_no}/results` | Get student results & recommendations |
| **GET** | `/api/student/{roll_no}/profile` | Get student profile info |
| **GET** | `/api/courses` | Get available courses |
| **GET** | `/api/health` | Health check |

### Example Requests

**Login:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "22001@gmail.com"}'
```

**Get Results:**
```bash
curl http://localhost:8000/api/student/22001/results
```

## File Structure

```
Upgrade-main/
├── backend/
│   ├── app.py                 # FastAPI application
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── api/
│   │   │   └── api.ts         # API client
│   │   ├── context/
│   │   │   └── StudentContext.tsx  # Auth context
│   │   ├── styles/
│   │   │   ├── LoginPage.css
│   │   │   └── DashboardPage.css
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── index.html
│
├── main.py                    # Original Python app
├── mlcode.py                  # ML Module
├── Students.xlsx              # Student data
├── Courses.xlsx               # Course data
├── README.md
└── SETUP.md
```

## Features Explained

### 1. Login System

- **Authentication**: Uses roll number from email (rollno@gmail.com)
- **Validation**: Checks if student exists in Students.xlsx
- **Session**: Stores student info in browser localStorage

### 2. Dashboard

- **Multi-Course View**: Navigate between courses via sidebar
- **Performance Level**: Visual indicator (Excellent, Very Good, Good, etc.)
- **Marks Display**: Breakdown of all assessments
- **Recommendations**: AI-powered personalized suggestions

### 3. ML Integration

- **Algorithm**: MLkNN (Multi-Label k-Nearest Neighbors)
- **Training**: Generates models from course data
- **Fallback**: Rule-based recommendations if models unavailable
- **Personalization**: Recommendations based on student performance

### 4. Responsive Design

- **Desktop**: Full sidebar + content layout
- **Tablet**: Optimized grid layouts
- **Mobile**: Single column with collapsible navigation

## Customization Guide

### Change Port Numbers

**Backend** - Edit `backend/app.py`:
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Change port here
```

**Frontend** - Edit `frontend/vite.config.ts`:
```typescript
server: {
  port: 3001,  // Change port here
}
```

### Modify Performance Levels

Edit `backend/app.py` in `generate_recommendations()` function to change thresholds:
```python
if total_marks >= 250:
    performance_level = "Excellent"
```

### Add New Courses

1. Add sheet to `Courses.xlsx`
2. Add student data to `Courses.xlsx` sheet
3. API auto-discovers sheets on startup

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8000 already in use | Change port in backend/app.py |
| Port 5173 already in use | Change port in frontend/vite.config.ts |
| CORS errors | Ensure backend is running |
| Students not found | Check Students.xlsx format |
| Module errors | Run `pip install -r requirements.txt` |

## Development Workflow

1. **Backend changes**: Restart `python app.py`
2. **Frontend changes**: Auto-reloads with Vite
3. **Excel changes**: Restart backend to reload data
4. **ML changes**: Models auto-train if not found

## Performance Considerations

- **Backend**: Caches Excel files in memory
- **Frontend**: Uses context API for state management
- **ML Models**: Saved as joblib files for fast loading
- **API**: Handles concurrent requests with AsyncIO

## Security Notes

- ⚠️ This is a demo application
- Add authentication tokens for production
- Hash passwords if implementing user accounts
- Use HTTPS in production
- Validate all inputs
- Implement rate limiting

## Future Enhancements

- [ ] User registration system
- [ ] Real-time progress tracking
- [ ] Mobile app (React Native)
- [ ] Database instead of Excel
- [ ] Advanced analytics dashboard
- [ ] Notification system
- [ ] Export reports (PDF)
- [ ] Backup & restore functionality

## Support

For issues or questions:
1. Check SETUP.md for detailed setup
2. Review FastAPI auto-docs at `http://localhost:8000/docs`
3. Check browser console for frontend errors
4. Review backend terminal for server errors

## License

This project is open source and available under the MIT License.

---

**Happy Learning! 🚀**
