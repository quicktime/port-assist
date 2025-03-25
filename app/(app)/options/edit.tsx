// app/(app)/options/edit.tsx
import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import AddEditOptionPositionScreen from "../../../src/screens/Portfolio/AddEditOptionPositionScreen";

export default function EditOptionRoute() {
  const params = useLocalSearchParams<{ option: string }>();
  let option: any | undefined;
  
  try {
    if (params.option) {
      option = JSON.parse(params.option as string);
    }
  } catch (error) {
    console.error("Error parsing option:", error);
    router.back();
    return null;
  }
  
  if (!option) {
    router.back();
    return null;
  }
  
  return <AddEditOptionPositionScreen mode="edit" option={option} />;
}