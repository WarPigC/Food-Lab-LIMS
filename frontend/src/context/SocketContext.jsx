import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../utils/api';
import { AuthContext } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if user is authenticated and active token is present
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketEndpoint = API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const newSocket = io(socketEndpoint, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      if (import.meta.env.DEV) {
        console.log('Connected to WebSocket server:', newSocket.id);
      }
    });

    newSocket.on('connect_error', (error) => {
      if (import.meta.env.DEV) {
        console.error('WebSocket connection error:', error?.message || error);
      }
      // Stop continuous reconnection attempts if authentication failed or token expired
      const errMsg = error?.message || '';
      if (errMsg.includes('Authentication error') || errMsg.includes('Token expired')) {
        newSocket.disconnect();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user?._id, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
