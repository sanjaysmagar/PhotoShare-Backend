const multer = require("multer");
const { containerClient, deleteBlobIfExists } = require("../config/blob");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const mongoose = require("mongoose");
// const axios = require("axios");
const { Readable } = require("stream");

exports.upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 10MB
});

// Creator uploads photo + caption
exports.createPost = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Image is required" });

    const caption = (req.body.caption || "").toString();
    const title = (req.body.title || "").toString();
    const location = (req.body.location || "").toString();

    const blobName = `${Date.now()}-${req.file.originalname}`.replace(
      /\s+/g,
      "-"
    );
    const blob = containerClient.getBlockBlobClient(blobName);

    await blob.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    const post = await Post.create({
      title,
      location,
      caption,
      imageUrl: blob.url,
      blobName,
      creator: req.user.id,
      likes: [],
    });

    res.status(201).json({ success: true, post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/posts?q=searchTerm
exports.getFeed = async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();

    // 1) search filter (if q exists)
    const searchFilter = q
      ? {
          $or: [
            { title: { $regex: q, $options: "i" } },
            { caption: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    // 2) role-based filter (creator sees only own posts)
    const role = req.user?.role; // auth middleware must set this
    const userId = req.user?.id; // or req.user._id depending on your token

    const roleFilter = role === "creator" ? { creator: userId } : {};

    // 3) merge both filters
    const finalFilter = { ...searchFilter, ...roleFilter };

    const posts = await Post.find(finalFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("creator", "email role");

    res.json({ success: true, posts, q });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Like/unlike (toggle)
exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });

    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({ postId, likesCount: post.likes.length, liked: !alreadyLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;

    if (!text)
      return res
        .status(400)
        .json({ success: false, message: "text is required" });

    const comment = await Comment.create({
      post: postId,
      user: req.user.id,
      text,
    });

    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/posts/:id/comments
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;

    // 1) validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post ID" });
    }

    // 2) check post exists
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // 3) fetch ALL comments for that post
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("user", "email role");

    return res.json({
      success: true,
      postId,
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id; // from auth middleware
    const { caption, title, location } = req.body;

    // 1) find post
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });

    // 2) only owner creator can edit
    if (String(post.creator) !== String(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not allowed to edit this post" });
    }

    // 3) caption can be empty (your requirement)
    post.caption = (caption ?? "").toString(); // safe
    post.title = (title ?? "").toString();
    post.location = (location ?? "").toString();
    await post.save();

    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });

    // only owner creator can delete
    if (String(post.creator) !== String(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not allowed to delete this post" });
    }

    // ✅ optional: delete image from Azure Blob Storage
    // make sure your Post schema stores blobName like you had earlier
    if (post.blobName) {
      await deleteBlobIfExists(post.blobName);
    }

    // ✅ optional: delete comments related to that post
    await Comment.deleteMany({ post: postId });

    // delete post
    await Post.findByIdAndDelete(postId);

    return res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.downloadPostImage = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });

    const url = post.imageUrl || post.image_url;
    if (!url)
      return res.status(400).json({ success: false, message: "No image URL" });

    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({
        success: false,
        message: "Failed to fetch image from storage",
      });
    }

    const contentType =
      resp.headers.get("content-type") || "application/octet-stream";

    const filename =
      post.blobName ||
      `photo-${post._id}.${
        contentType.includes("png")
          ? "png"
          : contentType.includes("jpeg")
          ? "jpg"
          : "img"
      }`;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // ✅ Convert WebStream -> Node stream, then pipe
    const nodeStream = Readable.fromWeb(resp.body);
    nodeStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Download failed" });
  }
};
