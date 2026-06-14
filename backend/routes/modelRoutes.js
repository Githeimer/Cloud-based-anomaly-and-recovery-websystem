const express = require("express");
const router = express.Router();
const { getModels, createModel, updateModel, deleteModel } = require("../controllers/modelController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", getModels);
router.post("/", createModel);
router.put("/:id", updateModel);
router.delete("/:id", deleteModel);

module.exports = router;