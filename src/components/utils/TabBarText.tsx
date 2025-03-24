import React from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useAppTheme } from "../../provider/ThemeProvider";

export default ({ title, focused }: { title: string; focused: boolean }) => {
  const { isDarkMode } = useAppTheme();
  const theme = useTheme();
  
  return (
    <Text
      variant="labelSmall"
      style={[
        styles.label, 
        { 
          color: focused
            ? isDarkMode
              ? theme.colors.primary
              : theme.colors.primary
            : "rgb(143, 155, 179)",
        }
      ]}
    >
      {title}
    </Text>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 5,
    fontSize: 10,
    fontWeight: 'bold',
  }
});