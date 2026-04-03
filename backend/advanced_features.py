"""
Advanced hackathon features for EdSync:
- Gamification & Leaderboards
- Mental Health & Burnout Detection
- AI Chatbot
- Peer Matching & Study Groups
- Predictive Performance Forecasting
"""

import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import numpy as np
from pydantic import BaseModel, Field
import pandas as pd
from collections import defaultdict

# ==================== MODELS FOR NEW FEATURES ====================

class Achievement(BaseModel):
    """Achievement/Badge earned by student"""
    id: str
    name: str
    description: str
    icon: str
    earned_date: str
    category: str  # "improvement", "consistency", "mastery", "social"

class StudentScore(BaseModel):
    """Gamification score tracking"""
    student_id: str
    total_points: int = 0
    streak_days: int = 0
    achievements: List[Achievement] = []
    level: int = 1
    rank: int = 0

class WellnessMetrics(BaseModel):
    """Mental health and wellness tracking"""
    student_id: str
    stress_level: int = Field(default=3, ge=1, le=10)  # 1-10 scale
    study_hours_weekly: float = 0
    sleep_hours_daily: float = 7
    last_updated: str
    performance_trend: str = "stable"  # improving, stable, declining
    burnout_risk: float = 0.0  # 0-1 probability
    wellness_score: int = 75  # 0-100

class ChatMessage(BaseModel):
    """Chat message for AI study buddy"""
    sender: str  # "user" or "assistant"
    message: str
    timestamp: str
    emotion: Optional[str] = None

class StudyGroup(BaseModel):
    """Peer study group matching"""
    group_id: str
    members: List[str]
    created_date: str
    topics: List[str]
    meetings: int = 0

class GamificationStore:
    """In-memory store for gamification data with JSON persistence"""
    
    def __init__(self, base_dir: str = "data"):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)
        self.scores_file = os.path.join(base_dir, "gamification_scores.json")
        self.achievements_file = os.path.join(base_dir, "achievements.json")
        self.load_data()

    def load_data(self):
        """Load data from JSON files"""
        self.scores = self._load_json(self.scores_file, {})
        self.achievements_db = self._load_json(self.achievements_file, {})

    def save_data(self):
        """Save data to JSON files"""
        self._save_json(self.scores_file, self.scores)
        self._save_json(self.achievements_file, self.achievements_db)

    @staticmethod
    def _load_json(filepath: str, default):
        """Safe JSON loading"""
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    return json.load(f)
        except Exception:
            pass
        return default

    @staticmethod
    def _save_json(filepath: str, data):
        """Safe JSON saving"""
        try:
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving JSON: {e}")

    def add_points(self, student_id: str, points: int, reason: str = "general"):
        """Add points to student"""
        student_id = str(student_id)
        if student_id not in self.scores:
            self.scores[student_id] = {"total_points": 0, "streak_days": 0, "level": 1}
        
        self.scores[student_id]["total_points"] += points
        self.scores[student_id]["last_activity"] = datetime.now().isoformat()
        self.save_data()
        return self.scores[student_id]["total_points"]

    def award_achievement(self, student_id: str, achievement_id: str, name: str, description: str):
        """Award an achievement/badge"""
        student_id = str(student_id)
        if student_id not in self.achievements_db:
            self.achievements_db[student_id] = []
        
        achievement = {
            "id": achievement_id,
            "name": name,
            "description": description,
            "earned_date": datetime.now().isoformat(),
            "category": "achievement"
        }
        self.achievements_db[student_id].append(achievement)
        self.save_data()
        return achievement

    def get_leaderboard(self, limit: int = 10) -> List[Dict]:
        """Get top students by points"""
        sorted_students = sorted(
            self.scores.items(),
            key=lambda x: x[1].get("total_points", 0),
            reverse=True
        )[:limit]
        return [
            {
                "rank": i + 1,
                "student_id": sid,
                "points": data.get("total_points", 0),
                "level": data.get("level", 1)
            }
            for i, (sid, data) in enumerate(sorted_students)
        ]

    def get_student_achievements(self, student_id: str) -> List[Dict]:
        """Get all achievements for a student"""
        student_id = str(student_id)
        return self.achievements_db.get(student_id, [])


