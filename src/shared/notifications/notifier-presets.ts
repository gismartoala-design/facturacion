"use client";

import type { AppNotificationOptions } from "@/components/providers/app-notification-provider";
import { useAppNotifier } from "@/components/providers/app-notification-provider";

export const TOP_RIGHT_NOTIFIER_OPTIONS: AppNotificationOptions = {
  anchorOrigin: { vertical: "top", horizontal: "right" },
  autoHideDuration: 4200,
};

export const TOP_RIGHT_LONG_NOTIFIER_OPTIONS: AppNotificationOptions = {
  anchorOrigin: { vertical: "top", horizontal: "right" },
  autoHideDuration: 4500,
};

export const BOTTOM_RIGHT_NOTIFIER_OPTIONS: AppNotificationOptions = {
  anchorOrigin: { vertical: "bottom", horizontal: "right" },
  autoHideDuration: 3500,
};

export const BOTTOM_CENTER_NOTIFIER_OPTIONS: AppNotificationOptions = {
  anchorOrigin: { vertical: "bottom", horizontal: "center" },
  autoHideDuration: 3600,
};

export function useCompanyNotifier() {
  return useAppNotifier(TOP_RIGHT_NOTIFIER_OPTIONS);
}

export function useAccountingNotifier() {
  return useAppNotifier(BOTTOM_RIGHT_NOTIFIER_OPTIONS);
}

export function useSalesNotifier() {
  return useAppNotifier(TOP_RIGHT_LONG_NOTIFIER_OPTIONS);
}

export function usePosNotifier() {
  return useAppNotifier(TOP_RIGHT_NOTIFIER_OPTIONS);
}

export function useRestaurantNotifier() {
  return useAppNotifier(BOTTOM_CENTER_NOTIFIER_OPTIONS);
}

export function usePurchasesNotifier() {
  return useAppNotifier(TOP_RIGHT_NOTIFIER_OPTIONS);
}

export function useInventoryNotifier() {
  return useAppNotifier(TOP_RIGHT_NOTIFIER_OPTIONS);
}

export function useUsersNotifier() {
  return useAppNotifier(TOP_RIGHT_NOTIFIER_OPTIONS);
}
