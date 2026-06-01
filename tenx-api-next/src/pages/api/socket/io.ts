import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIO } from "@/types/socket";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const path = "/api/socket/io";
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: path,
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
        const token = socket.handshake.auth.token;
        const payload = verifyAccessToken(token);

        if (!payload) {
            socket.disconnect();
            return;
        }

        const userId = payload.userId;
        socket.join(`user:${userId}`);

        socket.on("join_conversation", (conversationId) => {
            socket.join(`conversation:${conversationId}`);
        });

        socket.on("call_user", (data) => {
            io.to(`user:${data.userToCall}`).emit("call_user", {
                signal: data.signalData,
                from: userId,
                name: payload.role, // Simple name for demo
                type: data.type, // 'voice' | 'video'
                conversationId: data.conversationId
            });
        });

        socket.on("answer_call", (data) => {
            io.to(`user:${data.to}`).emit("call_accepted", data.signal);
        });

        socket.on("send_message", async (data) => {
            const { conversationId, body, messageType } = data;

            const message = await prisma.message.create({
                data: {
                    conversationId,
                    senderId: userId,
                    body,
                    messageType: messageType || 'text',
                },
                include: { sender: true }
            });

            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() }
            });

            io.to(`conversation:${conversationId}`).emit("receive_message", message);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });
  }

  res.end();
};

export default ioHandler;
