const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    caption: { type: String, default: "", trim: true, maxlength: 2000 },

    imageUrl: { type: String, required: true },  // Blob URL
    blobName: { type: String, required: true },  // for delete later (optional)

    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Like system: store who liked (simple + good for coursework scale)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
