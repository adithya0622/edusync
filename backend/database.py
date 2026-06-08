import os
import pandas as pd
from typing import Optional, Dict, List, Any
from supabase import create_client, Client

_supabase: Optional[Client] = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL", "https://tgqqlufysbuhipnjkbkh.supabase.co")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not key:
            key = os.getenv("SUPABASE_ANON_KEY", "")
        _supabase = create_client(url, key)
    return _supabase

# ── Courses ──────────────────────────────────────────────────────

def upsert_course(course_code: str, department: str, has_converted_marks: bool = False):
    sb = get_supabase()
    sb.table("courses").upsert({
        "course_code": course_code,
        "department": department,
        "has_converted_marks": has_converted_marks,
    }).execute()

def get_all_course_codes() -> List[str]:
    sb = get_supabase()
    data = sb.table("courses").select("course_code").execute()
    return [r["course_code"] for r in data.data]

def course_exists(course_code: str) -> bool:
    sb = get_supabase()
    data = sb.table("courses").select("course_code").eq("course_code", course_code).execute()
    return len(data.data) > 0

def get_department_sheets(dept: str) -> List[str]:
    sb = get_supabase()
    data = sb.table("courses").select("course_code").execute()
    return [r["course_code"] for r in data.data if dept.upper() in r["course_code"].upper()]

# ── Assessments ──────────────────────────────────────────────────

def upsert_assessment(course_code: str, name: str, total_marks: float,
                       converted_marks: float = None, curriculum: str = None,
                       strategies: str = None):
    sb = get_supabase()
    sb.table("assessments").upsert({
        "course_code": course_code,
        "name": name,
        "total_marks": total_marks,
        "converted_marks": converted_marks,
        "curriculum": curriculum,
        "strategies": strategies,
    }, on_conflict="course_code,name").execute()

def get_assessments_df(course_code: str) -> pd.DataFrame:
    sb = get_supabase()
    data = sb.table("assessments").select("*").eq("course_code", course_code).order("id").execute()
    return pd.DataFrame(data.data) if data.data else pd.DataFrame()

def get_all_assessments_dict() -> Dict[str, pd.DataFrame]:
    sb = get_supabase()
    data = sb.table("assessments").select("*").order("id").execute()
    if not data.data:
        return {}
    df = pd.DataFrame(data.data)
    return {code: df[df["course_code"] == code].copy() for code in df["course_code"].unique()}

def update_curriculum_db(course_code: str, assessment: str, new_curriculum: str):
    sb = get_supabase()
    sb.table("assessments").update({"curriculum": new_curriculum}).eq("course_code", course_code).eq("name", assessment).execute()

def assessment_exists(course_code: str, name: str) -> bool:
    sb = get_supabase()
    data = sb.table("assessments").select("id").eq("course_code", course_code).eq("name", name).execute()
    return len(data.data) > 0

# ── Student Results ──────────────────────────────────────────────

def upsert_student_result(student_id: str, cls: str, course_code: str,
                           marks: Dict[str, float], assessments_completed: int = 0,
                           student_name: str = ""):
    sb = get_supabase()
    data = {
        "student_id": student_id,
        "class": cls,
        "course_code": course_code,
        "marks": marks,
        "assessments_completed": assessments_completed,
    }
    if student_name:
        data["student_name"] = student_name
    sb.table("student_results").upsert(data, on_conflict="student_id,course_code").execute()

def get_student_sheet(course_code: str) -> pd.DataFrame:
    sb = get_supabase()
    data = sb.table("student_results").select("*").eq("course_code", course_code).execute()
    if not data.data:
        return pd.DataFrame()
    rows = []
    for r in data.data:
        row = {"Student Id": r["student_id"], "Class": r["class"], "Assessments Completed": r["assessments_completed"]}
        marks = r.get("marks", {})
        for k, v in marks.items():
            row[k] = v
        rows.append(row)
    return pd.DataFrame(rows)

def get_all_student_sheets() -> Dict[str, pd.DataFrame]:
    sb = get_supabase()
    data = sb.table("student_results").select("*").execute()
    if not data.data:
        return {}
    grouped: Dict[str, list] = {}
    for r in data.data:
        code = r["course_code"]
        if code not in grouped:
            grouped[code] = []
        row = {"Student Id": r["student_id"], "Class": r["class"], "Assessments Completed": r["assessments_completed"]}
        marks = r.get("marks", {})
        for k, v in marks.items():
            row[k] = v
        grouped[code].append(row)
    return {code: pd.DataFrame(rows) for code, rows in grouped.items()}

