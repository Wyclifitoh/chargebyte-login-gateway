const notFound = (req, res, next) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, error: 'Duplicate entry' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};

module.exports = { notFound, errorHandler };
