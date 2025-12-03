const express = require("express");
const router = express.Router();
const { register, login, googleLogin } = require("../controllers/auth.controller");
const { userValidationsRequired } = require("../middlewares/user.validations");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/google
router.post("/google", googleLogin);

module.exports = router;
