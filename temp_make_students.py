import pandas as pd

cy1 = pd.DataFrame([{
    'Student Id': 22001,
    'Class': 'CSE A',
    'Student Name': 'Student One',
    'Assignment 1': 8,
    'Assignment 2': 9,
    'Quiz 1': 6,
    'Quiz 2': 7,
    'Mid Lab Exam': 18,
    'Mid Exam': 22,
    'Final Exam': 25
}])
cy2 = pd.DataFrame([{
    'Student Id': 22001,
    'Class': 'CSE A',
    'Student Name': 'Student One',
    'Assignment 1': 9,
    'Assignment 2': 8,
    'Quiz 1': 7,
    'Quiz 2': 8,
    'Quiz 3': 8,
    'Mid Lab Exam': 19,
    'Mid Exam': 24,
    'Final Exam': 26
}])
with pd.ExcelWriter('Students.xlsx', engine='openpyxl') as writer:
    cy1.to_excel(writer, sheet_name='19CSE301', index=False)
    cy2.to_excel(writer, sheet_name='19CSE302', index=False)
print('Students.xlsx written with sample student 22001 in both sheets')
