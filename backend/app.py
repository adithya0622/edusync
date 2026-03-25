from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import os
from typing import Optional, List, Dict
import json
import sys
import joblib
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
import requests

# Load environment variables
load_dotenv()

# Add parent directory to path to import mlcode
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ML code functions
try:
    import mlcode
except ImportError:
    mlcode = None

app = FastAPI(title="Drop In - Student Learning Recommendation System")

# Update CORSMiddleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDENTS_FILE = os.path.join(BASE_DIR, "Students.xlsx")
COURSES_FILE = os.path.join(BASE_DIR, "Courses.xlsx")

# API Key Configuration
VALID_API_KEYS = [
    "upgrade-ai-key-2026",  # Default key
    os.getenv("API_KEY", "upgrade-ai-key-2026")  # Can override with env variable
]

# ==================== API Key Verification ====================
def verify_api_key(x_api_key: str = Header(None)) -> str:
    """Verify API key from header"""
    if not x_api_key:
        raise HTTPException(
            status_code=403,
            detail="API key missing. Include x-api-key header."
        )
    
    if x_api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )
    
    return x_api_key

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

# ==================== Recommendation Models ====================
class StudentRecommendationRequest(BaseModel):
    student_id: int
    class_id: str
    course_id: str

class StudentRecommendationResponse(BaseModel):
    success: bool
    student_id: int
    class_id: str
    course_id: str
    marks: Dict[str, float]
    total_marks: float
    recommendations: str
    message: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    student_id: Optional[str] = "guest"

class ChatResponse(BaseModel):
    response: str
    detected_emotion: Optional[str] = None

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

        # Check if roll_no exists in the dataframe (any student, not just top 5)
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

        return {"success": False, "data": None, "error": f"Student with Roll No {roll_no} not found"}

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
    """
    Generate strategy recommendations from Courses.xlsx based on LOW converted marks.
    
    For each assessment:
    - Get the converted mark from student data
    - Calculate if it's below threshold (75% of max converted marks)
    - If below threshold, include the strategy for that assessment (word-for-word from Courses.xlsx)
    
    Returns: List of strategies (word-for-word from Courses.xlsx) for weak assessments only
    """
    recommendations = []
    
    try:
        # Get Courses.xlsx data
        df_courses = pd.read_excel(COURSES_FILE, sheet_name=course_id, engine='openpyxl')
        
        if 'Assessments' not in df_courses.columns:
            return None
        
        # Find strategies column (handle various naming)
        strategies_col = None
        for col in df_courses.columns:
            if 'strateg' in col.lower():
                strategies_col = col
                break
        
        if not strategies_col:
            return None
        
        # Find converted marks column
        converted_marks_col = None
        for col in df_courses.columns:
            if 'converted' in col.lower() and 'mark' in col.lower():
                converted_marks_col = col
                break
        
        if not converted_marks_col:
            return None
        
        # Get assessments and their info
        assessments = df_courses['Assessments'].values
        strategies = df_courses[strategies_col].values
        converted_marks_max = df_courses[converted_marks_col].values
        
        # Threshold: 75% of max converted marks for each assessment
        threshold_percentage = 0.75
        
        # For each assessment, check if student's mark is below threshold
        for idx, assessment in enumerate(assessments):
            if pd.isna(assessment):
                continue
            
            assessment_name = str(assessment).strip()
            converted_col_name = f"{assessment_name} Converted"
            
            # Skip if assessment not in student data
            if converted_col_name not in student:
                continue
            
            student_mark = student[converted_col_name]
            if pd.isna(student_mark):
                continue
            
            student_mark = float(student_mark)
            
            # Get max mark for this assessment
            if idx < len(converted_marks_max):
                max_mark = float(converted_marks_max[idx])
                threshold = threshold_percentage * max_mark
                
                # If student mark is below threshold (75%), add the strategy
                if student_mark < threshold:
                    strategy = str(strategies[idx]).strip() if idx < len(strategies) else None
                    if strategy and strategy.lower() != 'nan':
                        recommendations.append(strategy)
        
        return recommendations if recommendations else None
    
    except Exception as e:
        print(f"Error in generate_ml_recommendations: {e}")
        return None

