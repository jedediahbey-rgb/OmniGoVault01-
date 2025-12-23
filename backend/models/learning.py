"""Learning and chat models"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid


class ChatMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    session_id: str
    user_id: str
    role: str  # user, assistant
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LearningProgress(BaseModel):
    progress_id: str = Field(default_factory=lambda: f"prog_{uuid.uuid4().hex[:12]}")
    user_id: str
    completed_lessons: List[str] = []
    quiz_scores: Dict[str, int] = {}  # lesson_id -> score
    checklist_items: Dict[str, List[str]] = {}  # lesson_id -> completed items
    last_lesson: str = ""
    total_time_spent: int = 0  # seconds
    streak_days: int = 0
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class MaximStudyProgress(BaseModel):
    study_id: str = Field(default_factory=lambda: f"study_{uuid.uuid4().hex[:12]}")
    user_id: str
    studied_maxims: List[str] = []  # maxim IDs that have been studied
    flashcard_scores: Dict[str, int] = {}  # maxim_id -> correct count
    favorites: List[str] = []  # favorited maxim IDs
    notes: Dict[str, str] = {}  # maxim_id -> user notes
    last_study_session: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
