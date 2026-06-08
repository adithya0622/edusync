import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database as ds

base = os.path.dirname(os.path.abspath(__file__))
STUDENTS_FILE = os.path.join(base, "Students.xlsx")
COURSES_FILE = os.path.join(base, "Courses.xlsx")

def get_dept(code: str) -> str:
    parts = code.replace("19", "").split("3")
    return parts[0] if parts else ""

def import_courses():
    import pandas as pd
    xl = pd.ExcelFile(COURSES_FILE)
    for sheet in xl.sheet_names:
        dept = get_dept(sheet)
        df = pd.read_excel(COURSES_FILE, sheet_name=sheet, engine='openpyxl')
        has_cm = 'Converted Marks' in df.columns
        ds.upsert_course(sheet, dept, has_cm)
        for _, row in df.iterrows():
            if pd.isna(row.get('Assessments')):
                continue
            ds.upsert_assessment(
                course_code=sheet,
                name=str(row['Assessments']).strip(),
                total_marks=float(row['Total Marks']) if pd.notna(row.get('Total Marks')) else 0,
                converted_marks=float(row['Converted Marks']) if has_cm and pd.notna(row.get('Converted Marks')) else None,
                curriculum=str(row['Curriculum']).strip() if 'Curriculum' in df.columns and pd.notna(row.get('Curriculum')) else None,
                strategies=str(row['Strategies']).strip() if 'Strategies' in df.columns and pd.notna(row.get('Strategies')) else None,
            )
    print(f"Imported {len(xl.sheet_names)} courses with assessments")

def import_students():
    import pandas as pd
    xl = pd.ExcelFile(STUDENTS_FILE)
    total = 0
    for sheet in xl.sheet_names:
        df = pd.read_excel(STUDENTS_FILE, sheet_name=sheet, engine='openpyxl')
        cols = [c for c in df.columns if c not in ('Student Id', 'Class', 'Assessments Completed')]
        for _, row in df.iterrows():
            sid = str(row['Student Id']).strip() if pd.notna(row.get('Student Id')) else None
            cls = str(row['Class']).strip() if pd.notna(row.get('Class')) else None
            if not sid or not cls:
                continue
            name = str(row['Student Name']).strip() if pd.notna(row.get('Student Name')) else ''
            marks = {}
            ac = 0
            for c in cols:
                v = row.get(c)
                if v is not None and not (isinstance(v, float) and pd.isna(v)):
                    try:
                        marks[c] = float(v)
                    except (ValueError, TypeError):
                        marks[c] = 0
                else:
                    marks[c] = 0
            if 'Assessments Completed' in df.columns:
                try:
                    ac = int(float(row['Assessments Completed'] or 0))
                except (ValueError, TypeError):
                    ac = 0
            ds.upsert_student_result(sid, cls, sheet, marks, ac, name)
            total += 1
    print(f"Imported {total} student results across {len(xl.sheet_names)} courses")

if __name__ == "__main__":
    print("Starting Supabase migration...")
    import_courses()
    try:
        import_students()
        print("Migration complete!")
    except Exception as e:
        print(f"Student import failed: {e}")
        print("Trying without student_name column (schema may not have it yet)...")
        # Retry without student_name
        import pandas as pd
        xl = pd.ExcelFile(STUDENTS_FILE)
        total = 0
        for sheet in xl.sheet_names:
            df = pd.read_excel(STUDENTS_FILE, sheet_name=sheet, engine='openpyxl')
            cols = [c for c in df.columns if c not in ('Student Id', 'Class', 'Assessments Completed')]
            for _, row in df.iterrows():
                sid = str(row['Student Id']).strip() if pd.notna(row.get('Student Id')) else None
                cls = str(row['Class']).strip() if pd.notna(row.get('Class')) else None
                if not sid or not cls:
                    continue
                marks = {}
                ac = 0
                for c in cols:
                    v = row.get(c)
                    if v is not None and not (isinstance(v, float) and pd.isna(v)):
                        try:
                            marks[c] = float(v)
                        except: marks[c] = 0
                    else:
                        marks[c] = 0
                if 'Assessments Completed' in df.columns:
                    try:
                        ac = int(float(row['Assessments Completed'] or 0))
                    except: ac = 0
                ds.upsert_student_result(sid, cls, sheet, marks, ac)
                total += 1
        print(f"Imported {total} student results (fallback mode)")
        print("Migration complete!")
