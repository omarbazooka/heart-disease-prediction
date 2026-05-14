const EcgService = require("../services/ecgService");

/**
 * GET /api/ecg/me/status — whether the patient has any ECG uploads.
 */
const getMyEcgStatus = async (req, res, next) => {
  try {
    const data = await EcgService.getMyStatus(req.user);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/ecg/me?page=&limit= — paginated ECG tests for dashboard.
 */
const listMyEcg = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await EcgService.listForCurrentUser(req.user, { page, limit });
    return res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/ecg/start — latest ECG inference (cached when already completed).
 */
const startEcg = async (req, res, next) => {
  try {
    const data = await EcgService.startForCurrentUser(req.user);
    return res.status(201).json({
      success: true,
      message: data.cached ? "ECG prediction loaded from saved results" : "ECG prediction completed",
      data,
    });
  } catch (e) {
    if (e.code === "NO_ECG" || (e.statusCode === 404 && String(e.message).includes("No ECG"))) {
      return res.status(404).json({
        success: false,
        code: "NO_ECG",
        message: "No ECG Data",
      });
    }
    next(e);
  }
};

/**
 * GET /api/ecg/chart/:ecgTestId — PNG chart (requires completed inference).
 */
const getEcgChart = async (req, res, next) => {
  try {
    const png = await EcgService.chartPngForUser(req.params.ecgTestId, req.user);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.send(png);
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/ecg/:ecgTestId/report — PDF download.
 */
const getEcgReport = async (req, res, next) => {
  try {
    const pdf = await EcgService.reportPdfForUser(req.params.ecgTestId, req.user);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=ecg_report_${req.params.ecgTestId}.pdf`);
    return res.send(pdf);
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/ecg/:ecgTestId — detail JSON.
 */
const getEcgDetail = async (req, res, next) => {
  try {
    const data = await EcgService.getDetailForUser(req.params.ecgTestId, req.user);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getMyEcgStatus,
  listMyEcg,
  startEcg,
  getEcgChart,
  getEcgReport,
  getEcgDetail,
};
