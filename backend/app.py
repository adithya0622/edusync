from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import os
from typing import Optional, List, Dict
import json
import sys
import joblib
from sklearn.preprocessing import MultiLabelBinarizer
from skmultilearn.adapt import MLkNN
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Add parent directory to path to import mlcode
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ML code functions
try:
    import mlcode
except ImportError:
    mlcode = None

app = FastAPI(title="Upgrade - Student Learning Recommendation System")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDENTS_FILE = os.path.join(BASE_DIR, "Students.xlsx")
COURSES_FILE = os.path.join(BASE_DIR, "Courses.xlsx")

# ==================== Models ====================
class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None

class LoginResponse(BaseModel):
    success: bool
    message: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    token: Optional[str] = None

class StudentResult(BaseModel):
    roll_no: str
    student_name: str
    course: str
    marks: dict
    total_marks: int
    performance_level: str
    recommendations: List[str]

# ==================== Utility Functions ====================

def read_students_excel():
    """Read the Students Excel file"""
    try:
        if not os.path.exists(STUDENTS_FILE):
            raise FileNotFoundError(f"Students file not found at {STUDENTS_FILE}")
        df = pd.read_excel(STUDENTS_FILE)
        return df
    except Exception as e:
        raise Exception(f"Error reading Students file: {str(e)}")

def extract_roll_no_from_email(email: str) -> str:
    """Extract roll number from email (e.g., 22001@gmail.com -> 22001)"""
    try:
        roll_no = email.split("@")[0]
        return roll_no
    except:
        return None

def validate_student(roll_no: str) -> dict:
    """Validate if student exists in Students Excel file"""
    try:
        df = read_students_excel()
        
        # Check if roll_no exists in the dataframe
        # Assuming 'Roll No' or similar column exists
        student_row = None
        
        for col in df.columns:
            if 'roll' in col.lower() or 'id' in col.lower():
                mask = df[col].astype(str).str.contains(str(roll_no), case=False, na=False)
                student_row = df[mask]
                if not student_row.empty:
                    return {
                        "success": True,
                        "data": student_row.iloc[0].to_dict()
                    }
        
        # If no matching column found, try first column
        if not student_row is None and not student_row.empty:
            return {"success": True, "data": student_row.iloc[0].to_dict()}
        
        return {"success": False, "data": None}
    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

def get_student_results(roll_no: str) -> dict:
    """Get student results and performance data from all sheets"""
    try:
        # Get all sheet names
        excel_file = pd.ExcelFile(STUDENTS_FILE)
        sheet_names = excel_file.sheet_names
        
        all_results = {}
        found_student = False
        
        for sheet_name in sheet_names:
            df = pd.read_excel(STUDENTS_FILE, sheet_name=sheet_name)
            
            # Find student by roll/ID number
            student_data = None
            for col in df.columns:
                if any(term in col.lower() for term in ['roll', 'id', 'student id', 'student_id']):
                    mask = df[col].astype(str).str.contains(str(roll_no), case=False, na=False)
                    matching = df[mask]
                    if not matching.empty:
                        student_data = matching.iloc[0].to_dict()
                        found_student = True
                        break
            
            if student_data:
                # Extract marks and course info
                marks_data = {}
                total_marks = 0
                
                for col in df.columns:
                    col_lower = col.lower()
                    if any(term in col_lower for term in ['mark', 'score', 'test', 'quiz', 'exam', 'assignment', 'lab']):
                        try:
                            mark_value = float(student_data.get(col, 0) or 0)
                            marks_data[col] = mark_value
                            total_marks += mark_value
                        except (ValueError, TypeError):
                            pass
                
                # Determine performance level
                if total_marks >= 200:
                    performance_level = "Excellent"
                elif total_marks >= 150:
                    performance_level = "Very Good"
                elif total_marks >= 100:
                    performance_level = "Good"
                elif total_marks >= 50:
                    performance_level = "Satisfactory"
                else:
                    performance_level = "Needs Improvement"
                
                # Generate recommendations with course_id and full student data (including converted marks)
                recommendations = generate_recommendations(student_data, total_marks, performance_level, sheet_name)
                
                all_results[sheet_name] = {
                    "course": sheet_name,
                    "student_name": student_data.get("Student Name", student_data.get("Name", "Unknown")),
                    "roll_no": roll_no,
                    "marks": marks_data,
                    "total_marks": total_marks,
                    "performance_level": performance_level,
                    "recommendations": recommendations
                }
        
        if not found_student:
            return None
        
        return all_results
    
    except Exception as e:
        print(f"Error getting student results: {e}")
        return None

