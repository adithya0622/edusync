# AI Recommendations System Guide

## Overview
The Upgrade system now includes an advanced AI-powered recommendation engine that uses machine learning models to provide personalized learning recommendations for both individual students and entire classes.

## Features

### 1. **Student Recommendations** 👤
- Get personalized learning strategies for individual students
- Based on their assessment scores and performance
- Shows breakdown of marks for each assessment
- Provides actionable recommendations for improvement

### 2. **Class Recommendations** 👥
- Analyze class-wide performance patterns
- Get recommendations based on class averages
- Identify systemic teaching strategies
- Improve overall class performance

## How to Use

### Accessing the Recommendation System

1. **From Dashboard**: Click the "AI Recommendations" button in the top-right corner
2. **Direct URL**: Navigate to `http://localhost:3000/recommendations` (if running on default port)

### Getting Student Recommendations

1. Select "Student Recommendations" tab
2. Enter the following:
   - **Student ID**: The student's unique identifier (e.g., 22001)
   - **Class ID**: The class the student belongs to (e.g., "CSE A")
   - **Course ID**: The course code (e.g., "19CSE301")
3. Click "Get Recommendations"
4. View the results including:
   - Individual assessment marks
   - Total score
   - AI-powered recommendations

### Getting Class Recommendations

1. Select "Class Recommendations" tab
2. Enter the following:
   - **Class ID**: The class to analyze (e.g., "CSE A")
   - **Course ID**: The course code (e.g., "19CSE301")
3. Click "Get Recommendations"
4. View the results including:
   - Average marks per assessment
   - Class-level AI recommendations

## Backend API Endpoints

### Student Recommendation Endpoint
```
POST /api/recommendations/student
```

**Request Header:**
```
x-api-key: upgrade-ai-key-2026
Content-Type: application/json
```

**Request Body:**
```json
{
  "student_id": 22001,
  "class_id": "CSE A",
  "course_id": "19CSE301"
}
```

**Response:**
```json
{
  "success": true,
  "student_id": 22001,
  "class_id": "CSE A",
  "course_id": "19CSE301",
  "marks": {
    "Assessment1": 45.5,
    "Assessment2": 38.0,
    "Assessment3": 42.3
  },
  "total_marks": 125.8,
  "recommendations": "Focus on fundamentals..."
}
```

### Class Recommendation Endpoint
```
POST /api/recommendations/class
```

**Request Header:**
```
x-api-key: upgrade-ai-key-2026
Content-Type: application/json
```

**Request Body:**
```json
{
  "class_id": "CSE A",
  "course_id": "19CSE301"
}
```

**Response:**
```json
{
  "success": true,
  "class_id": "CSE A",
  "course_id": "19CSE301",
  "average_marks": {
    "Assessment1": 42.1,
    "Assessment2": 35.7,
    "Assessment3": 40.2
  },
  "recommendations": "Focus on fundamentals..."
}
```

## API Key Authentication

All recommendation endpoints require an API key passed via the `x-api-key` header.

### Default API Key
```
upgrade-ai-key-2026
```

### Changing the API Key

**Backend (Python):**
Edit `backend/app.py` and modify the `VALID_API_KEYS` list or set the environment variable:
```python
VALID_API_KEYS = [
    "upgrade-ai-key-2026",
    os.getenv("API_KEY", "upgrade-ai-key-2026")
]
```

**Frontend (.env):**
Edit `frontend/.env.local`:
```
VITE_API_KEY=your-new-api-key-here
```

## Requirements

### Data Files
The system requires the following Excel files in the project root:
- **Students.xlsx**: Contains student data with sheets for each course (19CSE301, 19CSE302, etc.)
  - Required columns: `Student Id`, `Class`, Assessment columns, `Total`, `Recommendation`
- **Courses.xlsx**: Contains course configurations with assessment and strategy mappings
  - Required columns: `Assessments`, `Strategies`, `Converted Marks`, etc.

### ML Models
The system requires trained ML models. These are generated automatically when you:
1. Train models via `/api/train-models` endpoint
2. Run `mlcode.py` training functions

Models are saved as:
- `{course_id}_dataset_model.joblib`
- `{course_id}_dataset_mlb.joblib`

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "API key missing" | No `x-api-key` header provided | Add header: `x-api-key: upgrade-ai-key-2026` |
| "Invalid API key" | Wrong API key | Use the correct API key |
| "Student not found" | Student ID doesn't exist in class | Verify student ID and class ID |
| "No students found in class" | Class doesn't have students | Check class ID spelling |
| "ML models not trained" | Models not generated yet | Run `/api/train-models` endpoint |

## Integration with mlcode.py

The recommendation system integrates with your existing ML code:
- Uses trained models from `mlcode.py`
- Leverages assessment and strategy mappings
- Applies the same ML preprocessing and prediction logic

### Key Functions Used
- `mlcode.generate_data()`: Generate synthetic training data
- `mlcode.training_data()`: Train ML models
- `mlcode.dataprep()`: Preprocess student marks
- ML model predictions: Sklearn's OneVsRestClassifier with RandomForest

## Environment Variables

### Backend (.env or .env.local)
```
API_KEY=upgrade-ai-key-2026          # Optional: Set custom API key
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000   # Backend API URL
VITE_API_KEY=upgrade-ai-key-2026     # Recommendation API key
```

## Troubleshooting

### Recommendations Not Loading
1. **Check API Key**: Ensure correct `x-api-key` header
2. **Check Models**: Verify `/api/models/status` to see if models are trained
3. **Check Files**: Ensure Students.xlsx and Courses.xlsx exist
4. **Check Logs**: Review backend console for error messages

### Models Showing as "Not Trained"
1. Navigate to `/api/train-models` in browser or call it via Postman
2. Wait for training to complete (see console logs)
3. Verify model files exist in project root

## Example Usage (cURL)

### Get Student Recommendation
```bash
curl -X POST http://localhost:8000/api/recommendations/student \
  -H "x-api-key: upgrade-ai-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 22001,
    "class_id": "CSE A",
    "course_id": "19CSE301"
  }'
```

### Get Class Recommendation
```bash
curl -X POST http://localhost:8000/api/recommendations/class \
  -H "x-api-key: upgrade-ai-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CSE A",
    "course_id": "19CSE301"
  }'
```

## Performance Optimization

For best performance:
- Cache recommendations when possible
- Batch requests if getting recommendations for many students
- Ensure Students.xlsx and Courses.xlsx are not too large
- Consider adding database backend for production

## Future Enhancements

- [ ] Add recommendation history/tracking
- [ ] Implement real-time recommendation updates
- [ ] Add more ML algorithms for better predictions
- [ ] Create admin dashboard for recommendation analytics
- [ ] Export recommendations as PDF/Excel reports
