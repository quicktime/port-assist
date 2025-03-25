// app/(app)/options/detail.tsx
import React from "react";
import { useLocalSearchParams } from "expo-router";
import OptionDetailScreen from "../../../src/screens/Portfolio/OptionDetailScreen";

export default function OptionDetailRoute() {
  const params = useLocalSearchParams<{ option: string }>();
  let option: any | undefined;
  
  try {
    if (params.option) {
      option = JSON.parse(params.option as string);
    }
  } catch (error) {
    console.error("Error parsing option:", error);
    return null;
  }
  
  if (!option) {
    return null;
  }
  
  return <OptionDetailScreen option={option} />;
}