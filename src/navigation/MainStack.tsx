import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SecondScreen from "../screens/SecondScreen";
import MainTabs from "./MainTabs";

// Import new portfolio screens
import AddEditStockScreen from "../screens/Portfolio/AddEditStockScreen";
import OptionsChainScreen from "../screens/Portfolio/OptionsChainScreen";
import OptionDetailScreen from "../screens/Portfolio/OptionDetailScreen";

const MainStack = createNativeStackNavigator();
const Main = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen name="SecondScreen" component={SecondScreen} />
      
      {/* Portfolio related screens */}
      <MainStack.Screen name="AddStock" component={AddEditStockScreen} />
      <MainStack.Screen name="EditStock" component={AddEditStockScreen} />
      <MainStack.Screen name="OptionsChain" component={OptionsChainScreen} />
      <MainStack.Screen name="OptionDetail" component={OptionDetailScreen} />
    </MainStack.Navigator>
  );
};

export default Main;