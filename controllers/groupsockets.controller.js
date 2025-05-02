const { User } = require("../models/user");
const Group = require("../models/group");
const Message = require("../models/messages");
const { default: mongoose } = require("mongoose");
const groups = {};

module.exports = (io) => {
  io.use(async (socket, next) => {
    const groupId = socket.handshake.auth.groupId;
    const userId = socket.handshake.auth.userId;

    if (!groupId || !userId) {
      return next(new Error("Authentication error"));
    }

    try {
      const group = await Group.findById(groupId);
      if (!group) {
        return next(new Error("Group not found"));
      }

      const isMember = group.members.some(
        (memberId) => memberId.toString() === userId
      );

      if (!isMember) {
        return next(new Error("Not a member of this group"));
      }

      socket.group = group;
      next();
    } catch (err) {
      return next(new Error("Server error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("connected to group socket", socket.id);

    // Join group room (for chat/presence only)
    socket.on("group:join", ({ groupId, userId }) => {
      if (!groups[groupId]) {
        groups[groupId] = { users: new Set(), messages: [] };
      }
      groups[groupId].users.add(socket.id);
      socket.join(groupId);
      io.to(groupId).emit("group:userJoined", { userId, groupId });
    });

    // Leave group room (for chat/presence only)
    socket.on("group:leave", ({ groupId, userId }) => {
      if (groups[groupId]) {
        groups[groupId].users.delete(socket.id);
        socket.leave(groupId);
        io.to(groupId).emit("group:userLeft", { userId, groupId });
      }
    });

    // Handle group messages
    // ...existing code...
    socket.on("group:message", async ({ groupId, message, user }) => {
      const group = await Group.findById(groupId);
      if (
        group.blocked_members.map(String).includes(user.id) ||
        !group.members.map(String).includes(user.id)
      ) {
        socket.emit("error", {
          message: "You are blocked or not a member of this group.",
        });
        return;
      }
      try {
        // Verify membership again as an extra security measure
        const isMember = socket.group.members.some(
          (memberId) => memberId.toString() === user.id
        );

        if (!isMember) {
          socket.emit("error", { message: "Not authorized to send messages" });
          return;
        }

        try {
          const savedMsg = await Message.create({
            group: groupId,
            sender: user.id,
            content: String(message),
            createdAt: new Date(),
          });

          const group = await Group.findByIdAndUpdate(groupId, {
            $push: { messages: savedMsg._id },
          });

          // Increment unread count for all group members except sender
          await User.updateMany(
            {
              _id: { $in: group.members, $ne: user.id },
              "unreadMessages.group": { $ne: groupId },
            },
            {
              $push: {
                unreadMessages: { group: groupId, count: 1 },
              },
            }
          );

          await User.updateMany(
            {
              _id: { $in: group.members, $ne: user.id },
              "unreadMessages.group": groupId,
            },
            {
              $inc: {
                "unreadMessages.$.count": 1,
              },
            }
          );

          io.to(groupId).emit("group:newMessage", {
            groupId,
            user,
            message,
            timestamp: savedMsg.createdAt,
          });
        } catch (err) {
          console.error("Error saving group message:", err);
        }
      } catch (err) {
        console.error("Socket error:", err);
        socket.emit("error", { message: "Server error" });
      }
    });

    // Handle disconnect (for presence only)
    socket.on("disconnect", () => {
      for (const groupId in groups) {
        if (groups[groupId].users.has(socket.id)) {
          groups[groupId].users.delete(socket.id);
          io.to(groupId).emit("group:userDisconnected", {
            socketId: socket.id,
            groupId,
          });
        }
      }
    });
  });
};
