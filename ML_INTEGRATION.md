# ML-Based Personalized Recommendations Integration

## Overview

The Upgrade system integrates MLkNN (Multi-Label k-Nearest Neighbors) machine learning algorithm with strategy-based recommendations from the Courses.xlsx file. This creates a personalized learning experience for each student.

## How It Works

### 1. **Data Structure**

#### Courses.xlsx
Each sheet in Courses.xlsx represents a course and contains:

| Column | Purpose | Example |
|--------|---------|---------|
| Assessments | Assessment names (features) | Quiz 1, Assignment 1, Midterm |
| Strategies | Learning strategies for each assessment | Practice past papers, Study group |
| Total Marks | Original assessment marks | 10, 5, 50 |
| Converted Marks | Normalized marks | 10, 5, 50 |

**Assessment-Strategy Mapping Example:**
```
Assessments: [Quiz 1, Assignment 1, Midterm, Final Exam]
Strategies:  [Practice quizzes daily, Solve problems step-by-step, 
              Review previous papers, Time management practice]
```

#### Students.xlsx
Contains student data with:
- Student ID / Roll No
- Student Name
- Class
- Assessment marks (one column per assessment)
- Assessment Converted marks (normalized)
- Total marks
- Recommendation (populated by ML model)

### 2. **ML Model Training Pipeline**

```
[1] Generate Training Data (mlcode.generate_data)
    ├─ Read assessments and strategies from Courses.xlsx
    ├─ Generate 100,000 synthetic student records
    ├─ Create performance-based recommendations
    └─ Save as {course_id}_train_dataset.xlsx

[2] Train ML Model (mlcode.training_data)
    ├─ Read training dataset
    ├─ Split into 80% training, 20% testing
    ├─ Use MultiLabelBinarizer to convert strategies to labels
    ├─ Train MLkNN with k=30 neighbors
    ├─ Calculate accuracy
    └─ Save model and MultiLabelBinarizer as .joblib files

[3] Preprocess Student Data (mlcode.dataprep)
    ├─ Convert marks using conversion factors
    ├─ Calculate normalized assessment scores
    ├─ Prepare for ML prediction
    └─ Update Students.xlsx with converted marks

[4] Generate Recommendations (generate_ml_recommendations)
    ├─ Use trained model and binarizer
    ├─ Predict relevant strategies for each student
    ├─ Map predictions back to strategy names
    └─ Return personalized recommendations
```

### 3. **Recommendation Generation Flow**

**When a student requests results:**

```python
Student Login (email: 22001@gmail.com)
    ↓
Extract Roll No (22001)
    ↓
Fetch Student Data from Students.xlsx
    ↓
For Each Course:
    ├─ Get student's assessment marks (converted)
    ├─ Load trained MLkNN model
    ├─ Use model to predict relevant strategies
    ├─ Map predicted labels to actual strategies from Courses.xlsx
    ├─ Remove duplicates
    └─ Return personalized recommendations
    ↓
Display on Dashboard
```

## Implementation

### Backend Integration (FastAPI)

The FastAPI backend (`backend/app.py`) includes:

#### New Functions
```python
get_course_strategies(course_id)
    → Returns {assessment: strategy} mapping from Courses.xlsx

generate_ml_recommendations(student, course_id)
    → Uses MLkNN model to generate strategy-based recommendations
    → Falls back gracefully if model not trained

generate_recommendations(student, total_marks, performance_level, course_id)
    → First tries ML-based recommendations
    → Falls back to rule-based if ML unavailable
```

#### New Endpoints

1. **GET /api/courses**
   - Returns all courses with their assessments and strategies
   - Example:
   ```json
   {
     "courses": [
       {
         "id": "CSE101",
         "assessments": ["Quiz 1", "Assignment 1", "Midterm"],
         "strategies": ["Practice quizzes", "Solve problems", "Review papers"]
       }
     ]
   }
   ```

2. **GET /api/courses/{course_id}/strategies**
   - Returns assessment-strategy mappings for specific course
   - Example:
   ```json
   {
     "mappings": [
       { "assessment": "Quiz 1", "strategy": "Practice quizzes daily" },
       { "assessment": "Assignment 1", "strategy": "Code in steps" }
     ]
   }
   ```

3. **POST /api/train-models**
   - Trains ML models for ALL courses
   - Calls mlcode functions in sequence
   - Returns training status for each course

4. **POST /api/train-models/{course_id}**
   - Trains ML model for specific course
   - Useful for testing single course

5. **GET /api/models/status**
   - Returns which courses have trained models ready
   - Shows model file existence status

## Setup & Training

### Step 1: Verify Courses.xlsx Structure
```
Courses.xlsx should have sheets with:
- Assessments column
- Strategies column  
- Total Marks column
- Converted Marks column
```

### Step 2: Train Models

