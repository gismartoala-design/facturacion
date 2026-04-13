import { RestaurantSettlementScreen } from "@/modules/restaurant/components/restaurant-settlement-screen";
import { loadRestaurantOperationsPage } from "@/modules/restaurant/server/load-restaurant-operations-page";

export default async function RestaurantSettlementPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const [{ orderId }, { initialBootstrap, initialBootstrapError }] =
    await Promise.all([params, loadRestaurantOperationsPage()]);

  return (
    <RestaurantSettlementScreen
      initialBootstrap={initialBootstrap}
      initialBootstrapError={initialBootstrapError}
      orderId={orderId}
    />
  );
}
