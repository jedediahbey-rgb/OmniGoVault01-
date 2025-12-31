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
                
                # V2: Channel subscriptions
                elif action == "subscribe" and room_id:
                    channel = payload.get("channel", room_id)
                    await manager.subscribe_to_channel(connection_id, channel)
                    await manager.send_personal_message(connection_id, {
                        "type": "subscribed",
                        "channel": channel,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
                elif action == "unsubscribe":
                    channel = payload.get("channel")
                    if channel:
                        await manager.unsubscribe_from_channel(connection_id, channel)
                        await manager.send_personal_message(connection_id, {
                            "type": "unsubscribed",
                            "channel": channel,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                
                # V2: Get room history
                elif action == "get_history" and room_id:
                    since = payload.get("since")
                    limit = payload.get("limit", 50)
                    history = manager.get_room_history(room_id, since, limit)
                    await manager.send_personal_message(connection_id, {
                        "type": "room_history",
                        "room_id": room_id,
                        "events": history,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
                # V2: Conflict resolution
                elif action == "sync_changes":
                    document_id = payload.get("document_id")
                    base_version = payload.get("base_version", 0)
                    changes = payload.get("changes", {})
                    
                    if document_id:
                        # Rate limit check
                        if not manager.check_rate_limit(connection_id, "sync_changes", limit=60):
                            await manager.send_personal_message(connection_id, {
                                "type": "rate_limited",
                                "action": "sync_changes",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            })
                        else:
                            result = await manager.resolve_conflict(
                                document_id, user_info["user_id"], base_version, changes
                            )
                            
                            await manager.send_personal_message(connection_id, {
                                "type": "sync_result",
                                "document_id": document_id,
                                **result,
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            })
                            
                            # Broadcast to others if resolved
                            if result.get("resolved"):
                                await manager.broadcast_to_room(f"document_{document_id}", {
                                    "type": EventType.DOCUMENT_UPDATED.value,
                                    "document_id": document_id,
                                    "version": result.get("new_version"),
                                    "changes": result.get("changes"),
                                    "user_id": user_info["user_id"],
                                    "timestamp": datetime.now(timezone.utc).isoformat()
                                }, exclude_connection=connection_id)
                
                # V2: Store session for reconnection
                elif action == "store_session":
                    state = payload.get("state", {})
                    state["rooms"] = list(manager.connection_metadata.get(connection_id, {}).get("rooms", set()))
                    await manager.store_session_state(user_info["user_id"], state)
                    await manager.send_personal_message(connection_id, {
                        "type": "session_stored",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
                # V2: Restore session after reconnect
                elif action == "restore_session":
                    state = await manager.restore_session_state(user_info["user_id"])
                    if state:
                        # Rejoin rooms
                        for room_id in state.get("rooms", []):
                            await manager.join_room(connection_id, room_id, notify=True)
                        
                        await manager.send_personal_message(connection_id, {
                            "type": "session_restored",
                            "state": state,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                    else:
                        await manager.send_personal_message(connection_id, {
                            "type": "no_session",
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


# ============ V2: ADVANCED ENDPOINTS ============

@router.get("/stats/detailed")
async def get_detailed_stats(request: Request):
    """Get detailed real-time system statistics (V2)."""
    manager = get_connection_manager()
    stats = manager.get_detailed_stats()
    return success_response(stats)


@router.get("/history/{room_id}")
async def get_room_history(
    room_id: str,
    request: Request,
    since: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """Get activity history for a room (V2)."""
    manager = get_connection_manager()
    history = manager.get_room_history(room_id, since, limit)
    
    return success_response({
        "room_id": room_id,
        "events": history,
        "count": len(history)
    })


@router.get("/document/{document_id}/version")
async def get_document_version(document_id: str, request: Request):
    """Get the current version of a document for conflict resolution (V2)."""
    manager = get_connection_manager()
    version = manager.get_document_version(document_id)
    locked_by = manager.get_document_lock(document_id)
    
    return success_response({
        "document_id": document_id,
        "version": version,
        "is_locked": locked_by is not None,
        "locked_by": locked_by
    })


@router.get("/channels")
async def get_channels(request: Request):
    """Get list of active channels and subscriber counts (V2)."""
    manager = get_connection_manager()
    
    channels = {}
    if hasattr(manager, '_subscriptions'):
        channels = {ch: len(subs) for ch, subs in manager._subscriptions.items()}
    
    return success_response({
        "channels": channels,
        "count": len(channels)
    })


@router.post("/channel/{channel}/broadcast")
async def broadcast_to_channel(channel: str, request: Request):
    """Broadcast a message to all subscribers of a channel (V2)."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        message = body.get("message", {})
        
        manager = get_connection_manager()
        
        await manager.broadcast_to_channel(channel, {
            "type": "channel_message",
            "channel": channel,
            "message": message,
            "sender_id": user.user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        subscriber_count = manager.get_channel_subscribers(channel)
        
        return success_response({
            "channel": channel,
            "subscribers_notified": subscriber_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        return error_response("BROADCAST_ERROR", str(e), status_code=500)


@router.get("/capabilities")
async def get_capabilities(request: Request):
    """Get supported real-time capabilities (V2)."""
    return success_response({
        "version": "2.0",
        "features": {
            "presence": True,
            "rooms": True,
            "document_locking": True,
            "typing_indicators": True,
            "cursor_sharing": True,
            "channel_subscriptions": True,
            "activity_history": True,
            "conflict_resolution": True,
            "session_recovery": True,
            "rate_limiting": True
        },
        "event_types": [e.value for e in EventType],
        "actions": [
            "join_room",
            "leave_room",
            "typing",
            "cursor",
            "lock_document",
            "unlock_document",
            "ping",
            "subscribe",
            "unsubscribe",
            "get_history",
            "sync_changes",
            "store_session",
            "restore_session"
        ]
    })
