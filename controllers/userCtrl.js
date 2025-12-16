const Users = require("../models/userModel");

const userCtrl = {
  searchUser: async (req, res) => {
    try {
      const users = await Users.find({
        username: { $regex: req.query.username },
      })
        .limit(10)
        .select("fullname username avatar");

      res.json({ users });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUser: async (req, res) => {
    try {
      const user = await Users.findById(req.params.id)
        .select("-password")
        .populate("followers following", "-password");

      if (!user) {
        return res.status(400).json({ msg: "Requested user does not exist." });
      }

      if (user.blockedUsers.includes(req.user._id)) {
        return res.status(403).json({ msg: "You are blocked by this user." });
      }

      if (user.privacySettings.profileVisibility === "private") {
        const isFollowing = user.followers.some(
          (follower) => follower._id.toString() === req.user._id.toString()
        );
        const isFollower = user.following.some(
          (following) => following._id.toString() === req.user._id.toString()
        );

        if (
          !isFollowing &&
          !isFollower &&
          user._id.toString() !== req.user._id.toString()
        ) {
          return res.json({
            user: {
              _id: user._id,
              username: user.username,
              fullname: user.fullname,
              avatar: user.avatar,
              privacySettings: { profileVisibility: "private" },
            },
            message: "This account is private",
          });
        }
      }

      const userData = user.toObject();
      if (!user.privacySettings.showFollowers) {
        userData.followers = [];
      }
      if (!user.privacySettings.showFollowing) {
        userData.following = [];
      }

      res.json({ user: userData });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const {
        avatar,
        fullname,
        mobile,
        address,
        story,
        website,
        gender,
      } = req.body;
      if (!fullname) {
        return res.status(400).json({ msg: "Please add your full name." });
      }

      await Users.findOneAndUpdate(
        { _id: req.user._id },
        { avatar, fullname, mobile, address, story, website, gender }
      );

      res.json({ msg: "Profile updated successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updatePrivacySettings: async (req, res) => {
    try {
      const {
        profileVisibility,
        whoCanMessage,
        whoCanComment,
        whoCanTag,
        showFollowers,
        showFollowing,
      } = req.body;

      const privacySettings = {};

      if (profileVisibility) privacySettings.profileVisibility = profileVisibility;
      if (whoCanMessage) privacySettings.whoCanMessage = whoCanMessage;
      if (whoCanComment) privacySettings.whoCanComment = whoCanComment;
      if (whoCanTag) privacySettings.whoCanTag = whoCanTag;
      if (typeof showFollowers !== "undefined")
        privacySettings.showFollowers = showFollowers;
      if (typeof showFollowing !== "undefined")
        privacySettings.showFollowing = showFollowing;

      const user = await Users.findByIdAndUpdate(
        req.user._id,
        { $set: { privacySettings } },
        { new: true }
      ).select("-password");

      res.json({
        msg: "Privacy settings updated successfully.",
        privacySettings: user.privacySettings,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPrivacySettings: async (req, res) => {
    try {
      const user = await Users.findById(req.user._id).select("privacySettings");

      res.json({ privacySettings: user.privacySettings });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  blockUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (id === req.user._id.toString()) {
        return res.status(400).json({ msg: "You cannot block yourself." });
      }

      const user = await Users.findById(id);
      if (!user) {
        return res.status(400).json({ msg: "User not found." });
      }

      const currentUser = await Users.findById(req.user._id);
      if (currentUser.blockedUsers.includes(id)) {
        return res.status(400).json({ msg: "User is already blocked." });
      }

      await Users.findByIdAndUpdate(req.user._id, {
        $push: { blockedUsers: id },
        $pull: { following: id, followers: id },
      });

      await Users.findByIdAndUpdate(id, {
        $push: { blockedByUsers: req.user._id },
        $pull: { following: req.user._id, followers: req.user._id },
      });

      res.json({ msg: "User blocked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unblockUser: async (req, res) => {
    try {
      const { id } = req.params;

      await Users.findByIdAndUpdate(req.user._id, {
        $pull: { blockedUsers: id },
      });

      await Users.findByIdAndUpdate(id, {
        $pull: { blockedByUsers: req.user._id },
      });

      res.json({ msg: "User unblocked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getBlockedUsers: async (req, res) => {
    try {
      const user = await Users.findById(req.user._id)
        .populate("blockedUsers", "username fullname avatar")
        .select("blockedUsers");

      res.json({ blockedUsers: user.blockedUsers });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  checkBlocked: async (req, res) => {
    try {
      const { id } = req.params;

      const currentUser = await Users.findById(req.user._id).select(
        "blockedUsers"
      );
      const isBlocked = currentUser.blockedUsers.includes(id);

      res.json({ isBlocked });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  follow: async (req, res) => {
    try {
      const targetUser = await Users.findById(req.params.id);
      if (targetUser.blockedUsers.includes(req.user._id)) {
        return res.status(403).json({ msg: "You cannot follow this user." });
      }

      const user = await Users.find({
        _id: req.params.id,
        followers: req.user._id,
      });
      if (user.length > 0)
        return res
          .status(500)
          .json({ msg: "You are already following this user." });

      const newUser = await Users.findOneAndUpdate(
        { _id: req.params.id },
        {
          $push: {
            followers: req.user._id,
          },
        },
        { new: true }
      ).populate("followers following", "-password");

      await Users.findOneAndUpdate(
        { _id: req.user._id },
        { $push: { following: req.params.id } },
        { new: true }
      );

      res.json({ newUser });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unfollow: async (req, res) => {
    try {
      const newUser = await Users.findOneAndUpdate(
        { _id: req.params.id },
        {
          $pull: { followers: req.user._id },
        },
        { new: true }
      ).populate("followers following", "-password");

      await Users.findOneAndUpdate(
        { _id: req.user._id },
        { $pull: { following: req.params.id } },
        { new: true }
      );

      res.json({ newUser });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  suggestionsUser: async (req, res) => {
    try {
      const currentUser = await Users.findById(req.user._id)
        .select("following blockedUsers blockedByUsers")
        .lean();

      const newArr = [
        ...currentUser.following,
        req.user._id,
        ...currentUser.blockedUsers,
        ...currentUser.blockedByUsers,
      ];

      const num = parseInt(req.query.num) || 10;

      const users = await Users.aggregate([
        {
          $match: {
            _id: { $nin: newArr },
            role: "user", 
            isBlocked: false, 
          },
        },
        { $sample: { size: Number(num) } },
        {
          $lookup: {
            from: "users",
            localField: "followers",
            foreignField: "_id",
            as: "followers",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "following",
            foreignField: "_id",
            as: "following",
          },
        },
        {
          $project: {
            password: 0,
            resetPasswordToken: 0,
            verificationToken: 0,
          },
        },
      ]);

      return res.json({
        users,
        result: users.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = userCtrl;