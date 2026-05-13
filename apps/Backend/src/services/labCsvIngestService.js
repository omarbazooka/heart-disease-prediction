const { parse } = require("csv-parse/sync");
const prisma = require("../config/prisma");

class LabCsvValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.name = "LabCsvValidationError";
  }
}

const labTestInclude = { lab: true };

const shapeLabTest = (labTest) => {
  if (!labTest) return null;
  const {
    age,
    sex,
    chest_pain_type,
    resting_bp_s,
    cholesterol,
    fasting_blood_sugar,
    resting_ecg,
    max_heart_rate,
    exercise_angina,
    oldpeak,
    st_slope,
    ...rest
  } = labTest;
  return {
    ...rest,
    features: {
      age,
      sex,
      chest_pain_type,
      resting_bp_s,
      cholesterol,
      fasting_blood_sugar,
      resting_ecg,
      max_heart_rate,
      exercise_angina,
      oldpeak,
      st_slope,
    },
  };
};

const normalizeLabCode = (labCode) => String(labCode || "").trim();

const isAllowedLabCode = (labCode) => {
  const value = normalizeLabCode(labCode).toLowerCase();
  return value.includes("al borg") || value.includes("al mokhtabar");
};

const parseSingleRowCsv = (csvText) => {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  if (!records || records.length === 0) {
    throw new LabCsvValidationError("CSV contains no data rows");
  }
  return records[0];
};

const createLabTestFromCsvRow = async ({ row, file, enforceNationalId, reqUser, expectedLabId }) => {
  const lab_id = String(row.lab_id || "").trim();
  const national_id = String(row.national_id || enforceNationalId || "").trim();
  const lab_code = normalizeLabCode(row.lab_code);

  if (!lab_id || !national_id || !lab_code) {
    throw new LabCsvValidationError("CSV row must include lab_id, national_id, lab_code");
  }
  if (!/^\d{14}$/.test(national_id)) {
    throw new LabCsvValidationError("national_id must be exactly 14 digits");
  }

  if (reqUser?.national_id && enforceNationalId) {
    if (national_id !== String(reqUser.national_id)) {
      throw new LabCsvValidationError(
        "CSV national_id must match the logged-in user. Lab uploads use POST /api/lab-portal/upload-csv with x-lab-key (no patient JWT)."
      );
    }
  }

  if (!isAllowedLabCode(lab_code)) {
    throw new LabCsvValidationError("lab_code must belong to AL Borg Labs or AL Mokhtabar labs only");
  }

  const lab = await prisma.lab.findUnique({ where: { id: lab_id } });
  if (!lab) throw new LabCsvValidationError("lab_id does not exist");
  if (String(lab.lab_code).trim() !== lab_code) {
    throw new LabCsvValidationError("lab_code does not match the lab_id in database");
  }

  if (expectedLabId && String(expectedLabId).trim() !== lab_id) {
    throw new LabCsvValidationError(
      "This CSV belongs to a different lab. You can only upload CSVs for your own lab."
    );
  }

  const numeric = (key) =>
    row[key] === undefined || row[key] === null || row[key] === "" ? undefined : Number(row[key]);
  const intLike = (key) =>
    row[key] === undefined || row[key] === null || row[key] === ""
      ? undefined
      : parseInt(row[key], 10);

  const data = {
    lab_id,
    national_id,
    age: numeric("age"),
    sex: intLike("sex"),
    chest_pain_type: intLike("chest_pain_type"),
    resting_bp_s: numeric("resting_bp_s"),
    cholesterol: numeric("cholesterol"),
    fasting_blood_sugar: intLike("fasting_blood_sugar"),
    resting_ecg: intLike("resting_ecg"),
    max_heart_rate: numeric("max_heart_rate"),
    exercise_angina: intLike("exercise_angina"),
    oldpeak: numeric("oldpeak"),
    st_slope: intLike("st_slope"),
  };

  const requiredKeys = [
    "age",
    "sex",
    "chest_pain_type",
    "resting_bp_s",
    "cholesterol",
    "fasting_blood_sugar",
    "resting_ecg",
    "max_heart_rate",
    "exercise_angina",
    "oldpeak",
    "st_slope",
  ];
  for (const key of requiredKeys) {
    if (data[key] === undefined || Number.isNaN(data[key])) {
      throw new LabCsvValidationError(`Missing/invalid column: ${key}`);
    }
  }

  const labTest = await prisma.labTest.create({
    data,
    include: labTestInclude,
  });

  return {
    id: labTest.id,
    national_id,
    lab_id,
    lab_code,
    file: {
      originalname: file?.originalname,
    },
    data: shapeLabTest(labTest),
  };
};

const processBulkCsvUpload = async (
  files,
  { enforceNationalId = null, reqUser = null, expectedLabId = null } = {}
) => {
  const created = [];
  const failures = [];
  const seenNationalIds = new Set();

  for (const file of files) {
    try {
      const csvText = file.buffer.toString("utf8");
      const row = parseSingleRowCsv(csvText);
      const national_id = String(row.national_id || "").trim();
      if (seenNationalIds.has(national_id)) {
        throw new LabCsvValidationError(
          "Duplicate national_id across uploaded CSVs (each user must have 1 CSV)"
        );
      }
      const createdOne = await createLabTestFromCsvRow({
        row,
        file,
        enforceNationalId,
        reqUser,
        expectedLabId,
      });
      seenNationalIds.add(createdOne.national_id);
      created.push(createdOne);
    } catch (error) {
      failures.push({
        file: file?.originalname,
        error: error?.message || String(error),
      });
    }
  }

  return { created, failures };
};

const processSingleCsvUpload = async (
  file,
  { enforceNationalId = null, reqUser = null, expectedLabId = null } = {}
) => {
  const csvText = file.buffer.toString("utf8");
  const row = parseSingleRowCsv(csvText);
  return createLabTestFromCsvRow({
    row,
    file,
    enforceNationalId,
    reqUser,
    expectedLabId,
  });
};

module.exports = {
  LabCsvValidationError,
  labTestInclude,
  shapeLabTest,
  createLabTestFromCsvRow,
  processBulkCsvUpload,
  processSingleCsvUpload,
};