def get_course_strategies(course_id: str) -> Dict[str, str]:
    """
    Get assessment-to-strategy mapping from Courses.xlsx
    Returns: {assessment_name: strategy}
    """
    try:
        if not os.path.exists(COURSES_FILE):
            return {}
        
        df_courses = pd.read_excel(COURSES_FILE, sheet_name=course_id, engine='openpyxl')
        
        # Find the strategies column (handle typo "Strate gies")
        strategies_col = None
        for col in df_courses.columns:
            if 'strateg' in col.lower():
                strategies_col = col
                break
        
        # Create mapping if both Assessments and Strategies columns exist
        if 'Assessments' in df_courses.columns and strategies_col:
            assessments = list(df_courses['Assessments'].values)
            strategies = list(df_courses[strategies_col].values)
            strategy_map = dict(zip(assessments, strategies))
            return strategy_map
        
        return {}
    except Exception as e:
        print(f"Error getting course strategies: {e}")
        return {}

def generate_ml_recommendations(student: dict, course_id: str) -> List[str]:
    """Generate ML-based recommendations using trained model and course strategies"""
    recommendations = []
    
    try:
        # Get model and MLB files
        model_file_path = os.path.join(BASE_DIR, f"{course_id}_dataset_model.joblib")
        mlb_file_path = os.path.join(BASE_DIR, f"{course_id}_dataset_mlb.joblib")
        
        # Check if models exist
        if not os.path.exists(model_file_path) or not os.path.exists(mlb_file_path):
            return None  # Models not trained yet
        
        # Load model and MLB
        loaded_model = joblib.load(model_file_path)
        mlb = joblib.load(mlb_file_path)
        
        # Get assessments from Courses file
        df_courses = pd.read_excel(COURSES_FILE, sheet_name=course_id, engine='openpyxl')
        assessments = list(df_courses['Assessments'].values)
        
        # Get course strategies mapping
        strategy_map = get_course_strategies(course_id)
        
        # Prepare test data with converted marks
        test_data = {}
        for assessment in assessments:
            converted_name = f"{assessment} Converted"
            if converted_name in student and pd.notna(student[converted_name]):
                test_data[assessment] = [float(student[converted_name])]
            else:
                test_data[assessment] = [0.0]
        
        if not test_data:
            return None
        
        test_df = pd.DataFrame(test_data)
        
        # Get predictions from model
        predictions = loaded_model.predict(test_df)
        if hasattr(predictions, 'toarray'):
            predictions_nd = predictions.toarray()
        else:
            predictions_nd = np.array(predictions)

        predicted_labels = mlb.inverse_transform(predictions_nd)

        # Map predicted labels to strategies
        for labels in predicted_labels:
            if labels:
                for label in labels:
                    # For this ML approach we predict assessment names, not raw strategy text.
                    if label in strategy_map:
                        strategy = strategy_map[label]
                        if strategy and pd.notna(strategy) and strategy.strip():
                            recommendations.append(str(strategy).strip())

        
        # Remove duplicates while preserving order
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec not in seen:
                seen.add(rec)
                unique_recommendations.append(rec)
        
        return unique_recommendations if unique_recommendations else None
    
    except Exception as e:
        print(f"Error in generate_ml_recommendations: {e}")
        return None

def generate_recommendations(student: dict, total_marks: float, performance_level: str, course_id: str = None) -> List[str]:
    """
    Generate personalized learning recommendations using ML model with course strategies
    Falls back to rule-based if ML not available
    """
    recommendations = []
    
    try:
        # First, try ML-based recommendations if course_id provided
        if course_id:
            ml_recommendations = generate_ml_recommendations(student, course_id)
            if ml_recommendations:
                return ml_recommendations
        
        # Fallback to rule-based recommendations based on performance
        if performance_level == "Excellent":
            recommendations = [
                "Outstanding performance! Keep it up.",
                "Help peers understand difficult concepts",
                "Explore advanced topics",
                "Maintain consistent study approach"
            ]
        elif performance_level == "Very Good":
            recommendations = [
                "Excellent progress, maintain momentum!",
                "Review topics with slightly lower scores",
                "Work on advanced problem sets",
                "Consistent daily practice recommended"
            ]
        elif performance_level == "Good":
            recommendations = [
                "Good foundation built, aim higher!",
                "Practice more challenging problems",
                "Dedicate time to weaker topics",
                "Form study groups with peers",
                "Attend extra sessions for clarity"
            ]
        elif performance_level == "Satisfactory":
            recommendations = [
                "You can achieve better results",
                "Focus on fundamentals",
                "Increase daily study hours",
                "Get instructor help on tough concepts",
                "Use concept-mapping techniques",
                "Practice basic problems first"
            ]
        else:
            recommendations = [
                "Significant improvement needed immediately",
                "Master the basics first",
                "Daily practice is essential",
                "One-on-one tutoring recommended",
                "Break concepts into smaller parts",
                "Build strong foundation",
                "Attend all revision sessions"
            ]
        
        return recommendations
    
    except Exception as e:
        print(f"Error in generate_recommendations: {e}")
        return ["Continue with consistent practice and seek help when needed"]

