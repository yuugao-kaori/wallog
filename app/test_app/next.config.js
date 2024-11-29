/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_SITE_DOMAIN?.replace(/^https?:\/\//, '')].filter(Boolean),
  },
  
  // チャンクの読み込みに関する設定を追加
  webpack: (config, { isServer }) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        // ベンダーチャンクの設定
        vendor: {
          name: 'vendor',
          chunks: 'all',
          test: /node_modules/,
          priority: 20
        },
        // React Iconsの特別な設定
        reactIcons: {
          name: 'react-icons',
          chunks: 'all',
          test: /[\\/]node_modules[\\/]react-icons[\\/]/,
          priority: 30
        }
      }
    };
    return config;
  },

  // 必要に応じてチャンクの読み込みに関する設定を追加
  experimental: {
    optimizeFonts: true,
    modern: true
  }
};

module.exports = nextConfig;