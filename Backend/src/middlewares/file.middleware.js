const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 5,
    parts: 6,
    fieldSize: 1024 * 1024
  },
  fileFilter(req, file, callback) {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfName = /\.pdf$/i.test(file.originalname || "");

    if (!isPdfMime || !isPdfName) {
      const error = new Error("Only PDF resume files are allowed.");
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  }
});

function validatePdfSignature(req, res, next) {
  if (!req.file) return next();

  const signature = req.file.buffer.subarray(0, 5).toString("ascii");

  if (signature !== "%PDF-") {
    return res.status(400).json({
      success: false,
      message: "The uploaded file is not a valid PDF."
    });
  }

  return next();
}

module.exports = upload;
module.exports.validatePdfSignature = validatePdfSignature;