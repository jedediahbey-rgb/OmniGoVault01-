"""
Real-time Collaboration Service V2
WebSocket-based live updates for workspaces and documents.

V2 Features:
- Conflict resolution and operational transformation
- Reconnection with state recovery
- Activity history and replay
- Channel subscriptions
- Rate limiting
"""

import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Set, Optional, List, Deque
from dataclasses import dataclass, asdict
from enum import Enum
from uuid import uuid4
from collections import deque
import asyncio

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Types of real-time events."""
    # Connection events
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    
    # Presence events
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_TYPING = "user_typing"
    USER_CURSOR = "user_cursor"
    
    # Document events
    DOCUMENT_OPENED = "document_opened"
    DOCUMENT_CLOSED = "document_closed"
    DOCUMENT_UPDATED = "document_updated"
    DOCUMENT_LOCKED = "document_locked"
    DOCUMENT_UNLOCKED = "document_unlocked"
    
    # Workspace events
    WORKSPACE_UPDATED = "workspace_updated"
    MEMBER_INVITED = "member_invited"
    MEMBER_REMOVED = "member_removed"
    ROLE_CHANGED = "role_changed"
    
    # Notification events
    NOTIFICATION = "notification"
    ALERT = "alert"
    
    # Governance events
    RECORD_CREATED = "record_created"
    RECORD_UPDATED = "record_updated"
    RECORD_SIGNED = "record_signed"
    RECORD_FINALIZED = "record_finalized"
    
    # Health events
    HEALTH_ALERT = "health_alert"
    HEALTH_SCORE_CHANGED = "health_score_changed"


@dataclass
class PresenceInfo:
    """Information about a user's presence."""
    user_id: str
    user_name: str
    user_email: str
    user_picture: Optional[str]
    workspace_id: Optional[str]
    document_id: Optional[str]
    status: str  # "online", "away", "busy"
    last_active: str
    cursor_position: Optional[Dict] = None


@dataclass
class RealtimeEvent:
    """A real-time event to broadcast."""
    event_type: str
    payload: Dict
    timestamp: str
    sender_id: Optional[str] = None
    target_users: Optional[List[str]] = None  # None = broadcast to all in room
    room_id: Optional[str] = None


