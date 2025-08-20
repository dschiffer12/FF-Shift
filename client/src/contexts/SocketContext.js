import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentBidSession, setCurrentBidSession] = useState(null);
  const [bidQueue, setBidQueue] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState(null);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('bid_session_joined', (data) => {
      setCurrentBidSession(data.session);
      setCurrentParticipant(data.currentParticipant);
      setBidQueue(data.participants);
    });

    socket.on('bid_submitted', (data) => {
      toast.success(`${data.userName} selected ${data.station.name} - Shift ${data.shift}`);
      setCurrentParticipant(data.nextParticipant);
    });

    socket.on('error', (data) => {
      toast.error(data.message || 'An error occurred');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, token]);

  const value = {
    socket: socketRef.current,
    isConnected,
    currentBidSession,
    bidQueue,
    currentParticipant,
    joinBidSession: (sessionId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('join_bid_session', sessionId);
      }
    },
    submitBid: (sessionId, stationId, shift, position) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('submit_bid', { sessionId, stationId, shift, position });
      }
    },
    startSession: (sessionId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('admin_start_session', sessionId);
      }
    },
    pauseSession: (sessionId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('admin_pause_session', sessionId);
      }
    },
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
