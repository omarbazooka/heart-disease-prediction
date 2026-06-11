const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "labtests");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeOriginal = String(file.originalname || "file.csv").replace(
      /[^\w.\-]+/g,
      "_"
    );
    const stamp = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${stamp}_${safeOriginal}`);
  },
});

const csvOnly = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mimetype = String(file.mimetype || "").toLowerCase();

  const isCsv =
    ext === ".csv" ||
    mimetype.includes("csv") ||
    mimetype === "application/vnd.ms-excel";

  if (!isCsv) {
    return cb(new Error("Only .csv files are allowed"));
  }

  cb(null, true);
};

const uploadLabTestsCsvs = multer({
  storage,
  fileFilter: csvOnly,
  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024,
  },
}).array("files", 5);

const uploadLabTestCsv = multer({
  storage,
  fileFilter: csvOnly,
  limits: {
    files: 1,
    fileSize: 10 * 1024 * 1024,
  },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 1 },
]);

module.exports = {
  uploadLabTestsCsvs,
  uploadLabTestCsv,
  uploadDir,
};