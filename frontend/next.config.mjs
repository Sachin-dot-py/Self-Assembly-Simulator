/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging = process.env.NODE_ENV === 'staging';
    
    // Default to the production API for all environments unless overridden
    let apiUrl = 'http://127.0.0.1:8000'; // Production API URL

    if (isStaging) {
      apiUrl = 'http://127.0.0.1:8001'; // Staging API URL
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`, // Forward API requests
      },
    ];
  },
  // To ignore error: useSearchParams() should be wrapped in a suspense boundary at page "/visualization"
  experimental: { 
    missingSuspenseWithCSRBailout: false, 
  },
  // For Docker
  output: "standalone",
  // Base URL for frontend app, used for setting custom environment variables
  env: {
    BASE_API_URL: process.env.NODE_ENV === 'staging' ? 'http://127.0.0.1:8001' : 'http://127.0.0.1:8000',
  }
};

export default nextConfig;