def get_default_recommendations(performance_level: str) -> List[str]:
    """
    Get default personalized recommendations based on performance level
    """
    if performance_level == "Excellent":
        return [
            "Continue learning the same way",
            "Mentor your peers and help them improve"
        ]
    elif performance_level == "Very Good":
        return [
            "Maintain your current study approach",
            "Challenge yourself with advanced topics",
            "Help classmates understand difficult concepts"
        ]
    elif performance_level == "Good":
        return [
            "Focus on strengthening weak areas",
            "Practice more challenging problems",
            "Form study groups with peers"
        ]
    elif performance_level == "Satisfactory":
        return [
            "Increase your study time and focus",
            "Seek clarification from your instructor",
            "Practice more regularly with revision notes"
        ]
    else:  # Needs Improvement
        return [
            "Talk to your instructor for extra help",
            "Schedule consistent study sessions",
            "Review fundamentals and core concepts",
            "Attend additional practice sessions"
        ]

def generate_recommendations(student: dict, total_marks: float, performance_level: str, course_id: str = None) -> List[str]:
    """
    Generate learning strategy recommendations from Courses.xlsx using ML model.
    Returns actual teaching strategies mapped to areas needing improvement.
    If no AI recommendations available, returns default personalized suggestions based on performance.
    """
    recommendations = []
    
    try:
        # Try ML-based recommendations using actual strategies from Courses.xlsx
        if course_id:
            ml_recommendations = generate_ml_recommendations(student, course_id)
            if ml_recommendations:
                return ml_recommendations
        
        # If no ML models trained, return personalized default suggestions based on performance level
        return get_default_recommendations(performance_level)
    
    except Exception as e:
        print(f"Error in generate_recommendations: {e}")
        return get_default_recommendations(performance_level)

# ==================== API Endpoints ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Drop In API Server Running", "status": "ok"}

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
            return JSONResponse(status_code=400, content={"error": "Invalid email format"})

        # Extract roll number from email
        roll_no = extract_roll_no_from_email(email)
        print(f"Incoming roll_no: {roll_no}")  # Log roll_no to console

        if not roll_no:
            return JSONResponse(status_code=400, content={"error": "Invalid email format"})

        # Validate student exists
        validation = validate_student(roll_no)

        if not validation["success"]:
            return JSONResponse(
                status_code=401,
                content={"error": f"User with Roll No {roll_no} not found in top 5"}
            )

        student_data = validation["data"]

        return LoginResponse(
            success=True,
            message="Login successful",
            student_id=roll_no,
            student_name=student_data.get("Student Name", "Student"),
            token=f"token_{roll_no}_{email}"
        )

    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

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
    return {"status": "healthy", "service": "Drop In API"}

# ==================== ML Recommendation Endpoints ====================

@app.post("/api/recommendations/student")
async def get_student_recommendation(
    request: StudentRecommendationRequest,
    api_key: str = Header(None, alias="x-api-key")
):
    """
    Get ML-based recommendations for a specific student in a course.
    Calculates converted marks on-the-fly from raw marks and conversion factors.
    
    Requires API key in header: x-api-key
    """
    try:
        # Verify API key
        if not api_key:
            raise HTTPException(status_code=403, detail="API key missing. Include x-api-key header.")
        verify_api_key(api_key)
        
        # Read student data
        df = pd.read_excel(STUDENTS_FILE, sheet_name=request.course_id)
        df_courses = pd.read_excel(COURSES_FILE, sheet_name=request.course_id)
        
        # Find student
        result = df[(df['Class'] == request.class_id) & (df['Student Id'] == request.student_id)]
        
        if result.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Student {request.student_id} not found in class {request.class_id}"
            )
        
        # Get assessments from Courses.xlsx
        assessments_list = list(df_courses['Assessments'].values)
        total_marks_list = list(df_courses['Total Marks'].values)
        converted_marks_list = list(df_courses['Converted Marks'].values)
        strategies_list = list(df_courses['Strategies'].values)
        
        # Calculate converted marks and prepare response
        stu_marks = {}
        recommendations = []
        total_converted = 0.0
        
        for i, assessment in enumerate(assessments_list):
            assessment_name = str(assessment).strip()
            
            # Skip if assessment not in student record
            if assessment_name not in result.columns:
                continue
            
            # Get raw mark
            raw_mark = result[assessment_name].values[0]
            if pd.isna(raw_mark):
                raw_mark = 0.0
            else:
                raw_mark = float(raw_mark)
            
            # Get conversion factor
            if i < len(total_marks_list) and i < len(converted_marks_list):
                total_mark = float(total_marks_list[i])
                converted_max = float(converted_marks_list[i])
                
                # Calculate converted mark: (raw / total) * converted_max
                converted_mark = (raw_mark / total_mark * converted_max) if total_mark > 0 else 0.0
                stu_marks[assessment_name] = round(converted_mark, 2)
                total_converted += converted_mark
                
                # Check if below 60% threshold
                threshold = 0.60 * converted_max
                if converted_mark < threshold:
                    # Add strategy if available
                    if i < len(strategies_list):
                        strategy = str(strategies_list[i]).strip()
                        if strategy and strategy.lower() != 'nan':
                            recommendations.append(strategy)
        
        # Format recommendations string
        if recommendations:
            # Remove duplicates while maintaining order
            seen = set()
            unique_recommendations = []
            for r in recommendations:
                if r not in seen:
                    unique_recommendations.append(r)
                    seen.add(r)
            recommendations_str = "\n".join(unique_recommendations)
        else:
            # Determine performance level to provide personalized default suggestions
            if total_converted >= 200:
                performance_level = "Excellent"
            elif total_converted >= 150:
                performance_level = "Very Good"
            elif total_converted >= 100:
                performance_level = "Good"
            elif total_converted >= 50:
                performance_level = "Satisfactory"
            else:
                performance_level = "Needs Improvement"
            
            # Get personalized default suggestions
            default_recommendations = get_default_recommendations(performance_level)
            recommendations_str = "\n".join([f"{i+1}. {rec}" for i, rec in enumerate(default_recommendations)])
        
        return StudentRecommendationResponse(
            success=True,
            student_id=request.student_id,
            class_id=request.class_id,
            course_id=request.course_id,
            marks=stu_marks,
            total_marks=round(total_converted, 2),
            recommendations=recommendations_str
        )
    
    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting student recommendations: {str(e)}")

