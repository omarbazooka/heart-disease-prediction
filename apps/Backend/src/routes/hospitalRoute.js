const express = require("express");
const { validate } = require("../middlewares/validate");
const { hospitalCreateSchema, hospitalUpdateSchema } = require("../validators/hospital.schema");
const { authenticate } = require("../middlewares/auth");
const { requireAdminKey } = require("../middlewares/requireAdminKey");
const {
  createHospital,
  getHospitals,
  getHospitalById,
  getHospitalsByArea,
  updateHospital,
  deleteHospital,
} = require("../controllers/hospitalController");

const router = express.Router();

router.post("/", authenticate, requireAdminKey, validate(hospitalCreateSchema), createHospital);
router.get("/", getHospitals);
// Static path before /:id so "area" is not captured as an id
router.get("/area/:area", getHospitalsByArea);

router.get("/:id", getHospitalById);

router.put("/:id", authenticate, requireAdminKey, validate(hospitalUpdateSchema), updateHospital);
router.delete("/:id", authenticate, requireAdminKey, deleteHospital);

module.exports = router;
