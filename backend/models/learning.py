from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict
import uuid


class LearningProgress(BaseModel):
    """Track user's learning progress"""
    progress_id: str = Field(default_factory=lambda: f"prog_{uuid.uuid4().hex[:12]}")
    user_id: str
    module_id: str  # curriculum module identifier
    module_title: str
    status: str = "not_started"  # not_started, in_progress, completed
    progress_percent: int = 0
    last_position: str = ""  # bookmark position
    notes: str = ""
    completed_sections: List[str] = []
    quiz_scores: Dict[str, int] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MaximStudyProgress(BaseModel):
    """Track spaced repetition for maxims study"""
    study_id: str = Field(default_factory=lambda: f"study_{uuid.uuid4().hex[:12]}")
    user_id: str
    maxim_id: str
    maxim_text: str
    ease_factor: float = 2.5
    interval_days: int = 1
    repetitions: int = 0
    next_review: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_review: Optional[datetime] = None
    correct_count: int = 0
    incorrect_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
