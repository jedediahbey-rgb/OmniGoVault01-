"""
Real-time WebSocket Routes V2
Provides WebSocket endpoints for live collaboration features.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.responses import JSONResponse
from typing import Optional
import json
import logging

from services.realtime_service import (
    get_connection_manager,
    EventType,
    RealtimeEvent
)
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/realtime", tags=["realtime"])

# Database reference
db = None
get_current_user = None


def init_realtime_routes(database, auth_func):
    """Initialize routes with dependencies."""
    global db, get_current_user
    db = database
    get_current_user = auth_func


def success_response(data, message=None):
    response = {"ok": True, "data": data}
    if message:
        response["message"] = message
    return JSONResponse(content=response)


def error_response(code, message, details=None, status_code=400):
    return JSONResponse(
        content={"ok": False, "error": {"code": code, "message": message, "details": details or {}}},
        status_code=status_code
    )


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Main WebSocket endpoint for real-time features.
    
    Query params:
        token: Session token for authentication
    
    Message format (client → server):
        {
            "action": "join_room" | "leave_room" | "typing" | "cursor" | "lock_document" | "unlock_document",
            "room_id": "workspace_xxx" | "document_xxx",
            "data": { ... additional data ... }
        }
    
    Event format (server → client):
        {
            "type": "user_joined" | "user_left" | "document_updated" | etc.,
            "payload": { ... event data ... },
            "timestamp": "2024-01-01T00:00:00Z"
        }
    """
    manager = get_connection_manager()
    connection_id = None
    
    try:
        # For now, accept all connections (auth can be added via token param)
        # In production, validate token and get user info
        user_info = {
            "user_id": f"user_{token[:8] if token else 'anon'}",
            "name": "Anonymous User",
            "email": "",
            "picture": None
        }
        
        # Try to get real user info from token
        if token and db:
            try:
                session = await db.sessions.find_one(
                    {"token": token},
                    {"_id": 0, "user_id": 1}
                )
                if session:
                    user_doc = await db.users.find_one(
                        {"user_id": session["user_id"]},
                        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
                    )
                    if user_doc:
                        user_info = user_doc
            except Exception as e:
                logger.error(f"Failed to get user info from token: {e}")
        
        # Accept connection
        connection_id = await manager.connect(websocket, user_info["user_id"], user_info)
        
        # Main message loop
        while True:
            try:
                data = await websocket.receive_json()
                action = data.get("action")
                room_id = data.get("room_id")
                payload = data.get("data", {})
                
                if action == "join_room" and room_id:
                    await manager.join_room(connection_id, room_id)
                    # Send current room presence to joiner
                    presence = manager.get_room_presence(room_id)
                    await manager.send_personal_message(connection_id, {
                        "type": "room_presence",
                        "room_id": room_id,
                        "users": presence,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
                elif action == "leave_room" and room_id:
                    await manager.leave_room(connection_id, room_id)
                
                elif action == "typing" and room_id:
                    # Broadcast typing indicator
                    await manager.broadcast_to_room(room_id, {
                        "type": EventType.USER_TYPING.value,
                        "user_id": user_info["user_id"],
                        "user_name": user_info.get("name", ""),
                        "is_typing": payload.get("is_typing", True),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, exclude_connection=connection_id)
                
                elif action == "cursor" and room_id:
                    # Broadcast cursor position (for collaborative editing)
                    await manager.broadcast_to_room(room_id, {
                        "type": EventType.USER_CURSOR.value,
                        "user_id": user_info["user_id"],
                        "user_name": user_info.get("name", ""),
                        "position": payload.get("position"),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, exclude_connection=connection_id)
                
                elif action == "lock_document":
                    document_id = payload.get("document_id")
                    if document_id:
                        success = await manager.lock_document(document_id, user_info["user_id"])
                        await manager.send_personal_message(connection_id, {
                            "type": "lock_result",
                            "document_id": document_id,
                            "success": success,
                            "locked_by": manager.get_document_lock(document_id) if not success else user_info["user_id"],
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                
                elif action == "unlock_document":
                    document_id = payload.get("document_id")
                    if document_id:
                        await manager.unlock_document(document_id, user_info["user_id"])
                
                elif action == "ping":
                    # Heartbeat
                    await manager.send_personal_message(connection_id, {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
            except json.JSONDecodeError:
                await manager.send_personal_message(connection_id, {
                    "type": "error",
                    "message": "Invalid JSON format"
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if connection_id:
            await manager.disconnect(connection_id)


# ============ REST API ENDPOINTS ============

@router.get("/presence/{room_id}")
async def get_room_presence(room_id: str, request: Request):
    """Get all users currently in a room."""
    manager = get_connection_manager()
    presence = manager.get_room_presence(room_id)
    
    return success_response({
        "room_id": room_id,
        "users": presence,
        "count": len(presence)
    })


@router.get("/document/{document_id}/lock")
async def get_document_lock_status(document_id: str, request: Request):
    """Check if a document is locked and by whom."""
    manager = get_connection_manager()
    locked_by = manager.get_document_lock(document_id)
    
    return success_response({
        "document_id": document_id,
        "is_locked": locked_by is not None,
        "locked_by": locked_by
    })


@router.post("/broadcast")
async def broadcast_event(request: Request):
    """
    Broadcast an event to specified targets.
    For server-side event broadcasting (e.g., after API updates).
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        
        event_type = body.get("event_type")
        payload = body.get("payload", {})
        room_id = body.get("room_id")
        target_users = body.get("target_users")
        
        if not event_type:
            return error_response("MISSING_FIELD", "event_type is required")
        
        manager = get_connection_manager()
        
        event = RealtimeEvent(
            event_type=event_type,
            payload=payload,
            timestamp=datetime.now(timezone.utc).isoformat(),
            sender_id=user.user_id,
            target_users=target_users,
            room_id=room_id
        )
        
        await manager.broadcast_event(event)
        
        return success_response({
            "message": "Event broadcast",
            "event_type": event_type,
            "room_id": room_id,
            "target_users": target_users
        })
        
    except Exception as e:
        return error_response("BROADCAST_ERROR", str(e), status_code=500)


@router.get("/stats")
async def get_realtime_stats(request: Request):
    """Get real-time system statistics."""
    manager = get_connection_manager()
    
    return success_response({
        "total_connections": len(manager.active_connections),
        "total_users": len(manager.user_connections),
        "total_rooms": len(manager.rooms),
        "active_document_locks": len(manager.document_locks),
        "rooms": {room_id: len(conns) for room_id, conns in manager.rooms.items()}
    })
