import { io } from "socket.io-client";

export const createChatConnection = (token) => {
  const socket = io({
    path: "/api/socket/io",
    auth: { token }
  });

  return {
    socket,
    onReceiveMessage: (callback) => {
      socket.on("receive_message", callback);
    },
    joinConversation: (conversationId) => {
      socket.emit("join_conversation", conversationId);
    },
    sendMessage: (conversationId, body) => {
      socket.emit("send_message", { conversationId, body });
    },
    disconnect: () => {
      socket.disconnect();
    }
  };
};
