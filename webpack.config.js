const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['expo-router']
    }
  }, argv);
  
  // Customize the config before returning it
  // Ensure React is set up correctly for web
  config.resolve.alias = {
    ...config.resolve.alias,
    // Force single React version
    'react': require.resolve('react'),
    'react-dom': require.resolve('react-dom')
  };
  
  return config;
};