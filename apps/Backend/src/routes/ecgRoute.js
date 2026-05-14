const express = require("express");
const { authenticate } = require("../middlewares/auth");
const {
  getMyEcgStatus,
  listMyEcg,
  startEcg,
  getEcgChart,
  getEcgReport,
  getEcgDetail,
} = require("../controllers/ecgController");

const router = express.Router();

router.use(authenticate);

router.get("/me/status", getMyEcgStatus);
router.get("/me", listMyEcg);
router.post("/start", startEcg);
router.get("/chart/:ecgTestId", getEcgChart);
router.get("/:ecgTestId/report", getEcgReport);
router.get("/:ecgTestId", getEcgDetail);

module.exports = router;
