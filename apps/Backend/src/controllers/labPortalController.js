const {
  LabCsvValidationError,
  processBulkCsvUpload,
  processSingleCsvUpload,
} = require("../services/labCsvIngestService");

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

module.exports = {
  uploadLabTestsCsvs,
  uploadLabTestCsv,
};
