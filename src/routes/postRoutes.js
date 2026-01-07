const express = require("express");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const postController = require("../controllers/postController");
const {
  upload,
  createPost,
  getFeed,
  toggleLike,
  addComment,
  getComments
} = require("../controllers/postController");

const router = express.Router();

// feed
router.get("/", auth, getFeed);

// creator upload
router.post("/", auth, role("creator"), upload.single("image"), createPost);

// like/unlike
router.post("/:id/like", auth, toggleLike);

// comments
router.get("/:id/comments", auth, getComments);
router.post("/:id/comments", auth, addComment);

// NEW: edit caption (creator only)
router.put("/:id", auth, role("creator"), postController.updatePost);

// NEW: delete post (creator only)
router.delete("/:id", auth, role("creator"), postController.deletePost);

router.get("/:id/download", postController.downloadPostImage);

module.exports = router;