**Option A: Using Python Script**
```bash
# Train all models
python train_models.py

# Train specific course
python train_models.py CSE101
```

**Option B: Using API**
```bash
# Start backend server
python backend/app.py

# Train all models (API call)
curl -X POST http://localhost:8000/api/train-models

# Train specific course
curl -X POST http://localhost:8000/api/train-models/CSE101
```

**Option C: Direct Python**
```python
import mlcode

# For each course
course_id = "CSE101"
mlcode.generate_data(course_id)      # Generate synthetic training data
mlcode.training_data(course_id)      # Train MLkNN model
mlcode.dataprep(course_id)           # Preprocess student data
```

### Step 3: Verify Training
```bash
# Check which models are trained
curl http://localhost:8000/api/models/status

# Should see:
# {
#   "models": [
#     {"course": "CSE101", "is_trained": true, ...},
#     ...
#   ]
# }
```

## Key Features

### 1. **Multi-Label Recommendations**
Each student can receive multiple strategies based on performance across different assessments.

```
Student 22001 Marks:
- Quiz 1: 8/10 (80%)     ← Good performance
- Assignment: 3/5 (60%)  ← Weak performance → Strategy recommended
- Midterm: 35/50 (70%)   ← Average performance

ML Model Predicts:
- "Solve problems step-by-step"  (for Assignment)
- "Review previous papers"       (for improvement)
```

### 2. **Intelligent Fallback**
If ML model not trained:
- Uses rule-based recommendations (performance-level based)
- Gracefully degrades without crash

### 3. **Adaptive Learning**
Model learns from synthetic data:
- 100,000 training samples per course
- Real student patterns simulated
- k=30 neighbors for robust predictions

### 4. **Strategy Mapping**
Predictions directly map to course strategies:
```python
# Instead of: "Recommendation for Quiz 1"
# You get:   "Practice quizzes daily" (actual strategy)
```

## Files Created/Modified

### New Files
- `train_models.py` - Utility script to train models
- `ML_INTEGRATION.md` - This documentation

### Modified Files
- `backend/app.py` - Added ML functions and endpoints

### Generated Files (After Training)
- `{course_id}_train_dataset.xlsx` - Synthetic training data
- `{course_id}_dataset_model.joblib` - Trained MLkNN model
- `{course_id}_dataset_mlb.joblib` - MultiLabelBinarizer
- Updated `Students.xlsx` - With recommendations

## Example Test Cases

### Test 1: Verify Course Structure
```bash
curl http://localhost:8000/api/courses
```

### Test 2: Train Model for Course
```bash
curl -X POST http://localhost:8000/api/train-models/CSE101
```

### Test 3: Get Course Strategies
```bash
curl http://localhost:8000/api/courses/CSE101/strategies
```

### Test 4: Check Model Status
```bash
curl http://localhost:8000/api/models/status
```

### Test 5: Get Student Results with Recommendations
```bash
curl http://localhost:8000/api/student/22001/results
```

Expected response:
```json
{
  "success": true,
  "data": {
    "CSE101": {
      "course": "CSE101",
      "recommendations": [
        "Practice problem-solving regularly",
        "Review previous exam papers"
      ],
      "performance_level": "Good"
    }
  }
}
```

## Performance Metrics

### Model Training
- Time: ~10-20 seconds per course
- Accuracy: ~70-85% (MLkNN on synthetic data)
- Training samples: 100,000 per course
- Test split: 20%

### Recommendation Generation
- Time: <100ms per student per course
- Accuracy: Based on model training accuracy
- Recommendations generated: 1-5 per student

## Troubleshooting

### Issue: "Models not trained" for a course
**Solution:** Train the model using one of the methods above

### Issue: Recommendations are generic
**Solution:** 
- Verify Courses.xlsx has proper Assessment-Strategy mappings
- Retrain model with `curl -X POST http://localhost:8000/api/train-models/{course_id}`

### Issue: "Cannot find Courses.xlsx"
**Solution:** Ensure Courses.xlsx exists in root directory with course sheets

### Issue: Module import errors
**Solution:** Install required packages: `pip install -r requirements.txt`

## Future Enhancements

1. **Real Historical Data Training**
   - Use actual past student data instead of synthetic
   - Retrain periodically with new data
   - Continuous model improvement

2. **Advanced Features**
   - Student learning path recommendations
   - Peer group suggestions
   - Adaptive threshold adjustment

3. **Teacher Dashboard**
   - View model performance by course
   - Manual strategy override capability
   - Recommendation analytics

4. **Feedback Loop**
   - Track which recommendations students follow
   - Measure impact on grades
   - Auto-update strategies based on effectiveness

## References

- **Algorithm:** MLkNN (Multi-Label k-Nearest Neighbors)
- **Library:** scikit-multilearn
- **Feature Scaling:** Converted marks from Courses.xlsx
- **Labels:** Strategies from Courses.xlsx
