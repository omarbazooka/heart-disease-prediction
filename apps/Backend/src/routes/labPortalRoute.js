const express = require("express");
const { requireLabKey } = require("../middlewares/requireLabKey");
const {
  uploadLabTestsCsvs: uploadBulkMiddleware,
  uploadLabTestCsv: uploadSingleMiddleware,
} = require("../middlewares/uploadLabTestsCsvs");
const {
  uploadLabTestsCsvs,
  uploadLabTestCsv,
  uploadLabEcg,
} = require("../controllers/labPortalController");
const { uploadEcgWfdb } = require("../middlewares/uploadEcgWfdb");

const router = express.Router();

router.use(requireLabKey);

router.post("/upload-csvs", uploadBulkMiddleware, uploadLabTestsCsvs);
router.post("/upload-csv", uploadSingleMiddleware, uploadLabTestCsv);
router.post("/ecg", uploadEcgWfdb, uploadLabEcg);

module.exports = router;
