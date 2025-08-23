import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || !token) {
      return;
    }

    // Create socket connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      
      // Join user-specific room
      newSocket.emit('join-user-room', { userId: user._id });
      
      toast.success('Connected to real-time updates');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      if (error.message === 'Authentication failed') {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error('Connection failed. Trying to reconnect...');
      }
    });

    // Bid session events
    newSocket.on('bid-session-started', (data) => {
      toast.success(`Bid session "${data.sessionName}" has started!`);
    });

    newSocket.on('bid-session-paused', (data) => {
      toast.info(`Bid session "${data.sessionName}" has been paused`);
    });

    newSocket.on('bid-session-resumed', (data) => {
      toast.success(`Bid session "${data.sessionName}" has resumed`);
    });

    newSocket.on('bid-session-completed', (data) => {
      toast.success(`Bid session "${data.sessionName}" has completed!`);
    });

    // Turn management events
    newSocket.on('turn-starting-soon', (data) => {
      toast.info(`Your turn is starting in ${data.countdown} minutes`);
    });

    newSocket.on('turn-timeout-warning', (data) => {
      toast.error(`Warning: Your turn will end in ${data.remainingTime} seconds!`);
    });

    // Bid events
    newSocket.on('bid-received', (data) => {
      toast.success(`Bid received for ${data.station} - ${data.shift} shift`);
    });

    newSocket.on('bid-conflict', (data) => {
      toast.error(`Bid conflict: ${data.station} - ${data.shift} shift is no longer available`);
    });

    // Auto-assignment events
    newSocket.on('auto-assignment', (data) => {
      toast.info(`Auto-assigned to ${data.station} - ${data.shift} shift`);
    });

    // Error events
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  // Cleanup socket when user/token is removed
  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user, token, socket]);

  // Join bid session room
  const joinBidSession = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('join-bid-session', { sessionId });
      console.log('Joined bid session room:', sessionId);
    }
  };

  // Leave bid session room
  const leaveBidSession = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('leave-bid-session', { sessionId });
      console.log('Left bid session room:', sessionId);
    }
  };

  // Submit bid
  const submitBid = (sessionId, bidData) => {
    if (socket && isConnected) {
      socket.emit('submit-bid', { sessionId, bidData });
      console.log('Submitted bid:', bidData);
    }
  };

  // Skip turn
  const skipTurn = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('skip-turn', { sessionId });
      console.log('Skipped turn for session:', sessionId);
    }
  };

  // Request session update
  const requestSessionUpdate = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('request-session-update', { sessionId });
      console.log('Requested session update:', sessionId);
    }
  };

  const value = {
    socket,
    isConnected,
    joinBidSession,
    leaveBidSession,
    submitBid,
    skipTurn,
    requestSessionUpdate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
