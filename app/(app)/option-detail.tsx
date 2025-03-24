import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import OptionDetailScreen from "../../src/screens/Portfolio/OptionDetailScreen";
import { OptionData } from "../../src/screens/services/polygonService";

export default function OptionDetailRoute() {
  const params = useLocalSearchParams<{ option: string }>();
  let option: OptionData | null = null;
  
  try {
    if (params.option) {
      option = JSON.parse(params.option as string) as OptionData;
    }
  } catch (error) {
    console.error("Error parsing option data:", error);
  }
  
  if (!option) {
    // Handle the case when no option data is provided
    router.back();
    return null;
  }
  
  return <OptionDetailScreen option={option} />;
}