# Screen Refactoring Plan

This document outlines the plan for completing the screen refactoring process.

## Completed Items

- ✅ Created shared styles in `styles/common.ts`
- ✅ Implemented reusable components in `components/`
- ✅ Refactored `HomeScreen`, `AboutScreen`, `LoginScreen`, and `PortfolioScreen`
- ✅ Updated corresponding routes to use new components
- ✅ Removed obsolete files (`About.tsx`, `Home.tsx`, `Login.tsx`)
- ✅ Added documentation and README

### Auth Screens
- ✅ `RegisterScreen.tsx` 
- ✅ `ForgetPasswordScreen.tsx`

### Settings & Profile Screens
- ✅ `Profile.tsx` → `Profile/index.tsx`
- ✅ `WebSocketConfigScreen.tsx` → `Settings/WebSocketScreen.tsx`

## Remaining Screens to Refactor

### Portfolio Screens
- [✅] `AddEditStockScreen.tsx` → `Portfolio/AddScreen.tsx` and `Portfolio/EditScreen.tsx`
- [✅] `AddEditOptionPositionScreen.tsx` → `Options/AddScreen.tsx` and `Options/EditScreen.tsx`
- [✅] `CashManagementScreen.tsx` → `Portfolio/CashScreen.tsx`
- [✅] `CompanyDetailsScreen.tsx` → `Portfolio/CompanyScreen.tsx`
- [✅] `OptionDetailScreen.tsx` → `Options/DetailScreen.tsx`
- [✅] `OptionsChainScreen.tsx` → `Options/ChainScreen.tsx`
- [✅] `OptionsPortfolioScreen.tsx` → `Options/PortfolioScreen.tsx`
- [✅] `TradeRecommendationsScreen.tsx` → `Dashboard/RecommendationsScreen.tsx`
- [✅] `TradeStrategyScreen.tsx` → `Dashboard/StrategyScreen.tsx`
- [✅] `CombinedPortfolioDashboard.tsx` → `Dashboard/IndexScreen.tsx`

## Refactoring Guidelines

For each screen:

1. Create the new file using the proper path structure
2. Use the `BaseScreen` component for layout consistency
3. Apply appropriate shared styles from `styles/common.ts`
4. Implement loading states with `LoadingScreen`
5. Use `EmptyState` for empty lists
6. Update the route file to import from `src/screens` index
7. Remove the old file after refactoring
8. Update exports in the `src/screens/index.ts` file

## Testing Plan

After refactoring each screen:

1. Verify navigation works correctly
2. Test main functionality of each screen
3. Verify the UI appearance is consistent
4. Check responsiveness on different screen sizes

## Future Enhancements

- [ ] Add more reusable components for repetitive UI patterns
- [ ] Implement form validation utilities
- [ ] Create dedicated typography components
- [ ] Add animation utilities
- [ ] Create screen transition utilities

## Component Usage Examples

### BaseScreen
```tsx
<BaseScreen 
  title="Screen Title"
  showBackButton={true}
  onBack={() => router.back()}
>
  <View style={commonStyles.content}>
    {/* Screen content */}
  </View>
</BaseScreen>
```

### LoadingScreen
```tsx
if (loading) {
  return <LoadingScreen message="Loading data..." />;
}
```

### EmptyState
```tsx
<EmptyState 
  message="No items found"
  icon="information-outline"
  buttonLabel="Add Item"
  onButtonPress={handleAddItem}
/>
```

## Style Usage Examples

```tsx
import { commonStyles, cardStyles, formStyles } from '../styles/common';

// In component:
<View style={commonStyles.container}>
  <Card style={cardStyles.card}>
    <Card.Content style={cardStyles.cardContent}>
      {/* Card content */}
    </Card.Content>
  </Card>
  
  <TextInput
    style={formStyles.input}
    label="Input Label"
  />
</View>
```