const express = require("express");
const router = express.Router();
const { createRecord, getRecords, updateRecord, deleteRecord } = require("../controllers/recordController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // all record routes need login

router.post("/", createRecord);
router.get("/", getRecords);
router.put("/:id", updateRecord);
router.delete("/:id", deleteRecord);

module.exports = router;