const million = require('million/compiler')
const createNextIntlPlugin = require('next-intl/plugin')

/**
 * Initialize i18n plugin
 */
const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    reactCompiler: process.env.NODE_ENV === 'production',
    webpackMemoryOptimizations: process.env.NODE_ENV !== 'production'
  },
  webpack: (config, { dev, isServer, nextRuntime, webpack }) => {
    /**
     * Fix for ts-morph warning
     */
    if (isServer && nextRuntime === 'nodejs') {
      config.plugins.push(new webpack.ContextReplacementPlugin(/ts-morph/))
    }
    if (config.cache && !dev) {
      config.cache = Object.freeze({
        type: 'memory'
      })
      config.cache.maxMemoryGenerations = 0
    }
    config.resolve.fallback = { fs: false, net: false, tls: false, crypto: false }
    return config
  }
}
module.exports = million.next(withNextIntl(nextConfig), { rsc: true })
