/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['@tensorflow/tfjs', '@tensorflow-models/mobilenet'],
    optimizeCss: true,
  },
  webpack: (config, { isServer }) => {
    // Optimize TensorFlow.js bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@tensorflow/tfjs$': '@tensorflow/tfjs/dist/tf.min.js',
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/socket.io/:path*',
        destination: 'https://lost-found-79xn.onrender.com/socket.io/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://lost-found-79xn.onrender.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;