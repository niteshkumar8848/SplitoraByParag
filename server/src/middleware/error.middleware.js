const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'
  if (err.code === 'P2002') { statusCode = 400; message = 'Already exists' }
  if (err.code === 'P2025') { statusCode = 404; message = 'Not found' }
  if (err.code === 'P1001') { statusCode = 503; message = 'Database is unavailable. Please ensure Postgres is running.' }
  if (err.code === 'P1008') { statusCode = 503; message = 'Database timeout. Please try again.' }
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token' }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired' }
  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
module.exports = errorHandler