# ==================== Chat Bot Endpoints ====================
def detect_emotional_state(message: str) -> Optional[str]:
    """
    Detect if student is expressing emotional distress
    Returns: emotion type or None
    """
    msg_lower = message.lower()
    
    if any(w in msg_lower for w in ['sad', 'depressed', 'lonely', 'unhappy', 'struggle', 'failure', 'tired', 'lost']):
        return 'sad'
    elif any(w in msg_lower for w in ['stress', 'anxiety', 'anxious', 'pressure', 'overwhelm', 'panic']):
        return 'stressed'
    elif any(w in msg_lower for w in ['frustrated', 'angry', 'annoyed', 'irritated', 'upset']):
        return 'frustrated'
    
    return None

def generate_supportive_response(message: str, emotion: Optional[str]) -> str:
    """
    Generate supportive and contextual responses
    """
    msg_lower = message.lower()
    
    # Emotional support takes priority
    if emotion:
        emotional_responses = {
            'sad': [
                "I understand you're struggling. Remember, this feeling is temporary and you can overcome it. Let's focus on what we can improve.",
                "It's okay to feel down. Many successful students have been there. What specific subject can I help you with?"
            ],
            'stressed': [
                "Stress is normal, but you're not alone. Let's break your work into smaller, manageable chunks. What's the priority?",
                "Take a breath! Let's tackle one thing at a time. What would help you most right now?"
            ],
            'frustrated': [
                "Frustration means you care about your studies. Let me help you find a new approach. What are you working on?"
            ]
        }
        import random
        return random.choice(emotional_responses.get(emotion, ["I'm here to help you. What's the topic?"]))
    
    # Context-based responses
    if any(w in msg_lower for w in ['math', 'calculus', 'algebra', 'geometry', 'equation']):
        return "I can help with math! What specific problem or concept are you struggling with? Share an example!"
    
    if any(w in msg_lower for w in ['code', 'program', 'python', 'java', 'javascript', 'debug']):
        return "Great! I can help with programming. What language and what's the issue you're facing?"
    
    if any(w in msg_lower for w in ['exam', 'test', 'quiz', 'prepare', 'revision']):
        return "Exam prep is important! What subjects are you preparing for? Let's make a study plan."
    
    if any(w in msg_lower for w in ['understand', 'explain', 'confused', 'difficult', 'hard']):
        return "No problem! Let me explain it simply. What topic would you like me to break down?"
    
    if any(w in msg_lower for w in ['motivation', 'continue', 'give up', 'quit']):
        return "Don't give up! You're capable of more than you think. What specific challenge can I help you overcome?"
    
    # Default response
    return "I'm here to help you academically and emotionally. What would you like to discuss - is it a specific subject or how you're feeling?"

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint for AI tutor support
    Provides academic help and emotional guidance
    
    Note: Bytez AI integration available but currently using rule-based responses
    """
    try:
        message = request.message.strip()
        
        if not message:
            return ChatResponse(response="Please send a message for me to help you.")
        
        # Use rule-based response for now
        response = generate_supportive_response(message, None)
        
        return ChatResponse(response=response)
    
    except Exception as e:
        print(f"Chat error: {e}")
        return ChatResponse(response="I'm here to help! Tell me what you're working on.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
