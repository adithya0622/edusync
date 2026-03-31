import pandas as pd

sheets = ['19CSE301', '19CSE302', '19IT301', '19IT302', '19ADS301', '19ADS302', '19AIML301', '19AIML302']

print("=== ALL SHEETS - classes and mark columns ===")
for sheet in sheets:
    df = pd.read_excel('backend/Students.xlsx', sheet_name=sheet)
    classes = df['Class'].unique().tolist()
    mark_cols = [c for c in df.columns if c not in ['Student Id', 'Class']]
    print(f"{sheet}: classes={classes}")
    print(f"  marks: {mark_cols}")

print()
print("=== COURSES - all assessments with curriculum ===")
for sheet in sheets:
    df = pd.read_excel('backend/Courses.xlsx', sheet_name=sheet)
    print(f"--- {sheet} (cols: {df.columns.tolist()}) ---")
    if 'Curriculum' in df.columns:
        for _, r in df.iterrows():
            print(f"  {r['Assessments']}: {str(r['Curriculum'])[:150]}")
    print()
