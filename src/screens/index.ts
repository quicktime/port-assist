// Base components
export { default as BaseScreen } from './components/BaseScreen';
export { default as LoadingScreen } from './components/LoadingScreen';
export { default as EmptyState } from './components/EmptyState';

// Auth screens
export { default as LoginScreen } from './auth/LoginScreen';
export { default as RegisterScreen } from './auth/RegisterScreen';
export { default as ForgetPasswordScreen } from './auth/ForgetPasswordScreen';

// Home screen
export { default as HomeScreen } from './Home';

// Stocks screens
export { default as StocksPositionsScreen } from './Stocks/PositionsScreen';
export { default as AddPortfolioScreen } from './Stocks/AddScreen';
export { default as EditPortfolioScreen } from './Stocks/EditScreen';
export { default as CashScreen } from './Stocks/CashScreen';
export { default as CompanyScreen } from './Stocks/CompanyScreen';

// Profile screens
export { default as ProfileScreen } from './Profile';

// Settings screens
export { default as WebSocketScreen } from './Settings/WebSocketScreen';

// Options screens
export { default as AddOptionScreen } from './Options/AddScreen';
export { default as EditOptionScreen } from './Options/EditScreen';
export { default as DetailOptionScreen } from './Options/DetailScreen';
export { default as ChainOptionScreen } from './Options/ChainScreen';
export { default as OptionsPositionsScreen } from './Options/PositionsScreen';

// Dashboard screens
export { default as IndexScreen } from './Dashboard/IndexScreen';
export { default as RecommendationsScreen } from './Dashboard/RecommendationsScreen';
export { default as StrategyScreen } from './Dashboard/StrategyScreen';

// About screen
export { default as AboutScreen } from './About';

// Common styles
export * from './styles/common';