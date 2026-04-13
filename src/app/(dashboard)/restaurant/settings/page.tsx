import { redirect } from "next/navigation";

export default async function RestaurantSettingsPage() {
  redirect("/restaurant/settings/dishes");
}
