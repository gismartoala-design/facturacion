import { redirect } from "next/navigation";

export default async function RestaurantIndexPage() {
  redirect("/restaurant/orders/new");
}
