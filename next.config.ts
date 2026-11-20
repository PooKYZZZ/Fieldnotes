import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.FIELDNOTES_NEXT_DIST_DIR ?? ".next",
  // Keep the Next.js development badge from obscuring the responsive UI.
  // Compiler and runtime failures remain visible in the terminal and overlay.
  devIndicators: false,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  outputFileTracingIncludes: {
    "/*": ["./src/content/curriculum/**/*.md", "./src/content/curriculum/**/*.mdx"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
