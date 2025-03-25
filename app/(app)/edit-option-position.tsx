import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import AddEditOptionPositionScreen from "../../src/screens/Portfolio/AddEditOptionPositionScreen";
import { OptionPosition } from "../../src/screens/Portfolio/OptionsPortfolioScreen";

export default function EditOptionPositionRoute() {
  const params = useLocalSearchParams<{ position: string }>();
  let position: OptionPosition | undefined;
  
  try {
    if (params.position) {
      position = JSON.parse(params.position as string) as OptionPosition;
    }
  } catch (error) {
    console.error("Error parsing option position:", error);
    router.back();
    return null;
  }
  
  if (!position) {
    router.back();
    return null;
  }
  
  return <AddEditOptionPositionScreen mode="edit" position={position} />;
}