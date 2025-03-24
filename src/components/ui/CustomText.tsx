import React from 'react';
import { Text as RNText, StyleSheet, TextStyle, TextProps } from 'react-native';
import { useTheme } from 'react-native-paper';

// Define text size and weight options
type TextSize = 
  'displayLarge' | 'displayMedium' | 'displaySmall' |
  'headlineLarge' | 'headlineMedium' | 'headlineSmall' |
  'titleLarge' | 'titleMedium' | 'titleSmall' |
  'bodyLarge' | 'bodyMedium' | 'bodySmall' |
  'labelLarge' | 'labelMedium' | 'labelSmall';

type TextWeight = 'regular' | 'medium' | 'bold' | 'heavy';

interface CustomTextProps extends TextProps {
  variant?: TextSize;
  weight?: TextWeight;
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

const CustomText: React.FC<CustomTextProps> = ({
  variant = 'bodyMedium',
  weight = 'regular',
  style,
  children,
  ...props
}) => {
  const theme = useTheme();
  
  // Function to get the correct style for the variant
  const getVariantStyle = (): TextStyle => {
    if (theme.fonts && theme.fonts[variant]) {
      return theme.fonts[variant] as TextStyle;
    }
    
    // Fallback styles if theme doesn't provide the variant
    const fallbackStyles: Record<TextSize, TextStyle> = {
      displayLarge: { fontSize: 57, lineHeight: 64 },
      displayMedium: { fontSize: 45, lineHeight: 52 },
      displaySmall: { fontSize: 36, lineHeight: 44 },
      headlineLarge: { fontSize: 32, lineHeight: 40 },
      headlineMedium: { fontSize: 28, lineHeight: 36 },
      headlineSmall: { fontSize: 24, lineHeight: 32 },
      titleLarge: { fontSize: 22, lineHeight: 28 },
      titleMedium: { fontSize: 16, lineHeight: 24 },
      titleSmall: { fontSize: 14, lineHeight: 20 },
      bodyLarge: { fontSize: 16, lineHeight: 24 },
      bodyMedium: { fontSize: 14, lineHeight: 20 },
      bodySmall: { fontSize: 12, lineHeight: 16 },
      labelLarge: { fontSize: 14, lineHeight: 20 },
      labelMedium: { fontSize: 12, lineHeight: 16 },
      labelSmall: { fontSize: 11, lineHeight: 16 }
    };
    
    return fallbackStyles[variant];
  };
  
  // Function to get font weight style
  const getWeightStyle = (): TextStyle => {
    const weightMap: Record<TextWeight, TextStyle> = {
      regular: { fontWeight: '400' },
      medium: { fontWeight: '500' },
      bold: { fontWeight: '700' },
      heavy: { fontWeight: '900' }
    };
    
    return weightMap[weight];
  };
  
  return (
    <RNText
      style={[
        getVariantStyle(),
        getWeightStyle(),
        { color: theme.colors.onSurface },
        style
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default CustomText;