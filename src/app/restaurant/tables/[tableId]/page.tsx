import { RestaurantOperationsApp } from "@/modules/restaurant/components/restaurant-operations-app";
import { loadRestaurantOperationsPage } from "@/modules/restaurant/server/load-restaurant-operations-page";

export default async function RestaurantTablePage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const [{ tableId }, { initialBootstrap, initialBootstrapError }] =
    await Promise.all([params, loadRestaurantOperationsPage()]);

  return (
    <RestaurantOperationsApp
      initialBootstrap={initialBootstrap}
      initialBootstrapError={initialBootstrapError}
      screen="table"
      initialSelectedTableId={tableId}
    />
  );
}

