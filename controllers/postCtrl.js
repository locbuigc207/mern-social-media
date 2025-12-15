const Posts = require("../models/postModel");
const Comments = require("../models/commentModel");
const Users = require("../models/userModel");
const { uploadMultipleToCloudinary } = require("../services/cloudinaryService");
const logger = require("../utils/logger");

class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  paginating() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 9;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

const postCtrl = {
  createPost: async (req, res) => {
    try {
      const { content, status, scheduledDate, isDraft } = req.body;

      let images = [];
      if (req.files && req.files.length > 0) {
        logger.info('Uploading files to Cloudinary', {
          userId: req.user._id,
          fileCount: req.files.length
        });

        const filePaths = req.files.map(file => file.path);
        const uploadResult = await uploadMultipleToCloudinary(filePaths, {
          folder: 'campus-connect/posts',
          resourceType: 'auto'
        });

        if (!uploadResult.success) {
          logger.error('Cloudinary upload failed', null, {
            userId: req.user._id,
            errors: uploadResult.errors
          });
          return res.status(500).json({
            msg: 'Failed to upload some images.',
            errors: uploadResult.errors
          });
        }

        images = uploadResult.results.map(result => ({
          url: result.url,
          publicId: result.publicId,
          type: result.type,
          width: result.width,
          height: result.height
        }));

        logger.info('Files uploaded successfully', {
          userId: req.user._id,
          uploadedCount: images.length
        });
      }

      if (!isDraft && images.length === 0) {
        return res.status(400).json({
          msg: "Please add at least one photo or video."
        });
      }

      if (status === 'scheduled') {
        if (!scheduledDate) {
          return res.status(400).json({
            msg: "Please provide scheduled date."
          });
        }

        const scheduleDate = new Date(scheduledDate);
        if (scheduleDate <= new Date()) {
          return res.status(400).json({
            msg: "Scheduled date must be in the future."
          });
        }
      }

      const newPost = new Posts({
        content: content || '',
        images,
        user: req.user._id,
        status: status || 'published',
        isDraft: isDraft || false,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        publishedAt: status === 'published' ? new Date() : null
      });

      await newPost.save();

      logger.audit('Post created', req.user._id, {
        postId: newPost._id,
        status: newPost.status,
        imagesCount: images.length
      });

      let message = "Post created successfully.";
      if (status === 'scheduled') {
        message = "Post scheduled successfully.";
      } else if (isDraft) {
        message = "Draft saved successfully.";
      }

      res.json({
        msg: message,
        newPost: {
          ...newPost._doc,
          user: req.user,
        },
      });
    } catch (err) {
      logger.error('Create post failed', err, {
        userId: req.user._id
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  getPosts: async (req, res) => {
    try {
      const features = new APIfeatures(
        Posts.find({
          user: [...req.user.following, req.user._id],
          status: 'published',
          isDraft: false
        }),
        req.query
      ).paginating();

      const posts = await features.query
        .sort("-createdAt")
        .populate("user likes", "avatar username fullname followers")
        .populate({
          path: "comments",
          populate: {
            path: "user likes",
            select: "-password",
          },
        });

      res.json({
        msg: "Success",
        result: posts.length,
        posts,
      });
    } catch (err) {
      if (logger) {
        logger.error('Get posts failed', err, { userId: req.user._id });
      }
      return res.status(500).json({ msg: err.message });
    }
  },

  getDraftPosts: async (req, res) => {
    try {
      const features = new APIfeatures(
        Posts.find({
          user: req.user._id,
          isDraft: true,
          status: 'draft'
        }),
        req.query
      ).paginating();

      const drafts = await features.query
        .sort("-updatedAt")
        .populate("user", "avatar username fullname");

      res.json({
        msg: "Success",
        result: drafts.length,
        drafts,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getScheduledPosts: async (req, res) => {
    try {
      const features = new APIfeatures(
        Posts.find({
          user: req.user._id,
          status: 'scheduled'
        }),
        req.query
      ).paginating();

      const scheduledPosts = await features.query
        .sort("scheduledDate")
        .populate("user", "avatar username fullname");

      res.json({
        msg: "Success",
        result: scheduledPosts.length,
        scheduledPosts,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  saveDraft: async (req, res) => {
    try {
      const { content, images } = req.body;

      const newDraft = new Posts({
        content,
        images: images || [],
        user: req.user._id,
        status: 'draft',
        isDraft: true
      });

      await newDraft.save();

      res.json({
        msg: "Draft saved successfully.",
        draft: {
          ...newDraft._doc,
          user: req.user,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  publishDraft: async (req, res) => {
    try {
      const { id } = req.params;

      const post = await Posts.findOne({
        _id: id,
        user: req.user._id,
        isDraft: true
      });

      if (!post) {
        return res.status(404).json({ msg: "Draft not found." });
      }

      if (post.images.length === 0) {
        return res.status(400).json({ msg: "Please add at least one image before publishing." });
      }

      post.status = 'published';
      post.isDraft = false;
      post.publishedAt = new Date();
      await post.save();

      const populatedPost = await Posts.findById(id)
        .populate("user likes", "avatar username fullname followers")
        .populate({
          path: "comments",
          populate: {
            path: "user likes",
            select: "-password",
          },
        });

      res.json({
        msg: "Draft published successfully.",
        post: populatedPost,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updateDraft: async (req, res) => {
    try {
      const { id } = req.params;
      const { content, images } = req.body;

      const draft = await Posts.findOne({
        _id: id,
        user: req.user._id,
        isDraft: true
      });

      if (!draft) {
        return res.status(404).json({ msg: "Draft not found." });
      }

      draft.content = content;
      draft.images = images;
      await draft.save();

      res.json({
        msg: "Draft updated successfully.",
        draft,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  deleteDraft: async (req, res) => {
    try {
      const { id } = req.params;

      const draft = await Posts.findOneAndDelete({
        _id: id,
        user: req.user._id,
        isDraft: true
      });

      if (!draft) {
        return res.status(404).json({ msg: "Draft not found." });
      }

      res.json({ msg: "Draft deleted successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  schedulePost: async (req, res) => {
    try {
      const { content, images, scheduledDate } = req.body;

      if (images.length === 0) {
        return res.status(400).json({ msg: "Please add photo(s)" });
      }

      if (!scheduledDate) {
        return res.status(400).json({ msg: "Please provide scheduled date." });
      }

      const scheduleDate = new Date(scheduledDate);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ msg: "Scheduled date must be in the future." });
      }

      const newPost = new Posts({
        content,
        images,
        user: req.user._id,
        status: 'scheduled',
        scheduledDate: scheduleDate,
        isDraft: false
      });

      await newPost.save();

      res.json({
        msg: `Post scheduled for ${scheduleDate.toLocaleString()}.`,
        post: {
          ...newPost._doc,
          user: req.user,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updateScheduledPost: async (req, res) => {
    try {
      const { id } = req.params;
      const { content, images, scheduledDate } = req.body;

      const post = await Posts.findOne({
        _id: id,
        user: req.user._id,
        status: 'scheduled'
      });

      if (!post) {
        return res.status(404).json({ msg: "Scheduled post not found." });
      }

      if (scheduledDate) {
        const scheduleDate = new Date(scheduledDate);
        if (scheduleDate <= new Date()) {
          return res.status(400).json({ msg: "Scheduled date must be in the future." });
        }
        post.scheduledDate = scheduleDate;
      }

      if (content) post.content = content;
      if (images) post.images = images;

      await post.save();

      res.json({
        msg: "Scheduled post updated successfully.",
        post,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  cancelScheduledPost: async (req, res) => {
    try {
      const { id } = req.params;

      const post = await Posts.findOne({
        _id: id,
        user: req.user._id,
        status: 'scheduled'
      });

      if (!post) {
        return res.status(404).json({ msg: "Scheduled post not found." });
      }

      post.status = 'draft';
      post.isDraft = true;
      post.scheduledDate = null;
      await post.save();

      res.json({
        msg: "Scheduled post cancelled and saved as draft.",
        post,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updatePost: async (req, res) => {
    try {
      const { content } = req.body;
      let images = [];

      if (req.files && req.files.length > 0) {
        const filePaths = req.files.map(file => file.path);
        const uploadResult = await uploadMultipleToCloudinary(filePaths, {
          folder: 'campus-connect/posts',
          resourceType: 'auto'
        });

        if (uploadResult.success) {
          images = uploadResult.results.map(result => ({
            url: result.url,
            publicId: result.publicId,
            type: result.type,
            width: result.width,
            height: result.height
          }));
        }
      }

      const existingPost = await Posts.findById(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ msg: "Post not found." });
      }

      if (existingPost.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ msg: "Unauthorized." });
      }

      const existingImages = JSON.parse(req.body.existingImages || '[]');
      const finalImages = [...existingImages, ...images];

      const post = await Posts.findByIdAndUpdate(
        req.params.id,
        {
          content: content || existingPost.content,
          images: finalImages
        },
        { new: true }
      )
        .populate("user likes", "avatar username fullname")
        .populate({
          path: "comments",
          populate: {
            path: "user likes",
            select: "-password",
          },
        });

      logger.audit('Post updated', req.user._id, {
        postId: req.params.id,
        newImagesCount: images.length
      });

      res.json({
        msg: "Post updated successfully.",
        newPost: post,
      });
    } catch (err) {
      logger.error('Update post failed', err, {
        userId: req.user._id,
        postId: req.params.id
      });
      return res.status(500).json({ msg: err.message });
    }
  },

  likePost: async (req, res) => {
    try {
      const post = await Posts.find({
        _id: req.params.id,
        likes: req.user._id,
      });
      if (post.length > 0) {
        return res
          .status(400)
          .json({ msg: "You have already liked this post" });
      }

      const like = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        {
          $push: { likes: req.user._id },
        },
        {
          new: true,
        }
      );

      if (!like) {
        return res.status(400).json({ msg: "Post does not exist." });
      }

      res.json({ msg: "Post liked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unLikePost: async (req, res) => {
    try {
      const like = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        {
          $pull: { likes: req.user._id },
        },
        {
          new: true,
        }
      );

      if (!like) {
        return res.status(400).json({ msg: "Post does not exist." });
      }

      res.json({ msg: "Post unliked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const features = new APIfeatures(
        Posts.find({
          user: req.params.id,
          status: 'published',
          isDraft: false
        }),
        req.query
      ).paginating();
      const posts = await features.query.sort("-createdAt");

      res.json({
        posts,
        result: posts.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPost: async (req, res) => {
    try {
      const post = await Posts.findById(req.params.id)
        .populate("user likes", "avatar username fullname followers")
        .populate({
          path: "comments",
          populate: {
            path: "user likes ",
            select: "-password",
          },
        });

      if (!post) {
        return res.status(400).json({ msg: "Post does not exist." });
      }

      res.json({ post });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPostDiscover: async (req, res) => {
    try {
      const newArr = [...req.user.following, req.user._id];

      const num = req.query.num || 8;

      const posts = await Posts.aggregate([
        {
          $match: {
            user: { $nin: newArr },
            status: 'published',
            isDraft: false
          }
        },
        { $sample: { size: Number(num) } },
      ]);

      res.json({
        msg: "Success",
        result: posts.length,
        posts,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  deletePost: async (req, res) => {
    try {
      const post = await Posts.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!post) {
        return res.status(404).json({ msg: "Post not found." });
      }

      await Comments.deleteMany({ _id: { $in: post.comments } });

      res.json({
        msg: "Post deleted successfully.",
        newPost: {
          ...post,
          user: req.user,
        },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  reportPost: async (req, res) => {
    try {
      const post = await Posts.find({
        _id: req.params.id,
        reports: req.user._id,
      });
      if (post.length > 0) {
        return res
          .status(400)
          .json({ msg: "You have already reported this post" });
      }

      const report = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        {
          $push: { reports: req.user._id },
        },
        {
          new: true,
        }
      );

      if (!report) {
        return res.status(400).json({ msg: "Post does not exist." });
      }

      res.json({ msg: "Post reported successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  savePost: async (req, res) => {
    try {
      const user = await Users.find({
        _id: req.user._id,
        saved: req.params.id,
      });
      if (user.length > 0) {
        return res
          .status(400)
          .json({ msg: "You have already saved this post." });
      }

      const save = await Users.findOneAndUpdate(
        { _id: req.user._id },
        {
          $push: { saved: req.params.id },
        },
        {
          new: true,
        }
      );

      if (!save) {
        return res.status(400).json({ msg: "User does not exist." });
      }

      res.json({ msg: "Post saved successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unSavePost: async (req, res) => {
    try {
      const save = await Users.findOneAndUpdate(
        { _id: req.user._id },
        {
          $pull: { saved: req.params.id },
        },
        {
          new: true,
        }
      );

      if (!save) {
        return res.status(400).json({ msg: "User does not exist." });
      }

      res.json({ msg: "Post removed from collection successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getSavePost: async (req, res) => {
    try {
      const features = new APIfeatures(
        Posts.find({
          _id: { $in: req.user.saved },
          status: 'published',
          isDraft: false
        }),
        req.query
      ).paginating();

      const savePosts = await features.query.sort("-createdAt");

      res.json({
        savePosts,
        result: savePosts.length,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = postCtrl;