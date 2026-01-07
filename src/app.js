const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");

const app = express();

const isProd = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: isProd ? process.env.CLIENT_URL : "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => res.send("✅ Photo API running"));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

// error handler
app.use((err, req, res, next) => {
  if (isProd) {
    return res.status(500).json({ message: "Internal server error" });
  }
  return res.status(500).json({ message: err.message, stack: err.stack });
});

module.exports = app;
