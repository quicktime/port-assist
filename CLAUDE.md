# Port-Assist Project Guide

## Build Commands
- Start development: `npm start` or `yarn start`
- iOS: `npm run ios` or `yarn ios`
- Android: `npm run android` or `yarn android`
- Web: `npm run web` or `yarn web`
- Build web: `npm run build:web` or `yarn build:web`
- Typecheck: `npx tsc --noEmit`

## Code Style Guidelines
- **Formatting**: Follow TypeScript strict mode with consistent spacing and indentation
- **Imports**: Use path aliases (`@/`, `@components/`, etc.) as defined in tsconfig.json
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Types**: Always use TypeScript types; avoid `any`
- **Components**: Create reusable components in src/components
- **State Management**: Use React hooks for local state
- **Error Handling**: Use try/catch blocks with proper error logging
- **File Structure**: Follow established project organization pattern
- **API Services**: Place API calls in dedicated service files under src/screens/services

## Project Architecture
React Native app using Expo with TypeScript, Supabase for backend, Polygon.io for market data, and Claude for LLM services.