class WellnessStore:
    """Mental health and wellness tracking"""
    
    def __init__(self, base_dir: str = "data"):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)
        self.wellness_file = os.path.join(base_dir, "wellness_metrics.json")
        self.load_data()

    def load_data(self):
        """Load wellness data"""
        try:
            if os.path.exists(self.wellness_file):
                with open(self.wellness_file, 'r') as f:
                    self.metrics = json.load(f)
            else:
                self.metrics = {}
        except Exception:
            self.metrics = {}

    def save_data(self):
        """Save wellness data"""
        try:
            with open(self.wellness_file, 'w') as f:
                json.dump(self.metrics, f, indent=2)
        except Exception as e:
            print(f"Error saving wellness data: {e}")

    def update_wellness(self, student_id: str, stress_level: int, study_hours: float, sleep_hours: float) -> Dict:
        """Update wellness metrics and calculate burnout risk"""
        student_id = str(student_id)
        
        # Calculate burnout risk (simplified model)
        stress_factor = stress_level / 10.0  # 0-1
        study_factor = min(study_hours / 12.0, 1.0)  # Over 12 hours is risk
        sleep_factor = 1.0 if sleep_hours >= 7 else (7 - sleep_hours) / 7
        
        burnout_risk = (stress_factor * 0.4 + study_factor * 0.4 + sleep_factor * 0.2)
        burnout_risk = min(max(burnout_risk, 0), 1)  # Clamp 0-1
        
        wellness_score = int(100 * (1 - burnout_risk))
        
        self.metrics[student_id] = {
            "stress_level": stress_level,
            "study_hours_weekly": study_hours,
            "sleep_hours_daily": sleep_hours,
            "burnout_risk": round(burnout_risk, 2),
            "wellness_score": wellness_score,
            "last_updated": datetime.now().isoformat(),
            "alerts": self._generate_alerts(stress_level, study_hours, sleep_hours, burnout_risk)
        }
        
        self.save_data()
        return self.metrics[student_id]

    def _generate_alerts(self, stress: int, study: float, sleep: float, burnout: float) -> List[str]:
        """Generate wellness alerts"""
        alerts = []
        
        if stress >= 8:
            alerts.append("⚠️ High stress detected. Take a break and practice deep breathing.")
        if study > 10:
            alerts.append("⚠️ You're studying too much. Remember to rest!")
        if sleep < 6:
            alerts.append("⚠️ Low sleep detected. Aim for 7-9 hours daily.")
        if burnout > 0.7:
            alerts.append("🚨 HIGH BURNOUT RISK! Please reach out to a counselor.")
        
        return alerts

    def get_wellness_summary(self, student_id: str) -> Dict:
        """Get wellness summary for student"""
        student_id = str(student_id)
        if student_id in self.metrics:
            return self.metrics[student_id]
        return {"wellness_score": 75, "burnout_risk": 0, "alerts": []}

    def get_at_risk_students(self, burnout_threshold: float = 0.6) -> List[str]:
        """Get students with high burnout risk"""
        at_risk = []
        for student_id, metrics in self.metrics.items():
            if metrics.get("burnout_risk", 0) > burnout_threshold:
                at_risk.append(student_id)
        return at_risk


class PeerMatchingEngine:
    """Match students for study groups"""
    
    def __init__(self, base_dir: str = "data"):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)
        self.groups_file = os.path.join(base_dir, "study_groups.json")
        self.load_data()

    def load_data(self):
        """Load study groups"""
        try:
            if os.path.exists(self.groups_file):
                with open(self.groups_file, 'r') as f:
                    self.groups = json.load(f)
            else:
                self.groups = []
        except Exception:
            self.groups = []

    def save_data(self):
        """Save study groups"""
        try:
            with open(self.groups_file, 'w') as f:
                json.dump(self.groups, f, indent=2)
        except Exception as e:
            print(f"Error saving groups: {e}")

    def find_study_buddy(self, student_id: str, student_strengths: List[str], 
                         student_weaknesses: List[str]) -> Optional[Dict]:
        """
        Find a complementary study buddy
        - If student is weak in topic X, match with someone strong in X
        - Different strengths = productive pair
        """
        # In a real implementation, this would query other students from database
        # For now, return a recommendation template
        
        return {
            "match_status": "no_active_buddies",
            "recommendation": "Invite a classmate to form a study group!",
            "suggested_topics": student_weaknesses,
            "match_score": 0
        }

    def create_study_group(self, members: List[str], topics: List[str]) -> Dict:
        """Create a new study group"""
        group_id = f"group_{len(self.groups)}_{int(datetime.now().timestamp())}"
        
        group = {
            "group_id": group_id,
            "members": members,
            "topics": topics,
            "created_date": datetime.now().isoformat(),
            "meetings": 0,
            "last_meeting": None
        }
        
        self.groups.append(group)
        self.save_data()
        return group

    def get_study_groups(self, student_id: str) -> List[Dict]:
        """Get study groups for a student"""
        student_id = str(student_id)
        return [g for g in self.groups if student_id in g.get("members", [])]


