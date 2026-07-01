const express = require("express");
const router = express.Router();
const { register, login, changePassword, me } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", authMiddleware, changePassword);
router.get("/me", authMiddleware, me);

module.exports = router;