const express = require("express");
const { login, createUser, getMe } = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", createUser);
router.post("/login", login);
router.get("/me", auth, getMe);

module.exports = router;
