import type { NextConfig } from "next";

interface WebpackConfig {
  watchOptions: {
    poll: number;
    aggregateTimeout: number;
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpackDevMiddleware: (config: WebpackConfig) => {
    config.watchOptions = {
      poll: 800,
      aggregateTimeout: 300,
    }
    return config
  },
};


export default nextConfig;
