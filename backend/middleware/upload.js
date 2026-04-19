const multer = require("multer");

const storage = multer.diskStorage({
 destination: function (req, file, cb) {
  cb(null, "uploads/");
 },
 filename: function (req, file, cb) {
  cb(null, Date.now() + "-" + file.originalname);
 }
});

const upload = multer({
 storage,
 limits: { fileSize: 5 * 1024 * 1024 },
 fileFilter(req, file, cb) {
  if (
   file.mimetype === "application/pdf" ||
   file.mimetype === "image/jpeg" ||
   file.mimetype === "image/png"
  ) {
   cb(null, true);
  } else {
   cb(new Error("Only PDF or JPG allowed"));
  }
 }
});

module.exports = upload;