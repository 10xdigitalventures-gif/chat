import { io } from "socket.io-client";
import { create } from "zustand";

export const useChatStore = create((set: any, get: any) => ({
    socket: null,
    messages: [],
    isConnected: false,

    connect: (token: string) => {
        const socket = io({
            path: "/api/socket/io",
            auth: { token }
        });

        socket.on("connect", () => set({ isConnected: true }));
        socket.on("disconnect", () => set({ isConnected: false }));
        socket.on("receive_message", (msg) => {
            set({ messages: [...get().messages, msg] });
        });

        set({ socket });
    },

    joinConversation: (id: string) => {
        const { socket } = get();
        if (socket) socket.emit("join_conversation", id);
    },

    sendMessage: (conversationId: string, body: string) => {
        const { socket } = get();
        if (socket) socket.emit("send_message", { conversationId, body });
    }
}));
