import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SecondScreen from "../screens/SecondScreen";
import MainTabs from "./MainTabs";
import { MainStackParamList } from "../types/navigation";

// Properly type the stack navigator
const MainStack = createNativeStackNavigator<MainStackParamList>();

// Type definition for the components
type ScreenComponentType = React.ComponentType<any>;

const Main = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainStack.Screen 
        name="MainTabs" 
        component={MainTabs as ScreenComponentType} 
      />
      <MainStack.Screen 
        name="SecondScreen" 
        component={SecondScreen as ScreenComponentType} 
      />
    </MainStack.Navigator>
  );
};

export default Main;