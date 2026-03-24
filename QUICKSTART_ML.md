# Quick Start: ML-Based Recommendations

## TL;DR - Get Started in 5 Minutes

### Prerequisites
- ✓ Backend requirements installed (`pip install -r requirements.txt`)
- ✓ Courses.xlsx with Assessment-Strategy columns exists
- ✓ Students.xlsx with student data exists

### Quick Setup

**1. Terminal 1 - Train ML Models**
```bash
cd f:\edusync\Upgrade-main
python train_models.py
```

Wait for completion. You'll see:
```
[✓] Training for CSE101
[✓] Model saved
[✓] Success
```

**2. Terminal 2 - Start Backend API**
```bash
cd f:\edusync\Upgrade-main\backend
venv\Scripts\activate
python app.py
```

You'll see:
```
Uvicorn running on http://0.0.0.0:8000
```

**3. Terminal 3 - Start Frontend**
```bash
cd f:\edusync\Upgrade-main\frontend
npm run dev
```

You'll see:
```
VITE v5.4.21 ready in 351 ms
http://localhost:3001
```

**4. Open Browser**
```
http://localhost:3001
```

### Test the System

**Login:**
- Email: `22001@gmail.com`
- Press Login

**Results:**
- See student performance across courses
- View **ML-generated personalized strategies** as recommendations

## How ML is Integrated

### Architecture Diagram

```
┌─────────────────────┐
│  Courses.xlsx       │
│  (Assessments +     │
│   Strategies)       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  mlcode.py          │
│  (Generator,        │
│   Trainer,          │
│   Predictor)        │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
[joblib files] [Students.xlsx]
(Models)       (Recommendations)
    │             │
    └──────┬──────┘
           ↓
┌─────────────────────┐
│  FastAPI Backend    │
│  (generate_ml_      │
│   recommendations)  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  React Frontend     │
│  (Dashboard        │
│   Personalized     │
│   Recommendations) │
└─────────────────────┘
```

### Data Flow

```
Student Login (22001@gmail.com)
    ↓
Backend reads Students.xlsx
    ↓
Extracts marks for all courses
    ↓
For each course:
  ├─ Load trained MLkNN model
  ├─ Input: Student's assessment marks
  ├─ Output: Predicted strategies
  ├─ Map to Courses.xlsx strategy names
  └─ Return: ["Strategy 1", "Strategy 2", ...]
    ↓
Frontend displays personalized recommendations
```

## Understanding the Outputs

### What Each File Does

**Backend Files:**
- `app.py` - FastAPI server with ML integration
- Relies on: `mlcode.py`, `Courses.xlsx`, `Students.xlsx`

**ML Files Generated After Training:**
- `{course_id}_train_dataset.xlsx` - Synthetic training data (100,000 samples)
- `{course_id}_dataset_model.joblib` - Trained MLkNN model
- `{course_id}_dataset_mlb.joblib` - MultiLabelBinarizer (strategy encoder)

**Why These Files Matter:**
```
MLkNN Model: Learns patterns from 100,000 synthetic student records
    ↓
When student logs in:
  ├─ Model receives their marks
  ├─ Finds 30 similar students (k=30)
  ├─ Aggregates their success strategies
  └─ Returns top 1-5 relevant strategies
```

## Key Concepts

### 1. **Assessments & Strategies**
```
From Courses.xlsx:
  Quiz 1          → "Practice quizzes daily"
  Assignment      → "Solve problems step-by-step"  
  Midterm Exam    → "Review previous papers"
  Final Exam      → "Time management practice"

When student gets low on Quiz 1:
  ML predicts → "Practice quizzes daily" ← Added to recommendations
```

### 2. **Converting Marks**
```
Raw: Quiz (0-10)  →  Converted: (0-10)
Raw: Exam (0-100) →  Converted: (0-40)

Ensures all assessments are on same scale for ML
```

### 3. **MLkNN Algorithm**
```
k = 30 neighbors
For a student:
  1. Find 30 similar students based on marks
  2. See what strategies worked for them
  3. Recommend top strategies
  4. Weight by how similar those students are
```

## Customizing for Your Needs

### Change Training Data Size
In `mlcode.py`, line ~60:
```python
row_count = 100000  # Change this to 50000 or 200000
```

### Change Number of Neighbors
In `mlcode.py`, line ~96:
```python
mlknn = MLkNN(k=30)  # Change to k=15 for fewer recommendations
```

### Add More Strategies
Edit `Courses.xlsx`:
1. Open sheet for course (e.g., CSE101)
2. Column A: Assessments
3. Column B: Strategies
4. Add new rows
5. Retrain: `python train_models.py CSE101`

## API Reference

### Get Courses with Strategies
```bash
curl http://localhost:8000/api/courses
```
Returns: All courses with their assessments and strategies

### Get Specific Course Strategies
```bash
curl http://localhost:8000/api/courses/CSE101/strategies
```
Returns: Assessment-to-strategy mappings

### Train Models
```bash
# All courses
curl -X POST http://localhost:8000/api/train-models

# Specific course
curl -X POST http://localhost:8000/api/train-models/CSE101
```

### Check Model Status
```bash
curl http://localhost:8000/api/models/status
```
Returns: Which courses have trained models ready

### Get Student Results with Recommendations
```bash
curl http://localhost:8000/api/student/22001/results
```
Returns: Student data with **ML-generated personalized strategies**

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Model not trained" | Models not generated | Run `python train_models.py` |
| Generic recommendations | ML disabled/failed | Check logs, retrain |
| No strategies showing | Courses.xlsx missing columns | Add "Strategies" column |
| Slow login | Training in progress | Wait for training completion |

## Next Steps

1. ✓ **Run train_models.py** - Generate ML models
2. ✓ **Start backend** - API server running
3. ✓ **Start frontend** - React app running  
4. ✓ **Login and test** - See personalized strategies
5. **Customize strategies** - Edit Courses.xlsx as needed
6. **Retrain models** - When strategies change

## Performance Expectations

- **Training Time**: 10-20 seconds per course
- **Model Accuracy**: 70-85% on synthetic data
- **Recommendation Speed**: <100ms per student
- **Recommendations per Student**: 1-5 strategies
- **Fallback**: Rule-based if ML unavailable

## Support

See `ML_INTEGRATION.md` for detailed technical documentation.

---

**That's it!** Your system is now ready with ML-powered personalized recommendations. 🚀
