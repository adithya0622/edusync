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
from cryptography.fernet import Fernet
import hashlib
import base64
from urllib.parse import quote_plus

# Load environment variables
load_dotenv()

# ── Roll number encryption (stable key derived from secret) ──────────────────
_rn_secret = os.getenv("ROLL_ENCRYPT_SECRET", "dropin-rollno-key-2026")
_rn_fernet = Fernet(
    base64.urlsafe_b64encode(
        hashlib.pbkdf2_hmac('sha256', _rn_secret.encode(), b'dropin_v1', 100000)
    )
)

def mask_roll_no(roll_no: str) -> str:
    """Mask roll number for display: first 2 digits visible, rest as asterisks"""
    s = str(roll_no).strip()
    return s[:2] + '*' * max(0, len(s) - 2)

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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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
    class_name: Optional[str] = None
    password: Optional[str] = None

class LoginResponse(BaseModel):
    success: bool
    message: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student_class: Optional[str] = None
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
    conversation_history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    detected_emotion: Optional[str] = None
    encouragement: Optional[str] = None
    suggested_actions: Optional[List[str]] = None

# ==================== Utility Functions ====================

def read_students_excel():
    """Read the Students Excel file (first sheet)"""
    try:
        if not os.path.exists(STUDENTS_FILE):
            raise FileNotFoundError(f"Students file not found at {STUDENTS_FILE}")
        df = pd.read_excel(STUDENTS_FILE)
        return df
    except Exception as e:
        raise Exception(f"Error reading Students file: {str(e)}")

def get_dept_from_class(class_name: str) -> str:
    """Extract department prefix from class name. e.g. 'CSE A' -> 'CSE'"""
    return class_name.strip().split()[0].upper() if class_name else ""

def get_dept_sheets(dept: str) -> List[str]:
    """Get sheet names in Students.xlsx that belong to a department"""
    xl = pd.ExcelFile(STUDENTS_FILE)
    return [s for s in xl.sheet_names if dept.upper() in s.upper()]

def get_all_classes() -> List[str]:
    """Return all unique class names from Students.xlsx"""
    xl = pd.ExcelFile(STUDENTS_FILE)
    classes = set()
    for sheet in xl.sheet_names:
        df = pd.read_excel(STUDENTS_FILE, sheet_name=sheet, engine='openpyxl')
        for col in df.columns:
            if 'class' in col.lower():
                classes.update(df[col].dropna().astype(str).str.strip().unique())
                break
    return sorted(classes)

def extract_roll_no_from_email(email: str) -> str:
    """Extract roll number from email (e.g., 22001@gmail.com -> 22001)"""
    try:
        roll_no = email.split("@")[0]
        return roll_no
    except:
        return None

def validate_student(roll_no: str, class_name: str = None) -> dict:
    """Validate if student exists; optionally filter by class/department"""
    try:
        # Determine which sheets to search
        if class_name:
            dept = get_dept_from_class(class_name)
            sheets = get_dept_sheets(dept) if dept else []
        else:
            xl = pd.ExcelFile(STUDENTS_FILE)
            sheets = xl.sheet_names

        for sheet in sheets:
            df = pd.read_excel(STUDENTS_FILE, sheet_name=sheet, engine='openpyxl')
            for col in df.columns:
                if 'roll' in col.lower() or ('student' in col.lower() and 'id' in col.lower()):
                    mask = df[col].astype(str).str.strip() == str(roll_no).strip()
                    student_row = df[mask]
                    if not student_row.empty:
                        row_data = student_row.iloc[0].to_dict()
                        # If class_name provided, verify it matches
                        if class_name:
                            for c in df.columns:
                                if 'class' in c.lower():
                                    if str(row_data.get(c, '')).strip() == class_name.strip():
                                        return {"success": True, "data": row_data}
                                    else:
                                        break  # Wrong class in this sheet row
                        else:
                            return {"success": True, "data": row_data}
                    break

        return {"success": False, "data": None, "error": f"Student {roll_no} not found" + (f" in class {class_name}" if class_name else "")}

    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

