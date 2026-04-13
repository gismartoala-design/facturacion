import { RestaurantHallsSettingsScreen } from "@/modules/restaurant/components/restaurant-halls-settings-screen";
import { loadRestaurantOperationsPage } from "@/modules/restaurant/server/load-restaurant-operations-page";

export default async function RestaurantSettingsHallsPage() {
  await loadRestaurantOperationsPage({ requireAdmin: true });

  return <RestaurantHallsSettingsScreen />;
}
