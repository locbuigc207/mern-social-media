// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socket = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("access_token");

    // Chỉ connect khi có userId và token
    if (!userId || !token) {
      console.log("No userId or token, skipping socket connection");
      return;
    }

    // Tạo socket connection
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    socket.current = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection events
    socket.current.on("connect", () => {
      console.log("Socket connected:", socket.current.id);
      setIsConnected(true);
      
      // Join user room
      socket.current.emit("joinUser", userId);
      
      // Request online users list
      socket.current.emit("getOnlineUsers");
    });

    socket.current.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    // Online/Offline events
    socket.current.on("userOnline", (userId) => {
      console.log("👤 User online:", userId);
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    socket.current.on("userOffline", (userId) => {
      console.log("👤 User offline:", userId);
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    socket.current.on("onlineUsersList", (userIds) => {
      console.log("Online users list:", userIds);
      setOnlineUsers(userIds);
    });

    // Cleanup khi unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, []); // Chỉ chạy 1 lần khi mount

  const value = {
    socket: socket.current,
    isConnected,
    onlineUsers,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};