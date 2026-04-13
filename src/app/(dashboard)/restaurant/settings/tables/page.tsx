import { RestaurantTablesSettingsScreen } from "@/modules/restaurant/components/restaurant-tables-settings-screen";
import { loadRestaurantOperationsPage } from "@/modules/restaurant/server/load-restaurant-operations-page";

export default async function RestaurantSettingsTablesPage() {
  await loadRestaurantOperationsPage({ requireAdmin: true });

  return <RestaurantTablesSettingsScreen />;
}
