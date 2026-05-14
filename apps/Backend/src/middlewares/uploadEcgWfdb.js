const path = require("path");
const multer = require("multer");

const storage = multer.memoryStorage();

const wfdbFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const field = file.fieldname;
  if (field === "dat_file" && ext !== ".dat") {
    return cb(new Error("dat_file must be a .dat file"));
  }
  if (field === "hea_file" && ext !== ".hea") {
    return cb(new Error("hea_file must be a .hea file"));
  }
  cb(null, true);
};

const uploadEcgWfdb = multer({
  storage,
  fileFilter: wfdbFilter,
  limits: {
    fileSize: 80 * 1024 * 1024,
    files: 2,
  },
}).fields([
  { name: "dat_file", maxCount: 1 },
  { name: "hea_file", maxCount: 1 },
]);

module.exports = { uploadEcgWfdb };
