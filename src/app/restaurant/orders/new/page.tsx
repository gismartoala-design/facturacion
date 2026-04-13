import { RestaurantOperationsApp } from "@/modules/restaurant/components/restaurant-operations-app";
import { loadRestaurantOperationsPage } from "@/modules/restaurant/server/load-restaurant-operations-page";

export default async function RestaurantWaiterOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tableId?: string }>;
}) {
  const [{ tableId }, { initialBootstrap, initialBootstrapError }] =
    await Promise.all([searchParams, loadRestaurantOperationsPage()]);

  return (
    <RestaurantOperationsApp
      initialBootstrap={initialBootstrap}
      initialBootstrapError={initialBootstrapError}
      screen="waiter"
      initialSelectedTableId={tableId ?? null}
    />
  );
}
