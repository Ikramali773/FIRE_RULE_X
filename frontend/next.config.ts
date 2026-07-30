import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: [
        "*.preview.emergentagent.com",
        "*.preview.emergentcf.cloud",
        "*.cluster-5.preview.emergentcf.cloud",
    ],
    typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
