import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import AddEditStockScreen from "../../src/screens/Portfolio/AddEditStockScreen";
import { PortfolioItem } from "../../src/screens/services/portfolioService";

export default function EditStockRoute() {
  const params = useLocalSearchParams<{ item: string }>();
  let item: PortfolioItem | undefined;
  
  try {
    if (params.item) {
      item = JSON.parse(params.item as string) as PortfolioItem;
    }
  } catch (error) {
    console.error("Error parsing portfolio item:", error);
    router.back();
    return null;
  }
  
  if (!item) {
    router.back();
    return null;
  }
  
  return <AddEditStockScreen mode="edit" item={item} />;
}