#!/usr/bin/env python3
"""
ML Model Training Utility
This script trains ML models for all courses using the MLkNN algorithm
with strategies from Courses.xlsx as recommendation labels.

Usage: python train_models.py [course_id] (optional)
"""

import os
import sys
import pandas as pd
from tabulate import tabulate

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import mlcode
except ImportError as e:
    print(f"Error: Could not import mlcode: {e}")
    print("Make sure mlcode.py is in the same directory")
    sys.exit(1)

def get_courses():
    """Get list of available courses from Courses.xlsx"""
    try:
        courses_file = "Courses.xlsx"
        if not os.path.exists(courses_file):
            print(f"Error: {courses_file} not found")
            return []
        
        excel_file = pd.ExcelFile(courses_file)
        return excel_file.sheet_names
    except Exception as e:
        print(f"Error reading Courses.xlsx: {e}")
        return []

def verify_course_structure(course_id):
    """Verify that course has required Assessments and Strategies columns"""
    try:
        df = pd.read_excel("Courses.xlsx", sheet_name=course_id)
        
        required_cols = ['Assessments', 'Strategies', 'Total Marks', 'Converted Marks']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            print(f"  ⚠ Warning: Course missing columns: {missing_cols}")
            return False
        
        assessments = list(df['Assessments'].dropna())
        strategies = list(df['Strategies'].dropna())
        
        print(f"  • Assessments: {assessments}")
        print(f"  • Strategies: {strategies}")
        
        return True
    except Exception as e:
        print(f"  ✗ Error verifying course structure: {e}")
        return False

def train_course_model(course_id):
    """Train ML model for a specific course"""
    print(f"\n{'='*60}")
    print(f"Training Models for Course: {course_id}")
    print(f"{'='*60}")
    
    try:
        # Step 1: Verify course structure
        print(f"\n[1/3] Verifying course structure...")
        if not verify_course_structure(course_id):
            print(f"  Skipping training for {course_id} due to missing columns")
            return False
        
        # Step 2: Generate training data
        print(f"\n[2/3] Generating synthetic training data...")
        mlcode.generate_data(course_id)
        print(f"  ✓ Training data generated successfully")
        
        # Step 3: Train ML model
        print(f"\n[3/3] Training MLkNN model (k=30)...")
        mlcode.training_data(course_id)
        print(f"  ✓ Model trained and saved")
        
        # Step 4: Preprocess student data
        print(f"\n[4/4] Preprocessing student marks...")
        mlcode.dataprep(course_id)
        print(f"  ✓ Student data preprocessed")
        
        print(f"\n✓ Successfully trained models for {course_id}")
        return True
        
    except Exception as e:
        print(f"\n✗ Error training model for {course_id}:")
        print(f"  {e}")
        return False

def main():
    """Main execution"""
    courses = get_courses()
    
    if not courses:
        print("No courses found. Make sure Courses.xlsx exists with course sheets.")
        sys.exit(1)
    
    print(f"Found {len(courses)} courses: {courses}")
    
    # Check if specific course requested
    if len(sys.argv) > 1:
        course_id = sys.argv[1]
        if course_id not in courses:
            print(f"Error: Course '{course_id}' not found in Courses.xlsx")
            print(f"Available courses: {courses}")
            sys.exit(1)
        courses = [course_id]
    
    # Train models
    results = []
    for course_id in courses:
        success = train_course_model(course_id)
        
        # Check if models were created
        model_file = f"{course_id}_dataset_model.joblib"
        mlb_file = f"{course_id}_dataset_mlb.joblib"
        
        results.append({
            'Course': course_id,
            'Status': '✓ Success' if success else '✗ Failed',
            'Model': '✓' if os.path.exists(model_file) else '✗',
            'MLB': '✓' if os.path.exists(mlb_file) else '✗'
        })
    
    # Print summary
    print(f"\n\n{'='*60}")
    print("TRAINING SUMMARY")
    print(f"{'='*60}")
    print(tabulate(results, headers='keys', tablefmt='grid'))
    
    # Print next steps
    print(f"\n{'='*60}")
    print("NEXT STEPS:")
    print(f"{'='*60}")
    print("1. The ML models are now trained and ready to generate recommendations")
    print("2. Start the backend: python backend/app.py")
    print("3. The recommendations will now be generated using MLkNN with strategies")
    print("4. Each student will get personalized strategies based on their performance")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        sys.exit(1)