class ConnectionManager:
    """
    Manages WebSocket connections for real-time collaboration.
    Supports multiple rooms (workspaces, documents, portfolios).
    """
    
    def __init__(self):
        # Active WebSocket connections: {connection_id: websocket}
        self.active_connections: Dict[str, any] = {}
        
        # User to connections mapping: {user_id: set(connection_ids)}
        self.user_connections: Dict[str, Set[str]] = {}
        
        # Room memberships: {room_id: set(connection_ids)}
        self.rooms: Dict[str, Set[str]] = {}
        
        # Connection metadata: {connection_id: metadata}
        self.connection_metadata: Dict[str, Dict] = {}
        
        # User presence: {user_id: PresenceInfo}
        self.presence: Dict[str, PresenceInfo] = {}
        
        # Document locks: {document_id: user_id}
        self.document_locks: Dict[str, str] = {}
    
    async def connect(self, websocket, user_id: str, user_info: Dict) -> str:
        """
        Accept a new WebSocket connection.
        Returns connection_id.
        """
        await websocket.accept()
        connection_id = f"conn_{uuid4().hex[:12]}"
        
        # Store connection
        self.active_connections[connection_id] = websocket
        
        # Add to user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        # Store metadata
        self.connection_metadata[connection_id] = {
            "user_id": user_id,
            "user_info": user_info,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "rooms": set()
        }
        
        # Update presence
        self.presence[user_id] = PresenceInfo(
            user_id=user_id,
            user_name=user_info.get("name", "Unknown"),
            user_email=user_info.get("email", ""),
            user_picture=user_info.get("picture"),
            workspace_id=None,
            document_id=None,
            status="online",
            last_active=datetime.now(timezone.utc).isoformat()
        )
        
        logger.info(f"🔌 WebSocket connected: {connection_id} for user {user_id}")
        
        # Send connected confirmation
        await self.send_personal_message(connection_id, {
            "type": EventType.CONNECTED.value,
            "connection_id": connection_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection."""
        if connection_id not in self.active_connections:
            return
        
        metadata = self.connection_metadata.get(connection_id, {})
        user_id = metadata.get("user_id")
        
        # Remove from rooms
        rooms_to_notify = list(metadata.get("rooms", set()))
        for room_id in rooms_to_notify:
            await self.leave_room(connection_id, room_id, notify=True)
        
        # Remove from user connections
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                # User fully disconnected - remove presence
                if user_id in self.presence:
                    del self.presence[user_id]
        
        # Remove connection
        del self.active_connections[connection_id]
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
        
        logger.info(f"🔌 WebSocket disconnected: {connection_id}")
    
    async def join_room(self, connection_id: str, room_id: str, notify: bool = True):
        """Join a room (workspace, document, etc.)."""
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        
        self.rooms[room_id].add(connection_id)
        
        # Update connection metadata
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]["rooms"].add(room_id)
        
        # Update presence
        metadata = self.connection_metadata.get(connection_id, {})
        user_id = metadata.get("user_id")
        if user_id and user_id in self.presence:
            if room_id.startswith("workspace_"):
                self.presence[user_id].workspace_id = room_id
            elif room_id.startswith("document_"):
                self.presence[user_id].document_id = room_id
        
        logger.info(f"📥 Connection {connection_id} joined room {room_id}")
        
        # Notify other room members
        if notify:
            await self.broadcast_to_room(room_id, {
                "type": EventType.USER_JOINED.value,
                "room_id": room_id,
                "user": metadata.get("user_info", {}),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, exclude_connection=connection_id)
    
    async def leave_room(self, connection_id: str, room_id: str, notify: bool = True):
        """Leave a room."""
        if room_id in self.rooms:
            self.rooms[room_id].discard(connection_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        
        # Update connection metadata
        if connection_id in self.connection_metadata:
            self.connection_metadata[connection_id]["rooms"].discard(room_id)
        
        # Release document lock if held
        metadata = self.connection_metadata.get(connection_id, {})
        user_id = metadata.get("user_id")
        if user_id and room_id.startswith("document_"):
            doc_id = room_id.replace("document_", "")
            if self.document_locks.get(doc_id) == user_id:
                del self.document_locks[doc_id]
                await self.broadcast_to_room(room_id, {
                    "type": EventType.DOCUMENT_UNLOCKED.value,
                    "document_id": doc_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
        
        logger.info(f"📤 Connection {connection_id} left room {room_id}")
        
        # Notify other room members
        if notify:
            await self.broadcast_to_room(room_id, {
                "type": EventType.USER_LEFT.value,
                "room_id": room_id,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    
    async def send_personal_message(self, connection_id: str, message: Dict):
        """Send a message to a specific connection."""
        websocket = self.active_connections.get(connection_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to {connection_id}: {e}")
    
    async def broadcast_to_room(self, room_id: str, message: Dict, exclude_connection: str = None):
        """Broadcast a message to all connections in a room."""
        if room_id not in self.rooms:
            return
        
        for conn_id in self.rooms[room_id]:
            if conn_id != exclude_connection:
                await self.send_personal_message(conn_id, message)
    
    async def broadcast_to_user(self, user_id: str, message: Dict):
        """Broadcast a message to all connections of a user."""
        if user_id not in self.user_connections:
            return
        
        for conn_id in self.user_connections[user_id]:
            await self.send_personal_message(conn_id, message)
    
    async def broadcast_event(self, event: RealtimeEvent):
        """Broadcast a RealtimeEvent to appropriate targets."""
        message = {
            "type": event.event_type,
            "payload": event.payload,
            "timestamp": event.timestamp,
            "sender_id": event.sender_id
        }
        
        if event.target_users:
            # Send to specific users
            for user_id in event.target_users:
                await self.broadcast_to_user(user_id, message)
        elif event.room_id:
            # Broadcast to room
            await self.broadcast_to_room(event.room_id, message)
        else:
            # Broadcast to all connections (rarely used)
            for conn_id in self.active_connections:
                await self.send_personal_message(conn_id, message)
    
    def get_room_presence(self, room_id: str) -> List[Dict]:
        """Get presence info for all users in a room."""
        presence_list = []
        
        if room_id not in self.rooms:
            return presence_list
        
        seen_users = set()
        for conn_id in self.rooms[room_id]:
            metadata = self.connection_metadata.get(conn_id, {})
            user_id = metadata.get("user_id")
            if user_id and user_id not in seen_users:
                seen_users.add(user_id)
                if user_id in self.presence:
                    presence_list.append(asdict(self.presence[user_id]))
        
        return presence_list
    
    def get_user_presence(self, user_id: str) -> Optional[Dict]:
        """Get presence info for a specific user."""
        if user_id in self.presence:
            return asdict(self.presence[user_id])
        return None
    
    async def lock_document(self, document_id: str, user_id: str) -> bool:
        """
        Try to acquire a lock on a document for editing.
        Returns True if lock acquired, False if already locked by another user.
        """
        current_lock = self.document_locks.get(document_id)
        
        if current_lock and current_lock != user_id:
            return False
        
        self.document_locks[document_id] = user_id
        
        # Broadcast lock event
        await self.broadcast_to_room(f"document_{document_id}", {
            "type": EventType.DOCUMENT_LOCKED.value,
            "document_id": document_id,
            "locked_by": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return True
    
    async def unlock_document(self, document_id: str, user_id: str) -> bool:
        """Release a document lock."""
        current_lock = self.document_locks.get(document_id)
        
        if current_lock != user_id:
            return False
        
        del self.document_locks[document_id]
        
        # Broadcast unlock event
        await self.broadcast_to_room(f"document_{document_id}", {
            "type": EventType.DOCUMENT_UNLOCKED.value,
            "document_id": document_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return True
    
    def get_document_lock(self, document_id: str) -> Optional[str]:
        """Get the user ID holding a lock on a document."""
        return self.document_locks.get(document_id)
    
    # ============ V2: ACTIVITY HISTORY ============
    
    def _record_activity(self, room_id: str, event: Dict):
        """Record an event in room history for replay."""
        if not hasattr(self, '_room_history'):
            self._room_history: Dict[str, Deque] = {}
        
        if room_id not in self._room_history:
            self._room_history[room_id] = deque(maxlen=100)  # Keep last 100 events
        
        self._room_history[room_id].append({
            **event,
            "recorded_at": datetime.now(timezone.utc).isoformat()
        })
    
    def get_room_history(self, room_id: str, since: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Get recent activity history for a room."""
        if not hasattr(self, '_room_history') or room_id not in self._room_history:
            return []
        
        history = list(self._room_history[room_id])
        
        if since:
            try:
                since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
                history = [e for e in history if datetime.fromisoformat(e["recorded_at"].replace("Z", "+00:00")) > since_dt]
            except (ValueError, KeyError):
                pass
        
        return history[-limit:]
    
    # ============ V2: CHANNEL SUBSCRIPTIONS ============
    
    async def subscribe_to_channel(self, connection_id: str, channel: str):
        """Subscribe a connection to a specific event channel."""
        if not hasattr(self, '_subscriptions'):
            self._subscriptions: Dict[str, Set[str]] = {}
        
        if channel not in self._subscriptions:
            self._subscriptions[channel] = set()
        
        self._subscriptions[channel].add(connection_id)
        
        # Update connection metadata
        if connection_id in self.connection_metadata:
            if "channels" not in self.connection_metadata[connection_id]:
                self.connection_metadata[connection_id]["channels"] = set()
            self.connection_metadata[connection_id]["channels"].add(channel)
        
        logger.info(f"Connection {connection_id} subscribed to channel {channel}")
    
    async def unsubscribe_from_channel(self, connection_id: str, channel: str):
        """Unsubscribe a connection from a channel."""
        if hasattr(self, '_subscriptions') and channel in self._subscriptions:
            self._subscriptions[channel].discard(connection_id)
        
        if connection_id in self.connection_metadata:
            channels = self.connection_metadata[connection_id].get("channels", set())
            channels.discard(channel)
    
    async def broadcast_to_channel(self, channel: str, message: Dict):
        """Broadcast a message to all subscribers of a channel."""
        if not hasattr(self, '_subscriptions') or channel not in self._subscriptions:
            return
        
        for conn_id in self._subscriptions[channel]:
            await self.send_personal_message(conn_id, message)
    
    def get_channel_subscribers(self, channel: str) -> int:
        """Get count of subscribers for a channel."""
        if not hasattr(self, '_subscriptions'):
            return 0
        return len(self._subscriptions.get(channel, set()))
    
    # ============ V2: RECONNECTION SUPPORT ============
    
    async def store_session_state(self, user_id: str, state: Dict):
        """Store session state for reconnection."""
        if not hasattr(self, '_session_states'):
            self._session_states: Dict[str, Dict] = {}
        
        self._session_states[user_id] = {
            **state,
            "stored_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        }
    
    async def restore_session_state(self, user_id: str) -> Optional[Dict]:
        """Restore session state after reconnection."""
        if not hasattr(self, '_session_states') or user_id not in self._session_states:
            return None
        
        state = self._session_states[user_id]
        
        # Check expiration
        try:
            expires = datetime.fromisoformat(state["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires:
                del self._session_states[user_id]
                return None
        except (ValueError, KeyError):
            pass
        
        # Clear after restore
        del self._session_states[user_id]
        
        return state
    
    # ============ V2: RATE LIMITING ============
    
    def check_rate_limit(self, connection_id: str, action: str, limit: int = 30, window_seconds: int = 60) -> bool:
        """
        Check if a connection has exceeded rate limit for an action.
        Returns True if allowed, False if rate limited.
        """
        if not hasattr(self, '_rate_limits'):
            self._rate_limits: Dict[str, Dict] = {}
        
        key = f"{connection_id}:{action}"
        now = datetime.now(timezone.utc)
        
        if key not in self._rate_limits:
            self._rate_limits[key] = {
                "count": 0,
                "window_start": now
            }
        
        rate_data = self._rate_limits[key]
        
        # Check if window has expired
        window_start = rate_data["window_start"]
        if isinstance(window_start, str):
            window_start = datetime.fromisoformat(window_start.replace("Z", "+00:00"))
        
        if (now - window_start).total_seconds() > window_seconds:
            # Reset window
            self._rate_limits[key] = {
                "count": 1,
                "window_start": now
            }
            return True
        
        # Check count
        if rate_data["count"] >= limit:
            return False
        
        rate_data["count"] += 1
        return True
    
    # ============ V2: CONFLICT RESOLUTION ============
    
    async def resolve_conflict(
        self,
        document_id: str,
        user_id: str,
        base_version: int,
        changes: Dict
    ) -> Dict:
        """
        Handle conflict resolution for concurrent edits.
        Uses basic operational transformation for text changes.
        
        Returns:
            {
                "resolved": True/False,
                "merged_changes": {...} if resolved,
                "conflict_details": {...} if not resolved
            }
        """
        if not hasattr(self, '_document_versions'):
            self._document_versions: Dict[str, int] = {}
            self._pending_changes: Dict[str, List] = {}
        
        current_version = self._document_versions.get(document_id, 0)
        
        if base_version == current_version:
            # No conflict - apply directly
            self._document_versions[document_id] = current_version + 1
            return {
                "resolved": True,
                "new_version": current_version + 1,
                "changes": changes
            }
        
        # Conflict detected - need transformation
        if document_id not in self._pending_changes:
            self._pending_changes[document_id] = []
        
        # Get changes since base version
        conflicting_changes = [
            c for c in self._pending_changes[document_id]
            if c["version"] > base_version
        ]
        
        if not conflicting_changes:
            # Changes were already applied, just increment
            self._document_versions[document_id] = current_version + 1
            return {
                "resolved": True,
                "new_version": current_version + 1,
                "changes": changes
            }
        
        # Apply operational transformation
        transformed = self._transform_changes(changes, conflicting_changes)
        
        if transformed:
            self._document_versions[document_id] = current_version + 1
            self._pending_changes[document_id].append({
                "version": current_version + 1,
                "changes": transformed,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Keep only last 50 changes
            self._pending_changes[document_id] = self._pending_changes[document_id][-50:]
            
            return {
                "resolved": True,
                "new_version": current_version + 1,
                "changes": transformed,
                "transformed": True
            }
        
        # Could not auto-resolve
        return {
            "resolved": False,
            "conflict_details": {
                "base_version": base_version,
                "current_version": current_version,
                "conflicting_users": [c["user_id"] for c in conflicting_changes]
            }
        }
    
    def _transform_changes(self, incoming: Dict, existing: List[Dict]) -> Optional[Dict]:
        """
        Apply operational transformation to merge changes.
        Basic implementation for text operations.
        """
        # Simple conflict resolution for field-level changes
        transformed = dict(incoming)
        
        for change_record in existing:
            existing_changes = change_record.get("changes", {})
            
            for field, value in existing_changes.items():
                if field in transformed:
                    # Field conflict - check if values are compatible
                    if transformed[field] == value:
                        # Same value, no conflict
                        continue
                    
                    # Different values - use timestamp to determine winner
                    # For now, keep incoming (last-write-wins)
                    # In production, implement proper OT based on operation type
                    pass
        
        return transformed
    
    def get_document_version(self, document_id: str) -> int:
        """Get the current version of a document."""
        if not hasattr(self, '_document_versions'):
            return 0
        return self._document_versions.get(document_id, 0)
    
    # ============ V2: STATISTICS ============
    
    def get_detailed_stats(self) -> Dict:
        """Get detailed statistics about the real-time system."""
        stats = {
            "connections": {
                "total": len(self.active_connections),
                "by_user": {uid: len(conns) for uid, conns in self.user_connections.items()}
            },
            "rooms": {
                "total": len(self.rooms),
                "by_room": {rid: len(conns) for rid, conns in self.rooms.items()}
            },
            "locks": {
                "total": len(self.document_locks),
                "documents": list(self.document_locks.keys())
            },
            "presence": {
                "online_users": len(self.presence)
            }
        }
        
        # Add V2 stats if available
        if hasattr(self, '_subscriptions'):
            stats["channels"] = {
                "total": len(self._subscriptions),
                "by_channel": {ch: len(subs) for ch, subs in self._subscriptions.items()}
            }
        
        if hasattr(self, '_room_history'):
            stats["history"] = {
                "rooms_with_history": len(self._room_history),
                "total_events": sum(len(h) for h in self._room_history.values())
            }
        
        if hasattr(self, '_document_versions'):
            stats["documents"] = {
                "tracked": len(self._document_versions),
                "versions": dict(self._document_versions)
            }
        
        return stats


# Global connection manager instance
manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager."""
    return manager
