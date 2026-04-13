import { RestaurantOperationsApp } from "@/modules/restaurant/components/restaurant-operations-app";
import { loadRestaurantOperationsPage } from "@/modules/restaurant/server/load-restaurant-operations-page";

export default async function RestaurantKitchenPage() {
  const { initialBootstrap, initialBootstrapError } =
    await loadRestaurantOperationsPage();

  return (
    <RestaurantOperationsApp
      initialBootstrap={initialBootstrap}
      initialBootstrapError={initialBootstrapError}
      screen="kitchen"
    />
  );
}
