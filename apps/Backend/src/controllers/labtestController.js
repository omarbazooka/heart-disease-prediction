const prisma = require("../config/prisma");
const { handlePrismaError } = require("../middlewares/prismaErrors");
const {
  LabCsvValidationError,
  labTestInclude,
  shapeLabTest,
  processSingleCsvUpload,
} = require("../services/labCsvIngestService");


const flattenFeatures = (body) => {
  const { features, ...rest } = body;
  return { ...rest, ...(features || {}) };
};

const createLabTest = async (req, res, next) => {
  try {
    const data = flattenFeatures(req.body);
    const labTest = await prisma.labTest.create({
      data,
      include: labTestInclude,
    });
    res.status(201).json({ success: true, data: shapeLabTest(labTest) });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    next(err);
  }
};

const uploadLabTestCsvForUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
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

    const createdOne = await processSingleCsvUpload(file, {
      enforceNationalId: req.user.national_id,
      reqUser: req.user,
    });

    res.status(201).json({
      success: true,
      message: "Lab test CSV processed for current user",
      created: createdOne,
    });
  } catch (err) {
    if (err instanceof LabCsvValidationError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }
    if (handlePrismaError(err, res)) return;
    next(err);
  }
};

const getLabTests = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [total, labTests] = await Promise.all([
      prisma.labTest.count(),
      prisma.labTest.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: labTestInclude,
      }),
    ]);

    res.json({
      success: true,
      data: labTests.map(shapeLabTest),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getLabTestById = async (req, res, next) => {
  try {
    const labTest = await prisma.labTest.findUnique({
      where: { id: req.params.id },
      include: labTestInclude,
    });
    if (!labTest) return res.status(404).json({ success: false, message: "Lab test not found" });
    res.json({ success: true, data: shapeLabTest(labTest) });
  } catch (err) {
    next(err);
  }
};

/** Include prediction summary for patient dashboards (no large binary fields). */
const patientLabTestInclude = {
  lab: true,
  prediction: {
    select: {
      id: true,
      prediction_percentage: true,
      decision: true,
      risk_level: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const getLabTestsByNationalId = async (req, res, next) => {
  try {
    const labTests = await prisma.labTest.findMany({
      where: { national_id: req.params.national_id },
      orderBy: { createdAt: "desc" },
      include: patientLabTestInclude,
    });
    res.json({ success: true, data: labTests.map(shapeLabTest) });
  } catch (err) {
    next(err);
  }
};

const getLatestLabTestByNationalId = async (req, res, next) => {
  try {
    const labTest = await prisma.labTest.findFirst({
      where: { national_id: req.params.national_id },
      orderBy: { createdAt: "desc" },
      include: labTestInclude,
    });
    if (!labTest) return res.status(404).json({ success: false, message: "No lab tests found for this patient" });
    res.json({ success: true, data: shapeLabTest(labTest) });
  } catch (err) {
    next(err);
  }
};

const getLabTestStatusByNationalId = async (req, res, next) => {
  try {
    const national_id = req.params.national_id;
    const count = await prisma.labTest.count({ where: { national_id } });
    res.json({
      success: true,
      data: {
        national_id,
        labTestsCount: count,
        hasLabTests: count > 0,
        recommendation: count > 0 ? "labtests" : "labs",
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMyLabTestStatus = async (req, res, next) => {
  try {
    if (!req.user?.national_id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const national_id = String(req.user.national_id);
    const count = await prisma.labTest.count({ where: { national_id } });
    res.json({
      success: true,
      data: {
        national_id,
        labTestsCount: count,
        hasLabTests: count > 0,
        recommendation: count > 0 ? "labtests" : "labs",
      },
    });
  } catch (err) {
    next(err);
  }
};

const getLabTestsByLabId = async (req, res, next) => {
  try {
    const labTests = await prisma.labTest.findMany({
      where: { lab_id: req.params.lab_id },
      orderBy: { createdAt: "desc" },
      include: labTestInclude,
    });
    res.json({ success: true, data: labTests.map(shapeLabTest) });
  } catch (err) {
    next(err);
  }
};

const updateLabTest = async (req, res, next) => {
  try {
    const data = flattenFeatures(req.body);
    const labTest = await prisma.labTest.update({
      where: { id: req.params.id },
      data,
      include: labTestInclude,
    });
    res.json({ success: true, data: shapeLabTest(labTest) });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    next(err);
  }
};

const deleteLabTest = async (req, res, next) => {
  try {
    await prisma.labTest.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Lab test deleted successfully" });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    next(err);
  }
};

module.exports = {
  createLabTest,
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
};
