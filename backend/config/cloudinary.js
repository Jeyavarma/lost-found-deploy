require('dotenv').config();
const cloudinary = require('cloudinary');

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'difjxpgh1',
  api_key: process.env.CLOUDINARY_API_KEY || '263222318928318',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'ZviOOQ50Z56uG9yutRmPa-MRdiQ',
});

console.log('Cloudinary config:', {
  cloud_name: cloudinary.v2.config().cloud_name,
  api_key: cloudinary.v2.config().api_key ? 'Set' : 'Missing'
});

module.exports = cloudinary;