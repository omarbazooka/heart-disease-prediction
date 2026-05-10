const express = require("express");
const { validate } = require("../middlewares/validate");
const { labTestCreateSchema, labTestUpdateSchema } = require("../validators/labtest.schema");
const { authenticate } = require("../middlewares/auth");

const {
  uploadLabTestsCsvs: uploadMiddleware,
  uploadLabTestCsv: uploadSingleMiddleware,
} = require("../middlewares/uploadLabTestsCsvs");

const {
  createLabTest,
  uploadLabTestsCsvs,
  uploadLabTestCsvForUser,
  getLabTests,
  getLabTestById,
  getLabTestsByNationalId,
  getLatestLabTestByNationalId,
  getLabTestStatusByNationalId,
  getMyLabTestStatus,
  getLabTestsByLabId,
  updateLabTest,
  deleteLabTest,
} = require("../controllers/labtestController");

const router = express.Router();

/* ---------------- CREATE ---------------- */
router.post("/", authenticate, validate(labTestCreateSchema), createLabTest);

/* ---------------- CSV UPLOADS ---------------- */
router.post("/upload-csv", authenticate, uploadSingleMiddleware, uploadLabTestCsvForUser);
router.post("/upload-csvs", authenticate, uploadMiddleware, uploadLabTestsCsvs);

/* ---------------- GENERAL ---------------- */
router.get("/", getLabTests);

/* ---------------- AUTH USER ---------------- */
router.get("/me/status", authenticate, getMyLabTestStatus);


/* ---------------- PATIENT ROUTES ---------------- */
router.get("/patient/:national_id/status", getLabTestStatusByNationalId);
router.get("/patient/:national_id/latest", getLatestLabTestByNationalId);
router.get("/patient/:national_id", getLabTestsByNationalId);

/* ---------------- LAB ROUTES ---------------- */
router.get("/lab/:lab_id", getLabTestsByLabId);

/* ---------------- SINGLE RESOURCE (MUST BE LAST) ---------------- */

// Static path prefixes before /:id so "patient" / "lab" are not treated as ids
router.get("/patient/:national_id/status", getLabTestStatusByNationalId);
router.get("/patient/:national_id/latest", getLatestLabTestByNationalId);
router.get("/patient/:national_id", getLabTestsByNationalId);
router.get("/lab/:lab_id", getLabTestsByLabId);
router.get("/:id", getLabTestById);
router.put("/:id", authenticate, validate(labTestUpdateSchema), updateLabTest);
router.delete("/:id", authenticate, deleteLabTest);

module.exports = router;