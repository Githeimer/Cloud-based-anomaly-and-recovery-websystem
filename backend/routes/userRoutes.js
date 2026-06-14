const express = require("express");
const router = express.Router();
const { getProfile, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

module.exports = router;