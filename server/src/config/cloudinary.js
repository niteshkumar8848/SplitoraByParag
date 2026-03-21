const cloudinary = require('cloudinary').v2

// Get free credentials at cloudinary.com
// Free tier: 25GB storage, 25GB bandwidth/month
// Dashboard -> Settings -> API Keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

module.exports = cloudinary
