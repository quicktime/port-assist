// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Handle Windows path separators
config.resolver.sourceExts.push('svg');
config.resolver.assetExts.push('pem', 'cert');

// Fix path resolution for Windows
config.watchFolders = [path.resolve(__dirname)];

module.exports = config;