def get_student_results(roll_no: str, class_name: str = None) -> dict:
    """Get student results and performance data from 302 sheets only"""
    try:
        excel_file = pd.ExcelFile(STUDENTS_FILE)
        if class_name:
            dept = get_dept_from_class(class_name)
            sheet_names = [s for s in excel_file.sheet_names if dept.upper() in s.upper() and '302' in s]
        else:
            sheet_names = [s for s in excel_file.sheet_names if '302' in s]
        
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

                # ── Online resources for weak assessments ──────────────────
                online_resources = []
                try:
                    course_301_id = sheet_name.replace("302", "301")
                    curriculum_map = get_curriculum_map(course_301_id)
                    if curriculum_map:
                        df_c = pd.read_excel(COURSES_FILE, sheet_name=sheet_name, engine='openpyxl')
                        if 'Assessments' in df_c.columns:
                            # Reuse same threshold logic as generate_ml_recommendations
                            max_marks_col = None
                            for col in df_c.columns:
                                if 'converted' in col.lower() and 'mark' in col.lower():
                                    max_marks_col = col
                                    break
                            if not max_marks_col:
                                for col in df_c.columns:
                                    if 'total' in col.lower() and 'mark' in col.lower():
                                        max_marks_col = col
                                        break
                            threshold_pct = 0.60
                            for idx, row in df_c.iterrows():
                                assessment_name = str(row['Assessments']).strip() if pd.notna(row['Assessments']) else None
                                if not assessment_name:
                                    continue
                                student_mark = None
                                for key in [f"{assessment_name} Converted", assessment_name]:
                                    if key in student_data:
                                        val = student_data[key]
                                        if val is not None and not (isinstance(val, float) and pd.isna(val)):
                                            student_mark = float(val)
                                            break
                                if student_mark is None:
                                    continue
                                max_val = float(row[max_marks_col]) if max_marks_col and pd.notna(row.get(max_marks_col)) else None
                                if max_val is None or max_val <= 0:
                                    continue
                                if student_mark < threshold_pct * max_val:
                                    topic = curriculum_map.get(assessment_name, "")
                                    if topic:
                                        online_resources.append({
                                            "assessment": assessment_name,
                                            "topic": topic,
                                            "resources": get_online_resources(topic)
                                        })
                except Exception as res_err:
                    print(f"Error generating online resources: {res_err}")

                all_results[sheet_name] = {
                    "course": sheet_name,
                    "student_name": student_data.get("Student Name", student_data.get("Name", "Unknown")),
                    "roll_no": roll_no,
                    "marks": marks_data,
                    "total_marks": round(total_marks, 2),
                    "performance_level": performance_level,
                    "recommendations": recommendations,
                    "online_resources": online_resources
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

def get_curriculum_map(course_301_id: str) -> Dict[str, str]:
    """
    Read the Curriculum column from a 301 Courses sheet.
    Returns {assessment_name: curriculum_topics_string}
    """
    try:
        if not os.path.exists(COURSES_FILE):
            return {}
        df = pd.read_excel(COURSES_FILE, sheet_name=course_301_id, engine='openpyxl')
        if 'Assessments' not in df.columns or 'Curriculum' not in df.columns:
            return {}
        result: Dict[str, str] = {}
        for _, row in df.iterrows():
            if pd.notna(row['Assessments']) and pd.notna(row['Curriculum']):
                result[str(row['Assessments']).strip()] = str(row['Curriculum']).strip()
        return result
    except Exception as e:
        print(f"Error reading curriculum map for {course_301_id}: {e}")
        return {}


def get_online_resources(topic: str) -> List[Dict]:
    """
    Build a list of free online course/resource links for the given curriculum topic.
    URLs are targeted to course/article pages where possible.
    """
    primary = topic.split(',')[0].strip()  # most specific keyword
    # Focused keyword: strip generic lead-in words to reach the core concept
    stop_starts = ("introduction to ", "intro to ", "overview of ", "basics of ", "fundamentals of ")
    focused = primary
    for s in stop_starts:
        if focused.lower().startswith(s):
            focused = focused[len(s):].strip()
            break

    yt_q      = quote_plus(primary + " full course tutorial")
    nptel_q   = quote_plus(focused)
    coursera_q= quote_plus(focused)
    gfg_q     = quote_plus(focused)
    mit_q     = quote_plus(focused)

    return [
        {
            "title": f"YouTube – {primary}",
            "url": f"https://www.youtube.com/results?search_query={yt_q}",
            "platform": "YouTube",
            "icon": "youtube",
            "how_to_use": "Search opens automatically. Pick a video with 10K+ views whose title matches your topic. Watch it once, then re-watch the tricky parts while taking notes."
        },
        {
            "title": f"NPTEL – {primary}",
            "url": f"https://nptel.ac.in/courses?searchByKeyword={nptel_q}",
            "platform": "NPTEL",
            "icon": "nptel",
            "how_to_use": "Click any course card, then open 'Week 1' or the relevant week. Watch the IIT professor lecture at 1.25× speed and download the transcript PDF for offline reading."
        },
        {
            "title": f"Coursera – {primary}",
            "url": f"https://www.coursera.org/search?query={coursera_q}",
            "platform": "Coursera",
            "icon": "coursera",
            "how_to_use": "Click a course, then choose \"Audit for free\" (bottom of the enroll popup). You get full access to videos and readings at no cost — just no certificate."
        },
        {
            "title": f"GeeksForGeeks – {primary}",
            "url": f"https://www.geeksforgeeks.org/?s={gfg_q}",
            "platform": "GeeksForGeeks",
            "icon": "gfg",
            "how_to_use": "Click the first article whose title matches your topic. Read the explanation and work through the examples. Scroll to the bottom for practice questions."
        },
        {
            "title": f"MIT OCW – {primary}",
            "url": f"https://ocw.mit.edu/search/?q={mit_q}&type=course",
            "platform": "MIT OCW",
            "icon": "mit",
            "how_to_use": "Click a course that matches your topic. Go to 'Lecture Notes' for PDF slides or 'Video Lectures' for recorded classes. This is free MIT university material."
        },
    ]


def generate_ml_recommendations(student: dict, course_id: str) -> List[str]:
    """
    Generate strategy recommendations from Courses.xlsx based on LOW marks.
    Works with both raw marks (302 sheets) and converted marks (301 sheets).
    Compares student mark against 75% of the Total Marks for each assessment.
    """
    recommendations = []

    try:
        df_courses = pd.read_excel(COURSES_FILE, sheet_name=course_id, engine='openpyxl')

        if 'Assessments' not in df_courses.columns:
            return None

        # Find strategies column
        strategies_col = None
        for col in df_courses.columns:
            if 'strateg' in col.lower():
                strategies_col = col
                break
        if not strategies_col:
            return None

        # Find max-marks column: prefer "Converted Marks" then "Total Marks"
        max_marks_col = None
        for col in df_courses.columns:
            if 'converted' in col.lower() and 'mark' in col.lower():
                max_marks_col = col
                break
        if not max_marks_col:
            for col in df_courses.columns:
                if 'total' in col.lower() and 'mark' in col.lower():
                    max_marks_col = col
                    break
        if not max_marks_col:
            return None

        assessments = df_courses['Assessments'].values
        strategies = df_courses[strategies_col].values
        max_marks_vals = df_courses[max_marks_col].values
        threshold_pct = 0.60

        for idx, assessment in enumerate(assessments):
            if pd.isna(assessment):
                continue
            assessment_name = str(assessment).strip()

            # Try "Assessment Converted" first (301 sheets), then raw name (302 sheets)
            student_mark = None
            for key in [f"{assessment_name} Converted", assessment_name]:
                if key in student:
                    val = student[key]
                    if val is not None and not (isinstance(val, float) and pd.isna(val)):
                        student_mark = float(val)
                        break

            if student_mark is None:
                continue

            if idx >= len(max_marks_vals) or pd.isna(max_marks_vals[idx]):
                continue
            max_mark = float(max_marks_vals[idx])
            if max_mark <= 0:
                continue

            if student_mark < threshold_pct * max_mark:
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
    Login endpoint - validates student using roll number from email + class
    Expected email format: rollno@gmail.com
    """
    try:
        email = request.email.strip().lower()
        class_name = (request.class_name or '').strip()

        if "@" not in email:
            return JSONResponse(status_code=400, content={"error": "Invalid email format"})

        roll_no = extract_roll_no_from_email(email)
        print(f"Login attempt - roll_no: {roll_no}, class: {class_name}")

        if not roll_no:
            return JSONResponse(status_code=400, content={"error": "Invalid email format"})

        if not class_name:
            return JSONResponse(status_code=400, content={"error": "Please select your class"})

        validation = validate_student(roll_no, class_name)

        if not validation["success"]:
            return JSONResponse(
                status_code=401,
                content={"error": f"Student {roll_no} not found in class {class_name}"}
            )

        student_data = validation["data"]

        return LoginResponse(
            success=True,
            message="Login successful",
            student_id=roll_no,
            student_name=student_data.get("Student Name", f"Student {roll_no}"),
            student_class=class_name,
            token=f"token_{roll_no}_{class_name.replace(' ', '_')}"
        )

    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/student/classes")
async def get_student_classes():
    """Return all available class names for student login dropdown"""
    try:
        classes = get_all_classes()
        return {"success": True, "classes": classes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/student/{roll_no}/results")
async def get_student_results_endpoint(roll_no: str, class_name: Optional[str] = None):
    """Get student results and recommendations for relevant courses"""
    try:
        results = get_student_results(roll_no, class_name)
        
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
async def get_student_recommendations(roll_no: str, class_name: Optional[str] = None):
    """Get recommendations for student across relevant courses"""
    try:
        results = get_student_results(roll_no, class_name)
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

# ==================== Teacher Endpoints ====================

TEACHER_EMAIL = "teacher123@gmail.com"

class TeacherLoginRequest(BaseModel):
    email: str
    class_name: str

class UpdateMarksRequest(BaseModel):
    course: str
    marks: Dict[str, float]

class AddStudentRequest(BaseModel):
    roll_no: str
    class_name: str
    courses: Dict[str, Dict[str, float]]  # {course_id: {mark_name: value}}

@app.post("/api/teacher/login")
async def teacher_login(request: TeacherLoginRequest):
    """Teacher login - validates fixed teacher credentials"""
    if request.email.strip().lower() != TEACHER_EMAIL:
        return JSONResponse(status_code=401, content={"success": False, "message": "Invalid teacher credentials"})
    if not request.class_name:
        return JSONResponse(status_code=400, content={"success": False, "message": "Class name required"})
    return {
        "success": True,
        "message": "Teacher login successful",
        "class_name": request.class_name,
        "token": f"teacher_token_{request.class_name}"
    }

@app.get("/api/teacher/classes")
async def get_available_classes():
    """Get all available class names from all sheets of Students.xlsx"""
    try:
        classes = get_all_classes()
        return {"success": True, "classes": classes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/teacher/class/{class_name}/students")
async def get_class_students(class_name: str):
    """Get all students in a class with their marks and performance (302 courses only)"""
    try:
        if not os.path.exists(STUDENTS_FILE):
            raise HTTPException(status_code=404, detail="Students file not found")

        dept = get_dept_from_class(class_name)
        excel_file = pd.ExcelFile(STUDENTS_FILE, engine='openpyxl')
        # Only show the 302 sheet for this department
        target_sheets = [s for s in excel_file.sheet_names if dept.upper() in s.upper() and '302' in s]
        students_map: Dict[str, dict] = {}

        for sheet_name in target_sheets:
            df = pd.read_excel(STUDENTS_FILE, sheet_name=sheet_name, engine='openpyxl')

            # Find class column
            class_col = None
            for col in df.columns:
                if 'class' in col.lower():
                    class_col = col
                    break
            if not class_col:
                continue

            # Filter by class
            class_df = df[df[class_col].astype(str).str.strip() == class_name.strip()]

            for _, row in class_df.iterrows():
                roll_no = None
                for col in df.columns:
                    if 'roll' in col.lower() or ('student' in col.lower() and 'id' in col.lower()):
                        roll_no = str(row[col]).strip()
                        break
                if not roll_no or roll_no == 'nan':
                    continue

                marks: Dict[str, float] = {}
                total_marks = 0.0
                for col in df.columns:
                    col_lower = col.lower()
                    if any(t in col_lower for t in ['assignment', 'quiz', 'exam', 'lab', 'mark', 'score', 'test']):
                        try:
                            val = float(row.get(col, 0) or 0)
                            marks[col] = val
                            total_marks += val
                        except (ValueError, TypeError):
                            pass

                if total_marks >= 200:
                    perf = "Excellent"
                elif total_marks >= 150:
                    perf = "Very Good"
                elif total_marks >= 100:
                    perf = "Good"
                elif total_marks >= 50:
                    perf = "Satisfactory"
                else:
                    perf = "Needs Improvement"

                if roll_no not in students_map:
                    students_map[roll_no] = {
                        "roll_no": roll_no,
                        "masked_roll_no": mask_roll_no(roll_no),
                        "class": class_name,
                        "courses": {}
                    }
                students_map[roll_no]["courses"][sheet_name] = {
                    "marks": marks,
                    "total_marks": round(total_marks, 2),
                    "performance_level": perf
                }

        students_list = sorted(students_map.values(), key=lambda x: x["roll_no"])
        return {"success": True, "students": students_list, "class": class_name}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/teacher/student/{roll_no}/marks")
async def update_student_marks(roll_no: str, request: UpdateMarksRequest):
    """Update marks for a specific student in a course (writes back to Excel)"""
    try:
        if not os.path.exists(STUDENTS_FILE):
            raise HTTPException(status_code=404, detail="Students file not found")

        xl = pd.ExcelFile(STUDENTS_FILE, engine='openpyxl')
        sheets_data: Dict[str, pd.DataFrame] = {}
        for sheet in xl.sheet_names:
            sheets_data[sheet] = pd.read_excel(STUDENTS_FILE, sheet_name=sheet, engine='openpyxl')

        if request.course not in sheets_data:
            raise HTTPException(status_code=404, detail=f"Course {request.course} not found")

        df = sheets_data[request.course]

        # Find student row index
        student_idx = None
        for col in df.columns:
            if 'roll' in col.lower() or ('student' in col.lower() and 'id' in col.lower()):
                mask = df[col].astype(str).str.strip() == str(roll_no).strip()
                matching = df[mask]
                if not matching.empty:
                    student_idx = matching.index[0]
                    break

        if student_idx is None:
            raise HTTPException(status_code=404, detail=f"Student {roll_no} not found in course {request.course}")

        # Update the marks
        for mark_name, mark_value in request.marks.items():
            if mark_name in df.columns:
                df.at[student_idx, mark_name] = mark_value
        sheets_data[request.course] = df

        # Write all sheets back
        with pd.ExcelWriter(STUDENTS_FILE, engine='openpyxl') as writer:
            for sheet, data in sheets_data.items():
                data.to_excel(writer, sheet_name=sheet, index=False)

        return {"success": True, "message": f"Marks updated for student {roll_no}"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/teacher/student/add")
async def add_new_student(request: AddStudentRequest):
    """Add a new student with marks to the relevant course sheets"""
    try:
        if not os.path.exists(STUDENTS_FILE):
            raise HTTPException(status_code=404, detail="Students file not found")

        roll_no = str(request.roll_no).strip()
        class_name = request.class_name.strip()
        dept = get_dept_from_class(class_name)

        # Load all sheets
        xl = pd.ExcelFile(STUDENTS_FILE, engine='openpyxl')
        sheets_data: Dict[str, pd.DataFrame] = {}
        for sheet in xl.sheet_names:
            sheets_data[sheet] = pd.read_excel(STUDENTS_FILE, sheet_name=sheet, engine='openpyxl')

        # Check roll_no does not already exist in the dept sheets
        dept_sheets = [s for s in xl.sheet_names if dept.upper() in s.upper()]
        for sheet in dept_sheets:
            df_check = sheets_data[sheet]
            for col in df_check.columns:
                if 'roll' in col.lower() or ('student' in col.lower() and 'id' in col.lower()):
                    if (df_check[col].astype(str).str.strip() == roll_no).any():
                        raise HTTPException(
                            status_code=409,
                            detail=f"Roll No {roll_no} already exists in {class_name}"
                        )
                    break

        # Add student row to the 302 sheet only for this department
        dept_302_sheets = [s for s in xl.sheet_names if dept.upper() in s.upper() and '302' in s]
        for course_id, marks in request.courses.items():
            if course_id not in sheets_data or course_id not in dept_302_sheets:
                continue
            df = sheets_data[course_id]
            new_row: Dict[str, object] = {}
            # Fill Student Id and Class
            for col in df.columns:
                if 'roll' in col.lower() or ('student' in col.lower() and 'id' in col.lower()):
                    new_row[col] = roll_no
                elif 'class' in col.lower():
                    new_row[col] = class_name
                else:
                    new_row[col] = marks.get(col, 0)
            sheets_data[course_id] = pd.concat(
                [df, pd.DataFrame([new_row])], ignore_index=True
            )

        # Write all sheets back
        with pd.ExcelWriter(STUDENTS_FILE, engine='openpyxl') as writer:
            for sheet, data in sheets_data.items():
                data.to_excel(writer, sheet_name=sheet, index=False)

        return {"success": True, "message": f"Student {roll_no} added to class {class_name}"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

# ==================== AI Counselor Chat Bot ====================

# Progress tracking for students
student_chat_sessions: Dict[str, Dict] = {}

def get_student_context(student_id: str) -> Dict:
    """Fetch student academic data to personalize counselor responses"""
    context = {"has_data": False}
    try:
        results = get_student_results(student_id) if student_id != "guest" else None
        if results:
            context["has_data"] = True
            context["courses"] = {}
            for course_id, data in results.items():
                context["courses"][course_id] = {
                    "performance_level": data.get("performance_level", "Unknown"),
                    "total_marks": data.get("total_marks", 0),
                    "recommendations": data.get("recommendations", [])
                }
            # Overall performance
            total = sum(c["total_marks"] for c in context["courses"].values())
            num_courses = len(context["courses"])
            context["avg_marks"] = round(total / num_courses, 1) if num_courses > 0 else 0
    except Exception:
        pass
    return context

def detect_emotional_state(message: str) -> Optional[str]:
    """Detect student's emotional state from message"""
    msg_lower = message.lower()
    
    sadness_words = ['sad', 'depressed', 'lonely', 'unhappy', 'cry', 'crying', 'hopeless', 'worthless', 'failure', 'failed', 'lost', 'empty', 'miserable']
    stress_words = ['stress', 'anxiety', 'anxious', 'pressure', 'overwhelm', 'overwhelmed', 'panic', 'burnout', 'exhausted', 'cant sleep', "can't sleep", 'insomnia', 'too much']
    frustration_words = ['frustrated', 'angry', 'annoyed', 'irritated', 'upset', 'hate', 'stupid', 'dumb', 'useless', 'pointless', 'unfair']
    fear_words = ['scared', 'afraid', 'fear', 'terrified', 'nervous', 'worried', 'worry', 'dreading']
    loneliness_words = ['alone', 'no friends', 'nobody', 'isolated', 'left out', 'ignored', 'invisible']
    motivation_words = ['unmotivated', 'lazy', 'procrastinat', 'dont care', "don't care", 'give up', 'quit', 'whats the point', "what's the point", 'no motivation', 'cant focus', "can't focus"]
    positive_words = ['happy', 'excited', 'proud', 'achieved', 'did it', 'passed', 'improved', 'better', 'great', 'awesome', 'confident', 'good news']
    
    if any(w in msg_lower for w in positive_words):
        return 'positive'
    if any(w in msg_lower for w in sadness_words):
        return 'sad'
    if any(w in msg_lower for w in stress_words):
        return 'stressed'
    if any(w in msg_lower for w in frustration_words):
        return 'frustrated'
    if any(w in msg_lower for w in fear_words):
        return 'fearful'
    if any(w in msg_lower for w in loneliness_words):
        return 'lonely'
    if any(w in msg_lower for w in motivation_words):
        return 'unmotivated'
    
    return None

def get_encouragement(student_id: str, emotion: Optional[str]) -> str:
    """Generate progress-based encouragement"""
    session = student_chat_sessions.get(student_id, {})
    msg_count = session.get("message_count", 0)
    
    encouragements = [
        "Remember: every question you ask is a step forward.",
        "You're building momentum — keep going!",
        "The fact that you're here shows you care about your growth.",
        "Small steps lead to big achievements. You're on the right track.",
        "Progress isn't always visible, but it's always happening when you put in effort.",
        "You've already taken the hardest step — asking for help.",
        "Each challenge you face makes you stronger. You've got this!",
        "Your dedication to improvement is already a sign of success.",
    ]
    
    if emotion == 'positive':
        return "Keep riding this positive wave! Your hard work is paying off!"
    
    import random
    return random.choice(encouragements)

def generate_counselor_response(message: str, emotion: Optional[str], student_context: Dict, student_id: str) -> tuple:
    """Generate comprehensive counselor response with academic + emotional support"""
    import random
    msg_lower = message.lower()
    
    response_parts = []
    suggested_actions = []
    
    # --- EMOTIONAL SUPPORT (Priority) ---
    if emotion:
        emotional_responses = {
            'sad': [
                "I hear you, and it's completely okay to feel this way. Everyone goes through tough times — what matters is that you're reaching out. Let's work through this together.",
                "Feeling down is a natural part of growth. You're not alone in this, and things will get better. Tell me more about what's going on — I'm here to listen.",
                "It takes real courage to share how you feel. Let's figure out what's weighing on you and find a path forward, one step at a time."
            ],
            'stressed': [
                "I understand the pressure feels overwhelming right now. Let's take this one piece at a time. You don't have to tackle everything at once.",
                "Stress means you care about doing well — that's a strength. But let's find a way to manage it so it works FOR you, not against you.",
                "Take a deep breath. You've handled challenges before, and you'll handle this one too. Let's break things down into smaller, doable steps."
            ],
            'frustrated': [
                "Frustration actually means you're pushing your limits — that's how growth happens. Let's find a different angle to approach this.",
                "I get it — it's annoying when things don't click. But every expert was once a frustrated beginner. Let's try a fresh approach together.",
                "Your frustration shows you have high standards for yourself. That's admirable. Let me help you find a way past this block."
            ],
            'fearful': [
                "It's okay to feel nervous — that means you're stepping outside your comfort zone, which is where growth happens.",
                "Fear is a natural response, but don't let it hold you back. You're more prepared than you think. Let's talk about what's worrying you.",
                "Many successful people felt exactly the way you do before their breakthrough. Let's channel this feeling into preparation."
            ],
            'lonely': [
                "I'm glad you reached out — you're not as alone as you feel right now. Connecting with study groups or classmates can make a huge difference.",
                "Feeling isolated is tough, but remember — this is a shared experience for many students. You belong here, and your voice matters.",
                "Let's find ways to connect you with peers. Sometimes just one good study buddy can change everything."
            ],
            'unmotivated': [
                "Motivation comes and goes — that's normal. What matters is showing up even when it's hard. And you showed up today by reaching out!",
                "Let's find what excites you about learning. When we connect your studies to something you actually care about, motivation follows naturally.",
                "Don't wait for motivation to start — start, and motivation will catch up. Let's pick one small thing you can do right now."
            ],
            'positive': [
                "That's amazing! You should be really proud of yourself. This positive momentum will carry you far!",
                "YES! This is what progress looks like! Your hard work is clearly paying off — keep building on this!",
                "Fantastic! Remember this feeling — it's proof that your efforts are worthwhile. What's next on your goals list?"
            ]
        }
        
        response_parts.append(random.choice(emotional_responses.get(emotion, ["I'm here for you. Tell me what's on your mind."])))
        
        if emotion in ['sad', 'stressed', 'frustrated', 'fearful']:
            suggested_actions.append("Try a 5-minute breathing exercise to reset your mind")
            suggested_actions.append("Write down 3 things you've accomplished this week")
        if emotion == 'lonely':
            suggested_actions.append("Join or form a study group for your courses")
            suggested_actions.append("Visit your professor during office hours")
        if emotion == 'unmotivated':
            suggested_actions.append("Set a tiny goal for today — just 15 minutes of focused study")
            suggested_actions.append("Reward yourself after each study session")
    
    # --- ACADEMIC SUPPORT ---
    academic_handled = False
    
    if any(w in msg_lower for w in ['marks', 'score', 'grade', 'result', 'performance', 'how am i doing', 'how did i do']):
        if student_context.get("has_data"):
            context_info = []
            for course_id, cdata in student_context["courses"].items():
                context_info.append(f"**{course_id}**: {cdata['performance_level']} (Total: {cdata['total_marks']})")
            response_parts.append(f"Here's your academic snapshot:\n" + "\n".join(context_info))
            response_parts.append(f"\nYour average across courses: **{student_context['avg_marks']}** marks. {'Great job!' if student_context['avg_marks'] > 150 else 'There is room for improvement — let me help.'}")
            suggested_actions.append("Check your Dashboard for detailed marks breakdown")
            suggested_actions.append("Visit AI Recommendations for personalized strategies")
        else:
            response_parts.append("I'd love to check your performance! Please log in with your student email so I can access your academic data.")
        academic_handled = True
    
    if any(w in msg_lower for w in ['study', 'study plan', 'schedule', 'timetable', 'how to study', 'study tips', 'study method']):
        response_parts.append("Here's a proven study approach that works for most students:\n\n"
            "1. **Pomodoro Technique**: 25 min focused study → 5 min break → repeat\n"
            "2. **Active Recall**: Test yourself instead of re-reading\n"
            "3. **Spaced Repetition**: Review material at increasing intervals\n"
            "4. **Teach Someone**: Explaining concepts solidifies your understanding\n"
            "5. **Start with the hardest topic** when your energy is highest")
        suggested_actions.append("Create a weekly study schedule")
        suggested_actions.append("Try the Pomodoro technique in your next study session")
        academic_handled = True
    
    if any(w in msg_lower for w in ['math', 'calculus', 'algebra', 'geometry', 'equation', 'formula', 'number']):
        response_parts.append("Math can feel daunting, but it's all about building understanding step by step. What specific topic or problem are you working on? I can help break it down!")
        suggested_actions.append("Practice 3-5 problems daily to build confidence")
        suggested_actions.append("Watch visual explanations on YouTube/Khan Academy")
        academic_handled = True
    
    if any(w in msg_lower for w in ['code', 'program', 'python', 'java', 'javascript', 'debug', 'error', 'syntax', 'compile']):
        response_parts.append("Programming challenges are where you learn the most! What language are you working with, and what's the specific issue? Share the problem and I'll help you think through it.")
        suggested_actions.append("Break the problem into smaller functions")
        suggested_actions.append("Use print/console.log statements to trace your logic")
        academic_handled = True
    
    if any(w in msg_lower for w in ['exam', 'test', 'quiz', 'prepare', 'revision', 'midterm', 'final']):
        response_parts.append("Exam prep is all about strategy! Here's what works:\n\n"
            "1. **Start early** — don't cram the night before\n"
            "2. **Practice past papers** — they're the best predictor of real exams\n"
            "3. **Focus on weak areas** — check your marks breakdown in the Dashboard\n"
            "4. **Get enough sleep** — your brain consolidates learning during sleep\n"
            "5. **Stay hydrated and eat well** on exam day")
        suggested_actions.append("Review your lowest-scoring assessments first")
        suggested_actions.append("Do at least one practice test under timed conditions")
        academic_handled = True
    
    if any(w in msg_lower for w in ['recommend', 'suggestion', 'improve', 'better', 'strategy', 'strategies']):
        if student_context.get("has_data"):
            all_recs = []
            for cdata in student_context["courses"].values():
                all_recs.extend(cdata.get("recommendations", []))
            if all_recs:
                unique_recs = list(dict.fromkeys(all_recs))[:5]
                response_parts.append("Based on your academic data, here are your personalized strategies:\n\n" + "\n".join(f"• {r}" for r in unique_recs))
            else:
                response_parts.append("Your performance is strong! Keep up the great work. Visit the AI Recommendations page for more detailed insights.")
        else:
            response_parts.append("For personalized recommendations, make sure you're logged in. I can give you general strategies in the meantime!")
        suggested_actions.append("Visit the AI Recommendations page for detailed strategies")
        academic_handled = True
    
    if any(w in msg_lower for w in ['understand', 'explain', 'confused', 'difficult', 'hard', 'dont get', "don't get", 'make sense']):
        response_parts.append("No worries — confusion is the first step to understanding! Tell me the specific topic or concept, and I'll break it down into simple terms.")
        suggested_actions.append("Write down what you DO understand, then identify the gap")
        academic_handled = True
    
    if any(w in msg_lower for w in ['time management', 'too busy', 'no time', 'balance', 'work life']):
        response_parts.append("Balancing everything is one of the hardest parts of being a student. Here are some tips:\n\n"
            "1. **Prioritize**: Use the Eisenhower Matrix (urgent vs important)\n"
            "2. **Block your time**: Dedicate specific hours to studying\n"
            "3. **Say no**: It's okay to decline non-essential commitments\n"
            "4. **Use dead time**: Commute, waiting rooms — review flashcards\n"
            "5. **Take care of yourself first** — you can't pour from an empty cup")
        suggested_actions.append("Try time-blocking your next week")
        suggested_actions.append("Identify your top 3 priorities for this week")
        academic_handled = True
    
    # Greetings
    if any(w in msg_lower for w in ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon']):
        greetings = [
            "Hello! I'm your AI academic counselor. I'm here to help you with studies, strategies, and anything that's on your mind. How are you doing today?",
            "Hey there! Welcome! Whether it's academics, study tips, or just needing someone to talk to — I'm here for you. What's on your mind?",
            "Hi! Great to see you. I can help with your coursework, study strategies, exam prep, or just be a supportive ear. What would you like to discuss?"
        ]
        response_parts.insert(0, random.choice(greetings))
        academic_handled = True
    
    if any(w in msg_lower for w in ['thank', 'thanks', 'thx', 'appreciate']):
        response_parts.append("You're welcome! Remember, asking for help is a sign of strength. I'm always here whenever you need support. Keep up the great work!")
        academic_handled = True
    
    if any(w in msg_lower for w in ['who are you', 'what are you', 'what can you do', 'help me', 'what do you do']):
        response_parts.append("I'm your **AI Academic Counselor** — think of me as your personal study buddy and support system! I can help with:\n\n"
            "📚 **Academic Support**: Study tips, exam strategies, course recommendations\n"
            "💡 **Performance Insights**: I can analyze your marks and suggest improvements\n"
            "🧠 **Mental Wellness**: Stress management, motivation, and emotional support\n"
            "📋 **Study Planning**: Time management and study techniques\n\n"
            "Just chat with me about anything — I'm here to help you succeed!")
        academic_handled = True
    
    # Default fallback
    if not response_parts:
        defaults = [
            "I'm here to help you with anything academic or personal. You can ask me about your marks, study strategies, exam prep, or just talk about how you're feeling.",
            "Tell me more! I can help with study tips, performance analysis, exam preparation, or just provide support. What's on your mind?",
            "I'm your academic counselor — feel free to ask about study methods, your performance, exam strategies, or anything that's on your mind!"
        ]
        response_parts.append(random.choice(defaults))
    
    if not suggested_actions:
        suggested_actions = ["Check your Dashboard for performance overview", "Explore AI Recommendations for study strategies"]
    
    return "\n\n".join(response_parts), suggested_actions

# Generate or load encryption key (kept for any future use, not applied to chat)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())

# Add Groq API key to environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI Academic Counselor endpoint
    Provides personalized academic help, study strategies, and emotional support
    Makes the student feel like they're making progress
    """
    try:
        message = request.message.strip()
        student_id = request.student_id or "guest"
        
        if not message:
            return ChatResponse(
                response="Hey! I'm your academic counselor. What would you like to talk about today?",
                encouragement="Every conversation is a step toward your goals!"
            )
        
        # Track session for progress awareness
        if student_id not in student_chat_sessions:
            student_chat_sessions[student_id] = {"message_count": 0, "topics_discussed": []}
        student_chat_sessions[student_id]["message_count"] += 1
        
        # Detect emotion
        emotion = detect_emotional_state(message)
        
        # Get student academic context
        student_context = get_student_context(student_id)
        
        # Generate counselor response
        response_text, suggested_actions = generate_counselor_response(message, emotion, student_context, student_id)
        
        # Generate encouragement
        encouragement = get_encouragement(student_id, emotion)

        return ChatResponse(
            response=response_text,
            detected_emotion=emotion,
            encouragement=encouragement,
            suggested_actions=suggested_actions
        )
    
    except Exception as e:
        print(f"Chat error: {e}")
        return ChatResponse(
            response="I'm here to help! Tell me what's on your mind — whether it's academics, study strategies, or just how you're feeling.",
            encouragement="Taking the first step always matters most."
        )

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint - integrates with Groq API to fetch data and generate responses.
    """
    try:
        # Extract student data
        student_id = request.student_id or "guest"
        student_data = None

        if student_id != "guest":
            validation = validate_student(student_id)
            if validation["success"]:
                student_data = validation["data"]

        # Call Groq API
        groq_query = {
            "query": "query { studentData(id: \"%s\") { name, performance, recommendations } }" % student_id
        }
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        groq_response = requests.post("https://api.groq.com/graphql", json=groq_query, headers=headers)

        if groq_response.status_code != 200:
            raise HTTPException(status_code=groq_response.status_code, detail="Groq API error")

        groq_data = groq_response.json()
        student_info = groq_data.get("data", {}).get("studentData", {})

        # Generate AI response
        response_text = f"Hello, {student_info.get('name', 'Student')}!\n\n"
        response_text += f"Performance: {student_info.get('performance', 'Unknown')}\n"
        response_text += f"Recommendations: {', '.join(student_info.get('recommendations', []))}"

        # Encrypt the response
        encrypted_response = fernet.encrypt(response_text.encode()).decode()

        return ChatResponse(
            response=encrypted_response,
            detected_emotion="neutral",
            encouragement="Keep up the good work!",
            suggested_actions=["Review your recent results", "Focus on weak areas"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
