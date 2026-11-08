/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/category/drivetrain-mecanum", destination: "/category/mecanum", permanent: true },
      { source: "/category/drivetrain-tank", destination: "/category/tank", permanent: true },
      { source: "/category/drivetrain-unspecified", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
