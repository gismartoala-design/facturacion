import { RestaurantDishesSettingsScreen } from "@/modules/restaurant/components/restaurant-dishes-settings-screen";
import { loadRestaurantOperationsPage } from "@/modules/restaurant/server/load-restaurant-operations-page";

export default async function RestaurantSettingsDishesPage() {
  const { initialBootstrap } = await loadRestaurantOperationsPage({
    requireAdmin: true,
  });

  return (
    <RestaurantDishesSettingsScreen
      recipeCapabilityEnabled={
        initialBootstrap?.restaurantRuntime.inventory.recipeConsumption ?? false
      }
    />
  );
}
