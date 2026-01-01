/**
 * Real-time Collaboration Hook
 * Manages WebSocket connection for live presence and updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtime(roomId, userId, userInfo = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState([]);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/api/realtime/ws`;
  }, []);

  // Send message to WebSocket
  const sendMessage = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  // Join room
  const joinRoom = useCallback((targetRoomId) => {
    sendMessage('join_room', { room_id: targetRoomId || roomId });
  }, [roomId, sendMessage]);

  // Leave room
  const leaveRoom = useCallback((targetRoomId) => {
    sendMessage('leave_room', { room_id: targetRoomId || roomId });
  }, [roomId, sendMessage]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping) => {
    sendMessage('typing', { room_id: roomId, is_typing: isTyping });
  }, [roomId, sendMessage]);

  // Send cursor position
  const sendCursor = useCallback((position) => {
    sendMessage('cursor', { room_id: roomId, position });
  }, [roomId, sendMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = getWsUrl();
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[Realtime] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Auto-join room if specified
        if (roomId) {
          joinRoom(roomId);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'room_presence':
              setPresence(data.users || []);
              break;
            case 'user_joined':
              setPresence(prev => {
                const exists = prev.find(u => u.user_id === data.user?.user_id);
                if (exists) return prev;
                return [...prev, data.user];
              });
              break;
            case 'user_left':
              setPresence(prev => prev.filter(u => u.user_id !== data.user_id));
              break;
            case 'user_typing':
              setPresence(prev => prev.map(u => 
                u.user_id === data.user_id ? { ...u, is_typing: data.is_typing } : u
              ));
              break;
            default:
              // Handle other event types as needed
              break;
          }
        } catch (e) {
          console.error('[Realtime] Parse error:', e);
        }
      };

      wsRef.current.onclose = () => {
        console.log('[Realtime] Disconnected');
        setIsConnected(false);
        
        // Attempt reconnection
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };

      wsRef.current.onerror = (e) => {
        console.error('[Realtime] Error:', e);
        setError('Connection error');
      };
    } catch (e) {
      console.error('[Realtime] Connection failed:', e);
      setError('Failed to connect');
    }
  }, [getWsUrl, roomId, joinRoom]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setPresence([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (roomId && userId) {
      connect();
    }
    return () => disconnect();
  }, [roomId, userId, connect, disconnect]);

  return {
    isConnected,
    presence,
    error,
    sendMessage,
    joinRoom,
    leaveRoom,
    sendTyping,
    sendCursor,
    connect,
    disconnect
  };
}

export default useRealtime;
