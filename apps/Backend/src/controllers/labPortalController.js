const {
  LabCsvValidationError,
  processBulkCsvUpload,
  processSingleCsvUpload,
} = require("../services/labCsvIngestService");
const EcgService = require("../services/ecgService");

const uploadLabTestsCsvs = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length < 1 || files.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Upload between 1 and 5 CSV files (form-data key: files)",
      });
    }

    const expectedLabId = req.headers["x-lab-id"] || null;

    const { created, failures } = await processBulkCsvUpload(files, { expectedLabId });

    if (created.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No lab tests created from uploaded CSV files",
        failures,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Lab test CSV files processed",
      createdCount: created.length,
      failuresCount: failures.length,
      created,
      failures,
    });
  } catch (error) {
    next(error);
  }
};

const uploadLabTestCsv = async (req, res, next) => {
  try {
    const fileFromFields =
      (req.files && Array.isArray(req.files.file) && req.files.file[0]) ||
      (req.files && Array.isArray(req.files.files) && req.files.files[0]) ||
      null;
    const file = req.file || fileFromFields;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required (form-data key: file)",
      });
    }

    const expectedLabId = req.headers["x-lab-id"] || null;

    const created = await processSingleCsvUpload(file, { expectedLabId });

    return res.status(201).json({
      success: true,
      message: "Lab test CSV processed",
      created,
    });
  } catch (error) {
    if (error instanceof LabCsvValidationError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * POST /api/lab-portal/ecg — multipart dat_file, hea_file, national_id (form fields).
 * Requires x-lab-id matching the lab that owns the upload.
 */
const uploadLabEcg = async (req, res, next) => {
  try {
    const expectedLabId = req.headers["x-lab-id"] || null;
    if (!expectedLabId) {
      return res.status(400).json({
        success: false,
        message: "x-lab-id header is required",
      });
    }
    const dat = req.files?.dat_file?.[0];
    const hea = req.files?.hea_file?.[0];
    const national_id = req.body?.national_id;
    const data = await EcgService.createLabPortalUpload({
      expectedLabId,
      national_id,
      datFile: dat,
      heaFile: hea,
      client_request_id: req.body?.client_request_id,
    });
    return res.status(201).json({
      success: true,
      message: "ECG WFDB files stored",
      data,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  uploadLabTestsCsvs,
  uploadLabTestCsv,
  uploadLabEcg,
};
