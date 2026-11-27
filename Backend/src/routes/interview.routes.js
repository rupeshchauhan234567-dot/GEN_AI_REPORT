const express = require("express");
const router = express.Router();

const authUser = require("../middlewares/auth.middleware");
const upload = require("../middlewares/file.middleware");
const validatePdfSignature = upload.validatePdfSignature;

const {
  generateInterViewReportController,
  getInterviewReportController,
  deleteInterviewReportController,
  getAllInterviewReportsController,
  downloadResumePdfController
} = require("../controllers/interview.controller");

router.use(authUser);

router.post(
  "/",
  upload.single("resume"),
  validatePdfSignature,
  generateInterViewReportController
);

router.get("/", getAllInterviewReportsController);

router.get(
  "/report/:interviewId",
  getInterviewReportController
);

router.delete(
  "/report/:interviewId",
  deleteInterviewReportController
);

router.post(
  "/resume/pdf/:interviewReportId",
  downloadResumePdfController
);

module.exports = router;