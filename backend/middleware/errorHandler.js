export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, req, res, next) {
  void req;
  void next;

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: "A record with this value already exists.",
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
}
