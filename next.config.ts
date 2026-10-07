import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy product-detail URL. Product pages used to live at
      // `/products/<slug>`, which cannot coexist with the
      // `/products/[category]/[gender]` collection route (Next.js rejects two
      // different dynamic segment names at the same path position). The
      // canonical detail route is now `/product/<slug>`; this keeps old,
      // bookmarked or shared links working.
      //
      // `:slug` matches exactly ONE path segment, so this never shadows
      // `/products/<category>/<gender>` (two segments) or `/products` itself.
      { source: "/products/:slug", destination: "/product/:slug", permanent: false },
    ];
  },
};

export default nextConfig;
