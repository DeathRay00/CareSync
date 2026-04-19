const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

router.post("/upload-report", upload.single("report"), (req, res) => {

 if (!req.file) {
  return res.status(400).json({ message: "No file uploaded" });
 }

 res.status(200).json({
  message: "Report uploaded successfully",
  file: req.file.filename
 });

});

module.exports = router;