/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Service workers must be served with no-cache so the browser always
        // byte-checks for updates. Without this, a cached SW keeps running
        // old code even after a new deployment.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            // Explicitly allow the SW to control the full origin scope.
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
