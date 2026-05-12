const { handlePrismaError } = require("./prismaErrors");

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errors: [],
  });
};

const globalErrorHandler = (err, req, res, next) => {
  console.error("Global Error Handler caught:", err);

  // If Prisma error was handled, don't send another response
  if (handlePrismaError(err, res)) return;

  const statusCode = err.status || err.statusCode || 500;


  const message = statusCode >= 500 ? "Internal Server Error" : err.message || "Error";

  const message = statusCode === 500 ? "Internal Server Error" : err.message || "Error";
  const message = statusCode >= 500 ? "Internal Server Error" : err.message || "Error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: process.env.NODE_ENV === "development" ? [{ stack: err.stack }] : [],
  });
};

module.exports = { notFoundHandler, globalErrorHandler };
