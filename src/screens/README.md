# Screens Directory Structure

This directory contains all the screens for the Port-Assist application, organized in a modular and maintainable way.

## Directory Structure

```
screens/
├── components/           # Shared screen-level components
│   ├── BaseScreen.tsx    # Base screen layout with consistent header
│   ├── EmptyState.tsx    # Empty state component for lists
│   └── LoadingScreen.tsx # Loading state component
├── styles/               # Shared styles
│   └── common.ts         # Common styles shared across screens
├── About/                # About screen
├── Auth/                 # Authentication screens
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   └── ForgetPasswordScreen.tsx
├── Home/                 # Home/Dashboard screens
├── Portfolio/            # Portfolio management screens
├── Settings/             # App settings screens
└── index.ts              # Exports all screens and components
```

## Usage Guidelines

### Common Components

- `BaseScreen`: Use as a wrapper for all screens to maintain consistent header and layout
- `LoadingScreen`: Use for displaying loading states
- `EmptyState`: Use for showing empty state messages in lists

### Shared Styles

Import the shared styles from `styles/common.ts`:

```typescript
import { commonStyles, cardStyles, formStyles } from '../styles/common';
```

Available style categories:
- `commonStyles`: General layout and spacing
- `cardStyles`: Card components styling
- `formStyles`: Form elements styling 
- `authStyles`: Auth-specific styling

### Screen Organization

- Each screen should be in its own folder if it has multiple related files
- Use `index.tsx` as the main file for each screen folder
- Group related screens (e.g., Auth, Portfolio) in their own directories
- Add screen-specific components in the screen's directory

### Navigation

- Use Expo Router for navigation
- Navigation paths should match the directory structure where possible
- For navigation between screens:

```typescript
import { router } from 'expo-router';

// Navigate to a screen
router.push('/portfolio/add');

// Navigate with params
router.push({
  pathname: '/portfolio/edit',
  params: { item: JSON.stringify(item) }
});
```

## Best Practices

1. Reuse common components and styles whenever possible
2. Keep screen components focused on layout and state management
3. Move business logic to services/hooks 
4. Use TypeScript types for all props and state
5. Follow consistent naming conventions
6. Add proper comments for complex logic
7. Keep screens modular and maintainable