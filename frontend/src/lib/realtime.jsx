import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuth } from "./auth";
import { createMessageSocket } from "./api/messageSocketClient";
import { AUTH_TOKEN_KEY } from "./api/authClient";
import { fetchUnreadMessageCount } from "./api/ecosystemClient";

const RealtimeContext = createContext({
  status: "offline", // "connecting" | "live" | "offline"
  socket: null,
  unreadMessagesCount: 0,
  joinConversation: () => {},
  leaveConversation: () => {},
  refreshUnreadMessages: async () => {},
});

export function RealtimeProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [status, setStatus] = useState("offline");
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const refreshUnreadMessages = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadMessagesCount(0);
      return;
    }
    try {
      const res = await fetchUnreadMessageCount();
      if (res?.success && typeof res.unreadCount === "number") {
        setUnreadMessagesCount(res.unreadCount);
        window.dispatchEvent(
          new CustomEvent("nex:unread_messages_updated", {
            detail: { unreadCount: res.unreadCount },
          }),
        );
      }
    } catch {
      // silent fail
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUnreadMessages();
  }, [refreshUnreadMessages]);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus("connecting");
    const socket = createMessageSocket();
    if (!socket) {
      setStatus("offline");
      return;
    }
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setStatus("live");
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "connection:ready") {
          setStatus("live");
          return;
        }

        if (payload.type === "message:sent" || payload.type === "message:new") {
          window.dispatchEvent(
            new CustomEvent("nex:message_received", {
              detail: payload,
            }),
          );

          // If the message is from another user, increment unread messages or refresh
          const senderId = payload.message?.sender?._id || payload.message?.sender;
          if (senderId && String(senderId) !== String(user?._id || user?.id)) {
            setUnreadMessagesCount((prev) => prev + 1);
            window.dispatchEvent(
              new CustomEvent("nex:unread_messages_updated", {
                detail: { unreadCount: unreadMessagesCount + 1 },
              }),
            );
          }
        }

        if (payload.type === "notification:new") {
          window.dispatchEvent(
            new CustomEvent("nex:notification_new", {
              detail: payload.notification,
            }),
          );
          // Trigger notification bell re-fetch
          window.dispatchEvent(new CustomEvent("nex:notifications_updated"));
        }
      } catch {
        // parse error
      }
    });

    socket.addEventListener("error", () => {
      setStatus("offline");
    });

    socket.addEventListener("close", () => {
      setStatus("offline");
      socketRef.current = null;
      // Attempt reconnect if still authenticated
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 4000);
    });
  }, [isAuthenticated, user?._id, user?.id, unreadMessagesCount]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setStatus("offline");
      setUnreadMessagesCount(0);
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  const joinConversation = useCallback((conversationId) => {
    if (!conversationId) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "conversation:join", conversationId }),
      );
    }
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    if (!conversationId) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "conversation:leave", conversationId }),
      );
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      socket: socketRef.current,
      unreadMessagesCount,
      joinConversation,
      leaveConversation,
      refreshUnreadMessages,
    }),
    [status, unreadMessagesCount, joinConversation, leaveConversation, refreshUnreadMessages],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
