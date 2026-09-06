export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, req, res, next) {
  void req;
  void next;

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code || "REQUEST_ERROR",
        message: error.message,
      },
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE_RECORD",
        message: "A record with this value already exists.",
      },
    });
  }

  console.error("Backend Error:", error);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || "Internal server error.",
    },
  });
}