class PerformancePredictor:
    """Predict student performance and recommend interventions"""
    
    @staticmethod
    def predict_final_score(current_marks: Dict[str, float], assessment_count: int) -> Dict:
        """
        Predict final exam score based on current performance
        Simple linear regression model
        """
        marks_list = list(current_marks.values())
        
        if not marks_list:
            return {"predicted_score": 0, "confidence": 0, "trend": "insufficient_data"}
        
        current_avg = np.mean(marks_list)
        trend = "improving" if len(marks_list) > 1 and marks_list[-1] > marks_list[-2] else "stable"
        
        # Simple prediction: current average with slight adjustment
        predicted = current_avg * 0.9 + (np.std(marks_list) if len(marks_list) > 1 else 0)
        predicted = min(max(predicted, 0), 100)
        
        # Confidence based on assessment count
        confidence = min(assessment_count / 5.0, 1.0)
        
        return {
            "predicted_final_score": round(predicted, 2),
            "confidence": round(confidence, 2),
            "trend": trend,
            "current_average": round(current_avg, 2)
        }

    @staticmethod
    def get_intervention_strategies(current_avg: float, target: float = 75) -> Dict:
        """Get specific strategies to reach target score"""
        gap = target - current_avg
        
        if gap <= 0:
            return {
                "status": "on_track",
                "message": "🎉 You're on track! Keep up the good work!",
                "strategies": ["Review advanced concepts", "Help struggling peer"]
            }
        elif gap <= 10:
            return {
                "status": "minor_improvement_needed",
                "message": "📈 Small push needed to reach target!",
                "strategies": ["Focus on weak topics", "Solve more practice problems", "Join study group"]
            }
        elif gap <= 20:
            return {
                "status": "significant_improvement_needed",
                "message": "💪 Significant effort needed",
                "strategies": ["Daily 2-hour focused study", "One-on-one tutoring", "Complete all assignments"]
            }
        else:
            return {
                "status": "critical",
                "message": "🆘 Critical intervention needed",
                "strategies": ["Intensive tutoring", "Daily review sessions", "Counselor consultation"]
            }

    @staticmethod
    def calculate_required_effort(current: float, target: float, weeks_remaining: int) -> Dict:
        """Calculate effort required to reach target"""
        if weeks_remaining <= 0:
            return {"message": "No time remaining", "effort": "impossible"}
        
        points_needed = target - current
        improvement_per_week = points_needed / weeks_remaining
        
        if improvement_per_week <= 2:
            effort_level = "low"
        elif improvement_per_week <= 5:
            effort_level = "moderate"
        elif improvement_per_week <= 10:
            effort_level = "high"
        else:
            effort_level = "critical"
        
        return {
            "points_needed": round(points_needed, 2),
            "improvement_per_week": round(improvement_per_week, 2),
            "effort_level": effort_level,
            "weeks_remaining": weeks_remaining
        }


class ConversationalAI:
    """AI Study Buddy - Simple conversational responses"""
    
    def __init__(self):
        self.response_templates = {
            "greeting": [
                "Hey! 👋 Ready to study? What topic can I help with?",
                "Welcome! What concept would you like to understand better?",
                "Hi there! 📚 How can I support your learning today?"
            ],
            "stress": {
                "response": "I sense you might be stressed. Remember, learning is a marathon, not a sprint! 🌱",
                "actions": ["Take a 15-min break", "Try deep breathing", "Chat with a friend"]
            },
            "confidence_boost": [
                "You've got this! 💪",
                "Every mistake is a learning opportunity! 🌟",
                "Progress > Perfection! ✨"
            ],
            "study_tips": [
                "Use the Feynman Technique: Teach the concept to someone else",
                "Try the Pomodoro method: 25 min study + 5 min break",
                "Active recall works better than passive reading"
            ]
        }

    def get_response(self, message: str, emotion: Optional[str] = None) -> Dict:
        """Generate AI response"""
        message_lower = message.lower()
        
        # Detect keywords
        if any(word in message_lower for word in ["help", "hello", "hi", "hey"]):
            response = self.response_templates["greeting"][0]
            suggested_actions = ["Ask a question", "Get study tips", "Check my progress"]
        elif any(word in message_lower for word in ["stress", "worried", "anxious", "pressure"]):
            response = self.response_templates["stress"]["response"]
            suggested_actions = self.response_templates["stress"]["actions"]
        elif any(word in message_lower for word in ["study", "learn", "understand"]):
            response = "Great! Let me help. What specific topic would you like to focus on?"
            suggested_actions = self.response_templates["study_tips"]
        else:
            response = "That's interesting! Can you tell me more about what you're working on?"
            suggested_actions = ["Continue studying", "Take a break", "Get motivation"]
        
        return {
            "response": response,
            "detected_emotion": emotion or "neutral",
            "encouragement": self.response_templates["confidence_boost"][0],
            "suggested_actions": suggested_actions
        }

    def generate_study_plan(self, topics: List[str], time_available_hours: float) -> Dict:
        """Generate a study plan"""
        time_per_topic = time_available_hours / len(topics) if topics else 0
        
        plan = {
            "total_hours": time_available_hours,
            "topics": topics,
            "schedule": []
        }
        
        current_time = 0
        for i, topic in enumerate(topics):
            plan["schedule"].append({
                "order": i + 1,
                "topic": topic,
                "time_minutes": int(time_per_topic * 60),
                "start_minute": int(current_time * 60),
                "activities": ["Read theory (20%)", "Watch video (30%)", "Practice (50%)"]
            })
            current_time += time_per_topic
        
        return plan


# Initialize stores
def get_gamification_store(base_dir: str = "data") -> GamificationStore:
    return GamificationStore(base_dir)

def get_wellness_store(base_dir: str = "data") -> WellnessStore:
    return WellnessStore(base_dir)

def get_peer_matching_engine(base_dir: str = "data") -> PeerMatchingEngine:
    return PeerMatchingEngine(base_dir)

def get_performance_predictor() -> PerformancePredictor:
    return PerformancePredictor()

def get_conversational_ai() -> ConversationalAI:
    return ConversationalAI()
