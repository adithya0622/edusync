# Quick Start: AI Recommendations System

## Setup Steps

### 1. Backend Setup

#### Install dependencies (if not already done)
```bash
cd backend
pip install -r requirements.txt
```

#### Update add python-dotenv if missing
```bash
pip install python-dotenv
```

#### Run the backend server
```bash
cd backend
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The backend should now be running at `http://localhost:8000`

### 2. Frontend Setup

#### Install dependencies (if not already done)
```bash
cd frontend
npm install
```

#### Start the development server
```bash
npm run dev
```

The frontend should now be running at `http://localhost:5173` (or check console for actual port)

### 3. Train ML Models (First Time Only)

#### Option A: Using the Frontend
1. Open the frontend in browser
2. Login with a student email
3. Click "AI Recommendations" button
4. The system will prompt if models need training

#### Option B: Using cURL
```bash
curl -X POST http://localhost:8000/api/train-models \
  -H "x-api-key: upgrade-ai-key-2026" \
  -H "Content-Type: application/json"
```

#### Option C: Direct Python (if running locally)
```python
import mlcode

# For a specific course
mlcode.generate_data("19CSE301")
mlcode.training_data("19CSE301")
mlcode.dataprep("19CSE301")
```

Wait for the process to complete. You should see output like:
```
Generated training data for 19CSE301
✓ Trained model for 19CSE301
✓ Preprocessed data for 19CSE301
```

### 4. Test the System

#### Test Student Recommendations
1. Login to frontend with email: `22001@example.com`
2. Click "AI Recommendations" button
3. Select "Student Recommendations"
4. Enter:
   - Student ID: `22001`
   - Class ID: `CSE A`
   - Course ID: `19CSE301`
5. Click "Get Recommendations"
6. You should see student marks and AI recommendations

#### Test Class Recommendations
1. From recommendations page, select "Class Recommendations"
2. Enter:
   - Class ID: `CSE A`
   - Course ID: `19CSE301`
3. Click "Get Recommendations"
4. You should see class average marks and recommendations

## Testing with Different Data

### Using Postman or cURL

#### Get Student Recommendations
```bash
curl -X POST http://localhost:8000/api/recommendations/student \
  -H "x-api-key: upgrade-ai-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 22002,
    "class_id": "CSE A",
    "course_id": "19CSE301"
  }' | json_pp
```

#### Get Class Recommendations
```bash
curl -X POST http://localhost:8000/api/recommendations/class \
  -H "x-api-key: upgrade-ai-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": "CSE A",
    "course_id": "19CSE301"
  }' | json_pp
```

#### Check Model Status
```bash
curl http://localhost:8000/api/models/status \
  -H "x-api-key: upgrade-ai-key-2026" | json_pp
```

## File Structure

```
Upgrade-main/
├── backend/
│   ├── app.py                    # Updated with recommendation endpoints
│   ├── requirements.txt
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RecommendationsPage.tsx  # NEW: Recommendations UI
│   │   │   ├── DashboardPage.tsx        # Updated: Added nav button
│   │   │   └── ...
│   │   ├── styles/
│   │   │   ├── RecommendationsPage.css  # NEW: Styles for recommendations
│   │   │   └── ...
│   │   ├── api/
│   │   │   └── api.ts                   # Updated: Added recommendation APIs
│   │   └── ...
│   ├── .env.local                       # NEW: Environment variables
│   └── ...
├── AI_RECOMMENDATIONS_GUIDE.md          # NEW: Full documentation
├── QUICK_START_RECOMMENDATIONS.md       # NEW: This file
├── 19CSE301_dataset_model.joblib        # ML model (generated)
├── 19CSE301_dataset_mlb.joblib          # ML transformer (generated)
└── ...
```

## Key API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/recommendations/student` | POST | Get student recommendations | x-api-key |
| `/api/recommendations/class` | POST | Get class recommendations | x-api-key |
| `/api/train-models` | POST | Train all ML models | x-api-key |
| `/api/models/status` | GET | Check model training status | x-api-key |

## Default Credentials

### API Key
- Key: `upgrade-ai-key-2026`
- Header: `x-api-key`

### Sample Student IDs
- `22001` - Available in Students.xlsx (CSE A)
- `22002` - Available in Students.xlsx (CSE A)
- etc.

### Sample Course IDs
- `19CSE301`
- `19CSE302`

## Troubleshooting

### "API key missing" Error
**Cause**: Frontend not sending API key  
**Fix**: Check `frontend/.env.local` has `VITE_API_KEY=upgrade-ai-key-2026`

### "Student not found" Error
**Cause**: Wrong student ID or course ID  
**Fix**: 
1. Check Students.xlsx has the student in that course/class
2. Verify spelling of class_id (case-sensitive)

### "Models not trained" Error
**Cause**: ML models haven't been trained yet  
**Fix**: Call `POST /api/train-models` endpoint

### CORS Error
**Cause**: Frontend and backend on different origins  
**Fix**: Ensure backend CORS settings allow frontend URL

### Port Already in Use
**Backend**: Change port in backend command:
```bash
python -m uvicorn app:app --port 8001
```
Then update `VITE_API_URL` in frontend `.env.local`

**Frontend**: Vite will auto-select new port

## What's New

### Backend Changes (app.py)
- Added `StudentRecommendationRequest` and `ClassRecommendationRequest` models
- Added `StudentRecommendationResponse` and `ClassRecommendationResponse` models
- Added `verify_api_key()` function for API key authentication
- Added `POST /api/recommendations/student` endpoint
- Added `POST /api/recommendations/class` endpoint
- Integrated with existing `mlcode.py` functions

### Frontend Changes
- Created `RecommendationsPage.tsx` - New page for recommendations
- Created `RecommendationsPage.css` - Styling for new page
- Updated `api.ts` - Added `recommendationAPI` object with API functions
- Updated `App.tsx` - Added route for `/recommendations`
- Updated `DashboardPage.tsx` - Added "AI Recommendations" button
- Updated `DashboardPage.css` - Styles for new button
- Created `.env.local` - Environment variables for API key

### Configuration
- API keys stored in backend and frontend configs
- Easy to customize API keys via environment variables
- CORS enabled for frontend-backend communication

## Next Steps

1. ✅ Set up and run both backend and frontend
2. ✅ Train ML models (first time only)
3. ✅ Test student recommendations
4. ✅ Test class recommendations
5. 📊 Integrate with your actual student data
6. 🔐 Change default API key for production
7. 📱 Deploy to production environment

## Support

For issues or questions:
1. Check `AI_RECOMMENDATIONS_GUIDE.md` for detailed documentation
2. Review `AI_RECOMMENDATIONS_QUICK_REFERENCE.txt` for quick commands
3. Check backend console logs for error details
4. Verify data files (Students.xlsx, Courses.xlsx) exist and are valid

---

**Happy Learning! 🎓**