# ==================== API Endpoints ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Upgrade API Server Running", "status": "ok"}

@app.post("/api/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login endpoint - validates student using roll number from email
    Expected email format: rollno@gmail.com
    """
    try:
        email = request.email.strip().lower()
        
        # Validate email format
        if "@" not in email:
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Extract roll number from email
        roll_no = extract_roll_no_from_email(email)
        if not roll_no:
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Validate student exists
        validation = validate_student(roll_no)
        
        if not validation["success"]:
            raise HTTPException(
                status_code=401,
                detail=f"Student with Roll No {roll_no} not found"
            )
        
        student_data = validation["data"]
        
        return LoginResponse(
            success=True,
            message="Login successful",
            student_id=roll_no,
            student_name=student_data.get("Student Name", "Student"),
            token=f"token_{roll_no}_{email}"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/student/{roll_no}/results")
async def get_student_results_endpoint(roll_no: str):
    """
    Get student results and recommendations for all courses
    """
    try:
        results = get_student_results(roll_no)
        
        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"Student with Roll No {roll_no} not found"
            )
        
        return {
            "success": True,
            "data": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/students/results")
async def get_all_students_results():
    """Get results and recommendations for all students across all courses"""
    try:
        if not os.path.exists(STUDENTS_FILE):
            raise HTTPException(status_code=404, detail="Students file not found")

        excel_file = pd.ExcelFile(STUDENTS_FILE, engine='openpyxl')
        rolls = set()
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(STUDENTS_FILE, sheet_name=sheet_name, engine='openpyxl')
            for col in df.columns:
                if 'roll' in col.lower() or 'id' in col.lower():
                    rolls.update(df[col].dropna().astype(str).str.strip().tolist())

        all_results = {}
        for roll_no in sorted(rolls):
            student_results = get_student_results(roll_no)
            if student_results:
                all_results[roll_no] = student_results

        return {
            "success": True,
            "data": all_results
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/student/{roll_no}/recommendations")
async def get_student_recommendations(roll_no: str):
    """Get recommendations for student across all courses"""
    try:
        results = get_student_results(roll_no)
        if not results:
            raise HTTPException(status_code=404, detail=f"Student with Roll No {roll_no} not found")

        course_recs = {}
        for course_id, data in results.items():
            course_recs[course_id] = data.get('recommendations', [])

        return {
            "success": True,
            "student_id": roll_no,
            "recommendations": course_recs
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/student/{roll_no}/profile")
async def get_student_profile(roll_no: str):
    """Get student profile information"""
    try:
        validation = validate_student(roll_no)
        
        if not validation["success"]:
            raise HTTPException(
                status_code=404,
                detail=f"Student with Roll No {roll_no} not found"
            )
        
        return {
            "success": True,
            "profile": validation["data"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses")
async def get_available_courses():
    """Get all available courses from Courses.xlsx"""
    try:
        if not os.path.exists(COURSES_FILE):
            raise HTTPException(status_code=404, detail="Courses file not found")
        
        excel_file = pd.ExcelFile(COURSES_FILE)
        sheet_names = excel_file.sheet_names
        
        courses = []
        for sheet_name in sheet_names:
            try:
                df = pd.read_excel(COURSES_FILE, sheet_name=sheet_name, engine='openpyxl')
                course_data = {
                    "id": sheet_name,
                    "name": sheet_name,
                    "columns": list(df.columns),
                    "assessments": list(df['Assessments'].values) if 'Assessments' in df.columns else [],
                    "strategies": list(df['Strategies'].values) if 'Strategies' in df.columns else [],
                }
                courses.append(course_data)
            except Exception as e:
                print(f"Error reading course {sheet_name}: {e}")
                courses.append({"id": sheet_name, "name": sheet_name, "error": str(e)})
        
        return {
            "success": True,
            "courses": courses
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses/{course_id}/strategies")
async def get_course_strategies_endpoint(course_id: str):
    """Get strategies and assessment mappings for a specific course"""
    try:
        if not os.path.exists(COURSES_FILE):
            raise HTTPException(status_code=404, detail="Courses file not found")
        
        df_courses = pd.read_excel(COURSES_FILE, sheet_name=course_id, engine='openpyxl')
        
        if 'Assessments' not in df_courses.columns or 'Strategies' not in df_courses.columns:
            raise HTTPException(status_code=400, detail="Course missing Assessments or Strategies columns")
        
        assessments = list(df_courses['Assessments'].values)
        strategies = list(df_courses['Strategies'].values)
        
        strategy_mappings = []
        for assessment, strategy in zip(assessments, strategies):
            if pd.notna(assessment) and pd.notna(strategy):
                strategy_mappings.append({
                    "assessment": str(assessment).strip(),
                    "strategy": str(strategy).strip()
                })
        
        return {
            "success": True,
            "course_id": course_id,
            "mappings": strategy_mappings
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train-models")
async def train_all_models():
    """Train ML models for all courses using mlcode functions"""
    try:
        if not mlcode:
            raise HTTPException(status_code=500, detail="MLCode module not available")
        
        excel_file = pd.ExcelFile(COURSES_FILE)
        sheet_names = excel_file.sheet_names
        
        results = []
        for course_id in sheet_names:
            try:
                print(f"Training models for {course_id}...")
                
                # Generate synthetic training data
                mlcode.generate_data(course_id)
                print(f"  ✓ Generated training data for {course_id}")
                
                # Train ML model
                mlcode.training_data(course_id)
                print(f"  ✓ Trained model for {course_id}")
                
                # Preprocess student data
                mlcode.dataprep(course_id)
                print(f"  ✓ Preprocessed data for {course_id}")
                
                results.append({
                    "course": course_id, 
                    "status": "trained",
                    "message": "Models trained successfully"
                })
            except Exception as e:
                print(f"  ✗ Error training {course_id}: {e}")
                results.append({
                    "course": course_id, 
                    "status": "failed", 
                    "error": str(e)
                })
        
        return {
            "success": True,
            "message": "Model training complete",
            "results": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training models: {str(e)}")

@app.post("/api/train-models/{course_id}")
async def train_single_model(course_id: str):
    """Train ML model for a specific course"""
    try:
        if not mlcode:
            raise HTTPException(status_code=500, detail="MLCode module not available")
        
        # Verify course exists
        excel_file = pd.ExcelFile(COURSES_FILE)
        if course_id not in excel_file.sheet_names:
            raise HTTPException(status_code=404, detail=f"Course {course_id} not found")
        
        print(f"Training models for {course_id}...")
        
        # Generate synthetic training data
        mlcode.generate_data(course_id)
        print(f"  ✓ Generated training data for {course_id}")
        
        # Train ML model
        mlcode.training_data(course_id)
        print(f"  ✓ Trained model for {course_id}")
        
        # Preprocess student data
        mlcode.dataprep(course_id)
        print(f"  ✓ Preprocessed data for {course_id}")
        
        return {
            "success": True,
            "message": f"Model trained successfully for {course_id}",
            "course": course_id,
            "status": "trained"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error training model: {str(e)}")

@app.get("/api/models/status")
async def get_models_status():
    """Get training status of ML models for all courses"""
    try:
        excel_file = pd.ExcelFile(COURSES_FILE)
        sheet_names = excel_file.sheet_names
        
        models_status = []
        for course_id in sheet_names:
            model_file = os.path.join(BASE_DIR, f"{course_id}_dataset_model.joblib")
            mlb_file = os.path.join(BASE_DIR, f"{course_id}_dataset_mlb.joblib")
            
            is_trained = os.path.exists(model_file) and os.path.exists(mlb_file)
            
            models_status.append({
                "course": course_id,
                "is_trained": is_trained,
                "model_exists": os.path.exists(model_file),
                "mlb_exists": os.path.exists(mlb_file)
            })
        
        return {
            "success": True,
            "models": models_status
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Upgrade API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
