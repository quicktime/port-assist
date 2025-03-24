import React from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../provider/ThemeProvider";

export default ({ icon, focused }: { icon: any; focused: boolean }) => {
  const { isDarkMode } = useAppTheme();
  const theme = useTheme();
  
  return (
    <Ionicons
      name={icon}
      style={styles.icon}
      size={24}
      color={
        focused
          ? isDarkMode
            ? theme.colors.primary
            : theme.colors.primary
          : "rgb(143, 155, 179)"
      }
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    marginBottom: -7,
  }
});