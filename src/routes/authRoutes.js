const express = require("express");
const { login, createUser } = require("../controllers/authcontroller");

const router = express.Router();

router.post("/signup", createUser);
router.post("/login", login);

module.exports = router;
