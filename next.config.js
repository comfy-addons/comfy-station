const million = require('million/compiler')
const createNextIntlPlugin = require('next-intl/plugin')

/**
 * Initialize i18n plugin
 */
const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    reactCompiler: true,
    webpackMemoryOptimizations: true
  },
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    /**
     * Fix for ts-morph warning
     */
    if (isServer && nextRuntime === 'nodejs') {
      config.plugins.push(new webpack.ContextReplacementPlugin(/ts-morph/))
    }
    config.resolve.fallback = { fs: false, net: false, tls: false, crypto: false }
    return config
  }
}
module.exports = million.next(withNextIntl(nextConfig), { rsc: true })
