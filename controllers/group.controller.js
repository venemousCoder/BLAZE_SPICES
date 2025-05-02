const Group = require("../models/group");
const { User } = require("../models/user");
const Message = require("../models/messages");

async function sendNotification(userId, notif) {
  await User.findByIdAndUpdate(userId, {
    $push: { notifications: { ...notif, read: false, createdAt: new Date() } },
  });
}

async function joinGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    // Add user if not already a member
    if (!group.members.includes(req.user._id)) {
      group.members.push(req.user._id);
      await group.save();
      // After group.members.push(req.user._id); await group.save();
      await sendNotification(req.user._id, {
        from: req.user._id,
        message: `You have joined "${group.group_name}" 🎉`,
        type: "group-join",
        reference: group._id,
      });
      await sendNotification(group.admin, {
        from: req.user._id,
        message: `Has joined "${group.group_name}" 🎉`,
        type: "group-join",
        reference: group._id,
      });
    }

    // Emit socket event (if you want to notify others)
    // req.app
    //   .get("io")
    //   .to(group._id.toString())
    //   .emit("group:join", {
    //     user: { id: req.user._id, username: req.user.username },
    //     groupId: group._id,
    //   });

    return res.json({ success: true });
  } catch (err) {
    console.error("Join group error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function leaveGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    group.members = group.members.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await group.save();

    // Emit socket event (if you want to notify others)
    // req.app
    //   .get("io")
    //   .to(group._id.toString())
    //   .emit("group:userLeft", {
    //     user: { id: req.user._id, username: req.user.username },
    //     groupId: group._id,
    //   });

    return res.json({ success: true });
  } catch (err) {
    console.error("Leave group error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function promoteToModerator(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    // Only admin can promote
    if (group.admin.toString() !== req.user._id.toString())
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    const { userId } = req.body;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });

    // Don't promote admin or already-moderator
    if (
      userId === group.admin.toString() ||
      group.moderators.map(String).includes(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid promotion" });
    }

    group.moderators.push(userId);
    await group.save();
    // After group.moderators.push(userId); await group.save();
    await sendNotification(userId, {
      from: req.user._id,
      message: `You have been promoted to Moderator in "${group.group_name}" 🎉`,
      type: "group-promotion",
      reference: group._id,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Promote error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function kickMember(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    const { userId } = req.body;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });

    // Only admin or moderator can kick, but mods can't kick admin or other mods
    const isAdmin = group.admin.toString() === req.user._id.toString();
    const isMod = group.moderators
      .map(String)
      .includes(req.user._id.toString());

    if (
      !isAdmin &&
      (!isMod ||
        group.admin.toString() === userId ||
        group.moderators.map(String).includes(userId))
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Remove from members and moderators
    group.members = group.members.filter((id) => id.toString() !== userId);
    group.moderators = group.moderators.filter(
      (id) => id.toString() !== userId
    );
    await group.save();
    // After removing from members/moderators and saving
    await sendNotification(userId, {
      from: req.user._id,
      message: `You have been removed from "${group.group_name}" 🚫`,
      type: "group-kick",
      reference: group._id,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Kick error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function updateGroupSettings(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    const isAdmin = group.admin.toString() === req.user._id.toString();
    const isMod = group.moderators
      .map(String)
      .includes(req.user._id.toString());

    if (!isAdmin && !isMod)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    // Only admin can change name, privacy, banner
    if (isAdmin) {
      if (req.body.group_name) group.group_name = req.body.group_name;
      if (req.body.group_type) group.group_type = req.body.group_type;
      if (req.file && req.file.path) group.group_banner = req.file.path;
    }

    // Admin and mods can change description and lock
    if (req.body.group_description)
      group.group_description = req.body.group_description;
    group.locked = !!req.body.locked;

    await group.save();
    // After changing group.locked and saving
    // Only send notification if locked status changed
    if (group.locked !== req.body.locked) {
      // Send notification to all members except the one who changed the status
      const emoji = group.locked ? "🔒" : "🔓";
      const msg = group.locked
        ? `The group "${group.group_name}" has been locked. Only admins and moderators can chat now. ${emoji}`
        : `The group "${group.group_name}" has been unlocked. Everyone can chat again! ${emoji}`;
      await Promise.all(
        group.members
          .filter((id) => id.toString() !== req.user._id.toString())
          .map((id) =>
            sendNotification(id, {
              from: req.user._id,
              message: msg,
              type: "group-lock-status",
              reference: group._id,
            })
          )
      );
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Update group settings error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function demoteModerator(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    // Only admin can demote
    if (group.admin.toString() !== req.user._id.toString())
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    const { userId } = req.body;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });

    // Don't demote admin or someone who isn't a mod
    if (
      userId === group.admin.toString() ||
      !group.moderators.map(String).includes(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid demotion" });
    }

    group.moderators = group.moderators.filter(
      (id) => id.toString() !== userId
    );
    await group.save();
    // After group.moderators = ...; await group.save();
    await sendNotification(userId, {
      from: req.user._id,
      message: `You have been demoted from Moderator in "${group.group_name}" 😔`,
      type: "group-demotion",
      reference: group._id,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Demote error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function deleteGroup(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    // Only admin can delete
    if (group.admin.toString() !== req.user._id.toString())
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    await group.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete group error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function approveJoinRequest(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    // Only admin or mod can approve
    const isAdmin = group.admin.toString() === req.user._id.toString();
    const isMod = group.moderators
      .map(String)
      .includes(req.user._id.toString());
    if (!isAdmin && !isMod)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    const { userId } = req.body;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });

    // Remove from joinRequests and add to members
    group.joinRequests = group.joinRequests.filter(
      (jr) => jr.user.toString() !== userId
    );
    if (!group.members.map(String).includes(userId)) {
      group.members.push(userId);
    }
    await group.save();
    // After adding to members and saving
    await sendNotification(userId, {
      from: req.user._id,
      message: `Your request to join "${group.group_name}" was approved! 🎊`,
      type: "group-join-approved",
      reference: group._id,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Approve join request error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function rejectJoinRequest(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    // Only admin or mod can reject
    const isAdmin = group.admin.toString() === req.user._id.toString();
    const isMod = group.moderators
      .map(String)
      .includes(req.user._id.toString());
    if (!isAdmin && !isMod)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    const { userId } = req.body;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });

    // Remove from joinRequests
    group.joinRequests = group.joinRequests.filter(
      (jr) => jr.user.toString() !== userId
    );
    await group.save();
    // After removing from joinRequests and saving
    await sendNotification(userId, {
      from: req.user._id,
      message: `Your request to join "${group.group_name}" was rejected. ❌`,
      type: "group-join-rejected",
      reference: group._id,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Reject join request error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function checkGroupMembership(req, res, next) {
  try {
      const groupId = req.params.id;
      const group = await Group.findById(groupId);
      
      if (!group) {
          return res.status(404).redirect('/user/groups');
      }

      // Check if user is a member
      const isMember = group.members.some(
          memberId => memberId.toString() === req.user._id.toString()
      );

      if (!isMember) {
          req.flash('error', 'You must be a member to view this group chat');
          return res.redirect('/user/groups');
      }

      // Add group to request object for later use
      req.group = group;
      next();
  } catch (err) {
      console.error('Group auth error:', err);
      res.status(500).redirect('/user/groups');
  }
}

async function blockMember(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res.status(404).json({ success: false, message: "Group not found" });

    // Only admin can block
    if (group.admin.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not authorized" });

    const { userId } = req.body;
    if (!userId)
      return res.status(400).json({ success: false, message: "User ID required" });

    // Don't block admin
    if (userId === group.admin.toString()) {
      return res.status(400).json({ success: false, message: "Cannot block admin" });
    }

    // Add to blocked_members if not already blocked
    if (!group.blocked_members.map(String).includes(userId)) {
      group.blocked_members.push(userId);
      await group.save();

      // Notify the blocked user
      await sendNotification(userId, {
        from: req.user._id,
        message: `You have been blocked in "${group.group_name}" 🚫`,
        type: "group-block",
        reference: group._id,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Block member error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function unblockMember(req, res) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group)
      return res.status(404).json({ success: false, message: "Group not found" });

    // Only admin can unblock
    if (group.admin.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not authorized" });

    const { userId } = req.body;
    if (!userId)
      return res.status(400).json({ success: false, message: "User ID required" });

    group.blocked_members = group.blocked_members.filter(id => id.toString() !== userId);
    await group.save();

    // Notify the unblocked user
    await sendNotification(userId, {
      from: req.user._id,
      message: `You have been unblocked in "${group.group_name}" ✅`,
      type: "group-unblock",
      reference: group._id,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Unblock member error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  joinGroup,
  leaveGroup,
  promoteToModerator,
  kickMember,
  updateGroupSettings,
  demoteModerator,
  deleteGroup,
  approveJoinRequest,
  rejectJoinRequest,
  checkGroupMembership,
  blockMember,
  unblockMember,
};
