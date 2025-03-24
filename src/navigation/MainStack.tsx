import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainStackParamList } from "../types/navigation";

// Import screens
import MainTabs from "./MainTabs";

// Import portfolio screens
import AddEditStockScreen from "../screens/Portfolio/AddEditStockScreen";
import OptionsChainScreen from "../screens/Portfolio/OptionsChainScreen";
import OptionDetailScreen from "../screens/Portfolio/OptionDetailScreen";

const MainStack = createNativeStackNavigator<MainStackParamList>();

const Main = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Main tab navigator as the root */}
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      
      {/* Other screens */}
     
      {/* Portfolio related screens */}
      <MainStack.Screen name="AddStock" component={AddEditStockScreen} />
      <MainStack.Screen name="EditStock" component={AddEditStockScreen} />
      <MainStack.Screen name="OptionsChain" component={OptionsChainScreen} />
      <MainStack.Screen name="OptionDetail" component={OptionDetailScreen} />
    </MainStack.Navigator>
  );
};

export default Main;