def find_student_db(student_id: str, class_name: str = None) -> Optional[Dict]:
    sb = get_supabase()
    q = sb.table("student_results").select("*").eq("student_id", student_id)
    if class_name:
        q = q.eq("class", class_name)
    data = q.execute()
    if data.data:
        r = data.data[0]
        row = {"Student Id": r["student_id"], "Class": r["class"], "Assessments Completed": r["assessments_completed"]}
        marks = r.get("marks", {})
        for k, v in marks.items():
            row[k] = v
        return {"success": True, "data": row}
    return {"success": False, "data": None}

def get_student_results_raw(student_id: str, class_name: str = None) -> List[Dict]:
    sb = get_supabase()
    q = sb.table("student_results").select("*").eq("student_id", student_id)
    if class_name:
        q = q.eq("class", class_name)
    data = q.execute()
    return data.data if data.data else []

def get_all_students_flat() -> List[Dict[str, Any]]:
    sb = get_supabase()
    data = sb.table("student_results").select("*").execute()
    return data.data if data.data else []

# ── Write Operations ─────────────────────────────────────────────

def update_student_marks_db(student_id: str, course_code: str, new_marks: Dict[str, float]):
    sb = get_supabase()
    existing = sb.table("student_results").select("marks").eq("student_id", student_id).eq("course_code", course_code).execute()
    if not existing.data:
        return
    marks = dict(existing.data[0].get("marks", {}))
    marks.update(new_marks)
    sb.table("student_results").update({"marks": marks}).eq("student_id", student_id).eq("course_code", course_code).execute()

def add_student_db(student_id: str, class_name: str, course_code: str, marks: Dict[str, float]):
    sb = get_supabase()
    sb.table("student_results").insert({
        "student_id": student_id,
        "class": class_name,
        "course_code": course_code,
        "marks": marks,
        "assessments_completed": 0,
    }).execute()

def delete_student_db(student_id: str, class_name: str, course_codes: List[str]):
    sb = get_supabase()
    for code in course_codes:
        sb.table("student_results").delete().eq("student_id", student_id).eq("course_code", code).execute()

def update_assessments_completed_db(student_id: str, course_code: str, count: int):
    sb = get_supabase()
    sb.table("student_results").update({"assessments_completed": count}).eq("student_id", student_id).eq("course_code", course_code).execute()

def student_exists_in_course(student_id: str, course_code: str) -> bool:
    sb = get_supabase()
    data = sb.table("student_results").select("id").eq("student_id", student_id).eq("course_code", course_code).execute()
    return len(data.data) > 0

# ── Analytics ────────────────────────────────────────────────────

def get_student_name_map() -> Dict[str, str]:
    sb = get_supabase()
    data = sb.table("student_results").select("student_id, student_name").execute()
    name_map = {}
    for r in data.data or []:
        sid = str(r.get("student_id", "")).strip().upper().replace(".0", "")
        name_map[sid] = str(r.get("student_name", "")).strip()
    return name_map

def get_all_student_totals(class_name: str = None) -> Dict[str, float]:
    sb = get_supabase()
    query = sb.table("student_results").select("student_id, marks")
    if class_name:
        query = query.eq("class", class_name)
    data = query.execute()
    totals = {}
    for r in data.data or []:
        sid = r["student_id"]
        marks = r.get("marks", {})
        total = sum(float(v) for v in marks.values() if v is not None)
        totals[sid] = totals.get(sid, 0) + total
    return totals

def get_class_students_df(class_name: str) -> pd.DataFrame:
    sb = get_supabase()
    data = sb.table("student_results").select("*").eq("class", class_name).execute()
    if not data.data:
        return pd.DataFrame()
    rows = []
    for r in data.data:
        row = {"Student Id": r["student_id"], "Class": r["class"], "Assessments Completed": r["assessments_completed"], "course_code": r["course_code"]}
        marks = r.get("marks", {})
        for k, v in marks.items():
            row[k] = v
        rows.append(row)
    return pd.DataFrame(rows)
