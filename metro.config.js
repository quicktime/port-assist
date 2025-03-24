// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add additional file extensions for proper SVG support
config.resolver.sourceExts.push('svg');

// Add necessary assetExts for Polygon.io API
config.resolver.assetExts.push('pem', 'cert');

module.exports = config;