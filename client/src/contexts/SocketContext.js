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

    // New bid session notification
    newSocket.on('new-bid-session', (data) => {
      toast.success(`New bid session "${data.sessionName}" has been created!`, {
        duration: 6000,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to bidding page and refresh to get latest sessions
            window.location.href = '/bidding';
          }
        }
      });
      
      // Only join the bid session room if we have a valid sessionId
      if (data.sessionId) {
        newSocket.emit('join-bid-session', { sessionId: data.sessionId });
      }
    });

    // Bid session started notification
    newSocket.on('bid-session-started', (data) => {
      toast.success(`Bid session "${data.sessionName}" has started!`, {
        duration: 6000,
        action: {
          label: 'Join Session',
          onClick: () => {
            // Navigate to bidding page to see the active session
            window.location.href = '/bidding';
          }
        }
      });
    });

    newSocket.on('bid-session-paused', (data) => {
      toast(`Bid session "${data.sessionName}" has been paused`, {
        duration: 4000,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = '/bidding';
          }
        }
      });
    });

    newSocket.on('bid-session-resumed', (data) => {
      toast.success(`Bid session "${data.sessionName}" has resumed`, {
        duration: 4000,
        action: {
          label: 'Join Session',
          onClick: () => {
            window.location.href = '/bidding';
          }
        }
      });
    });

    newSocket.on('bid-session-completed', (data) => {
      toast.success(`Bid session "${data.sessionName}" has completed!`, {
        duration: 6000,
        action: {
          label: 'View Results',
          onClick: () => {
            window.location.href = '/bidding';
          }
        }
      });
    });

    // Admin notification for session creation
    newSocket.on('bid-session-created', (data) => {
      if (user?.isAdmin) {
        toast.success(`Bid session "${data.sessionName}" created with ${data.participantCount} participants`, {
          duration: 5000
        });
      }
    });

    // Admin notification for session deletion
    newSocket.on('bid-session-deleted', (data) => {
      if (user?.isAdmin) {
        toast(`Bid session "${data.sessionName}" has been deleted`, {
          duration: 4000
        });
      }
    });

    // Notification when added to a bid session
    newSocket.on('added-to-bid-session', (data) => {
      toast.success(`You have been added to bid session "${data.sessionName}"!`, {
        duration: 6000,
        action: {
          label: 'View Session',
          onClick: () => {
            window.location.href = '/bidding';
          }
        }
      });
    });

    // Automatically join bid session when added by admin
    newSocket.on('auto-join-bid-session', (data) => {
      console.log('Auto-joining bid session:', data.sessionId);
      // Automatically join the bid session room
      newSocket.emit('auto_join_bid_session', { sessionId: data.sessionId });
    });

    // Admin notification for participants added
    newSocket.on('participants-added', (data) => {
      if (user?.isAdmin) {
        toast.success(`${data.addedCount} participants added to "${data.sessionName}" (Total: ${data.totalParticipants})`, {
          duration: 5000
        });
      }
    });

    // Turn management events
    newSocket.on('turn-starting-soon', (data) => {
      toast(`Your turn is starting in ${data.countdown} minutes`, {
        duration: 10000,
        action: {
          label: 'Join Now',
          onClick: () => {
            window.location.href = '/bidding';
          }
        }
      });
    });

    newSocket.on('turn-timeout-warning', (data) => {
      toast.error(`Warning: Your turn will end in ${data.remainingTime} seconds!`, {
        duration: 5000,
        action: {
          label: 'Bid Now',
          onClick: () => {
            window.location.href = '/bidding';
          }
        }
      });
    });

    newSocket.on('turn-started', (data) => {
      if (data.userId === user?._id) {
        toast.success(`It's your turn to bid! You have ${Math.floor(data.duration / 60)} minutes.`, {
          duration: 8000,
          action: {
            label: 'Start Bidding',
            onClick: () => {
              window.location.href = '/bidding';
            }
          }
        });
      } else {
        // Notify other users that someone's turn has started
        toast(`${data.userName}'s turn has started`, {
          duration: 4000,
          action: {
            label: 'Watch Session',
            onClick: () => {
              window.location.href = '/bidding';
            }
          }
        });
      }
    });

    // Turn updated event
    newSocket.on('turn-updated', (data) => {
      // This will be handled by the bidding components to refresh their data
      console.log('Turn updated:', data);
    });

    // Bid events
    newSocket.on('bid-received', (data) => {
      toast.success(`Bid received for ${data.station} - ${data.shift} shift`);
    });

    newSocket.on('bid-submitted', (data) => {
      if (data.userId === user?._id) {
        toast.success(`Your bid for ${data.station} - ${data.shift} shift has been submitted successfully!`);
      } else {
        toast(`${data.userName} submitted a bid for ${data.station} - ${data.shift} shift`);
      }
    });

    newSocket.on('auto-assignment', (data) => {
      toast.warning(`You have been auto-assigned to ${data.station} - ${data.shift} shift due to timeout.`);
    });

    newSocket.on('bid-conflict', (data) => {
      toast.error(`Bid conflict: ${data.station} - ${data.shift} shift is no longer available`);
    });

    // Auto-assignment events
    newSocket.on('auto-assignment', (data) => {
      toast(`Auto-assigned to ${data.station} - ${data.shift} shift`);
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
