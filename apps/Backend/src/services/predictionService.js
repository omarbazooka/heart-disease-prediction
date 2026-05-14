const prisma = require("../config/prisma");
const { internalPredict, internalShapPng, internalReportPdf } = require("../integrations/ai.service");

class PredictionService {
  /**
   * Legacy rows may lack user_id; allow access only if lab test national_id matches.
   */
  static async assertPredictionOwnedByUser(predictionId, user) {
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { labTest: true },
    });
    if (!prediction) {
      const err = new Error("Prediction not found");
      err.statusCode = 404;
      throw err;
    }
    if (prediction.user_id) {
      if (prediction.user_id !== user.id) {
        const err = new Error("Forbidden");
        err.statusCode = 403;
        throw err;
      }
      return prediction;
    }
    if (!prediction.labTest || prediction.labTest.national_id !== user.national_id) {
      const err = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }
    return prediction;
  }

  static async startForCurrentUser(user) {
    const labTest = await prisma.labTest.findFirst({
      where: { national_id: user.national_id },
      orderBy: { createdAt: "desc" },
    });
    if (!labTest) {
      const err = new Error(
        "No lab test found for this user. Upload results via your lab or contact support."
      );
      err.statusCode = 404;
      throw err;
    }

    const ai = await internalPredict(labTest.id.toString(), user.id.toString());

    await prisma.prediction.updateMany({
      where: { lab_test_id: labTest.id },
      data: { user_id: user.id },
    });

    const isHigh = String(ai.decision || "").toLowerCase() === "high";
    const probability =
      typeof ai.probability === "number" ? ai.probability : Number(ai.probability) || 0;

    return {
      prediction_id: ai.id,
      lab_test_id: ai.lab_test_id,
      decision: ai.decision,
      probability,
      risk_level: ai.risk_level,
      risk_color: ai.risk_color,
      decision_label: ai.decision_label,
      show_shap: isHigh,
      show_report: isHigh,
      show_hospitals: isHigh,
    };
  }

  static async shapPngForPrediction(predictionId, user) {
    const prediction = await this.assertPredictionOwnedByUser(predictionId, user);
    if (prediction.decision === "low") {
      const err = new Error("SHAP image is not available for low risk predictions.");
      err.statusCode = 400;
      throw err;
    }
    return internalShapPng(prediction.lab_test_id);
  }

  static async reportPdfForPrediction(predictionId, user) {
    const prediction = await this.assertPredictionOwnedByUser(predictionId, user);
    if (prediction.decision === "low") {
      const err = new Error("Report PDF is not available for low risk predictions.");
      err.statusCode = 400;
      throw err;
    }
    return internalReportPdf(prediction.lab_test_id);
  }
}

module.exports = PredictionService;
