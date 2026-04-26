"use client";

import Alert, { type AlertColor } from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Snackbar, { type SnackbarOrigin } from "@mui/material/Snackbar";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";

type NotificationOptions = {
  message: ReactNode;
  severity?: AlertColor;
  autoHideDuration?: number | null;
  anchorOrigin?: SnackbarOrigin;
};

type NotificationRecord = NotificationOptions & {
  id: number;
};

type NotificationState = {
  open: boolean;
  current: NotificationRecord | null;
  queue: NotificationRecord[];
};

type NotificationVariantOptions = Omit<NotificationOptions, "message" | "severity">;
export type AppNotificationOptions = NotificationVariantOptions;

type NotificationContextValue = {
  notify: (notification: NotificationOptions | string) => void;
  success: (message: ReactNode, options?: NotificationVariantOptions) => void;
  error: (message: ReactNode, options?: NotificationVariantOptions) => void;
  info: (message: ReactNode, options?: NotificationVariantOptions) => void;
  warning: (message: ReactNode, options?: NotificationVariantOptions) => void;
  closeNotification: () => void;
};

const DEFAULT_ANCHOR_ORIGIN: SnackbarOrigin = {
  vertical: "top",
  horizontal: "right",
};

const DEFAULT_AUTO_HIDE_DURATION = 4200;

const NotificationContext = createContext<NotificationContextValue | null>(null);

function normalizeNotification(
  input: NotificationOptions | string,
  id: number,
): NotificationRecord {
  if (typeof input === "string") {
    return {
      id,
      message: input,
      severity: "info",
      autoHideDuration: DEFAULT_AUTO_HIDE_DURATION,
      anchorOrigin: DEFAULT_ANCHOR_ORIGIN,
    };
  }

  return {
    id,
    message: input.message,
    severity: input.severity ?? "info",
    autoHideDuration:
      input.autoHideDuration === undefined
        ? DEFAULT_AUTO_HIDE_DURATION
        : input.autoHideDuration,
    anchorOrigin: input.anchorOrigin ?? DEFAULT_ANCHOR_ORIGIN,
  };
}

export function AppNotificationProvider({ children }: { children: ReactNode }) {
  const nextIdRef = useRef(0);
  const [state, setState] = useState<NotificationState>({
    open: false,
    current: null,
    queue: [],
  });

  const notify = useCallback((notification: NotificationOptions | string) => {
    nextIdRef.current += 1;
    const nextNotification = normalizeNotification(notification, nextIdRef.current);

    setState((previous) => {
      if (!previous.current) {
        return {
          open: true,
          current: nextNotification,
          queue: previous.queue,
        };
      }

      return {
        open: previous.open ? false : previous.open,
        current: previous.current,
        queue: [...previous.queue, nextNotification],
      };
    });
  }, []);

  const notifyWithSeverity = useCallback(
    (severity: AlertColor, message: ReactNode, options?: NotificationVariantOptions) => {
      notify({
        ...options,
        message,
        severity,
      });
    },
    [notify],
  );

  const closeNotification = useCallback(() => {
    setState((previous) => ({
      ...previous,
      open: false,
    }));
  }, []);

  const handleClose = useCallback((_: Event | SyntheticEvent, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }

    setState((previous) => ({
      ...previous,
      open: false,
    }));
  }, []);

  const handleExited = useCallback(() => {
    setState((previous) => {
      if (previous.queue.length === 0) {
        return {
          ...previous,
          current: null,
        };
      }

      const [nextNotification, ...rest] = previous.queue;

      return {
        open: true,
        current: nextNotification,
        queue: rest,
      };
    });
  }, []);

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (message, options) => notifyWithSeverity("success", message, options),
      error: (message, options) => notifyWithSeverity("error", message, options),
      info: (message, options) => notifyWithSeverity("info", message, options),
      warning: (message, options) => notifyWithSeverity("warning", message, options),
      closeNotification,
    }),
    [closeNotification, notify, notifyWithSeverity],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Snackbar
        key={state.current?.id}
        open={state.open}
        autoHideDuration={
          state.current?.autoHideDuration ?? DEFAULT_AUTO_HIDE_DURATION
        }
        onClose={handleClose}
        anchorOrigin={state.current?.anchorOrigin ?? DEFAULT_ANCHOR_ORIGIN}
        slotProps={{
          transition: {
            onExited: handleExited,
          },
        }}
      >
        <Alert
          elevation={0}
          variant="filled"
          severity={state.current?.severity ?? "info"}
          onClose={closeNotification}
          action={
            <IconButton
              aria-label="Cerrar notificacion"
              color="inherit"
              size="small"
              onClick={closeNotification}
            >
              <X className="h-4 w-4" />
            </IconButton>
          }
          sx={{
            width: "100%",
            minWidth: { xs: 240, sm: 320 },
            borderRadius: "16px",
            boxShadow: "0 18px 38px rgba(74, 60, 88, 0.18)",
          }}
        >
          {state.current?.message ?? ""}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useAppNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useAppNotifications must be used within AppNotificationProvider");
  }

  return context;
}

function resolveNotificationMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function mergeNotificationOptions(
  defaults: NotificationVariantOptions,
  options?: NotificationVariantOptions,
) {
  return {
    ...defaults,
    ...options,
  };
}

export function useAppNotifier(defaultOptions: NotificationVariantOptions = {}) {
  const notifications = useAppNotifications();
  const anchorHorizontal = defaultOptions.anchorOrigin?.horizontal;
  const anchorVertical = defaultOptions.anchorOrigin?.vertical;
  const autoHideDuration = defaultOptions.autoHideDuration;
  const normalizedDefaults = useMemo<NotificationVariantOptions>(
    () => ({
      anchorOrigin:
        anchorHorizontal && anchorVertical
          ? {
              horizontal: anchorHorizontal,
              vertical: anchorVertical,
            }
          : undefined,
      autoHideDuration,
    }),
    [anchorHorizontal, anchorVertical, autoHideDuration],
  );

  return useMemo(
    () => ({
      show(notification: NotificationOptions | string) {
        if (typeof notification === "string") {
          notifications.notify({
            message: notification,
            ...normalizedDefaults,
          });
          return;
        }

        notifications.notify({
          ...mergeNotificationOptions(normalizedDefaults, notification),
          message: notification.message,
          severity: notification.severity,
        });
      },
      success(message: ReactNode, options?: NotificationVariantOptions) {
        notifications.success(message, mergeNotificationOptions(normalizedDefaults, options));
      },
      error(message: ReactNode, options?: NotificationVariantOptions) {
        notifications.error(message, mergeNotificationOptions(normalizedDefaults, options));
      },
      info(message: ReactNode, options?: NotificationVariantOptions) {
        notifications.info(message, mergeNotificationOptions(normalizedDefaults, options));
      },
      warning(message: ReactNode, options?: NotificationVariantOptions) {
        notifications.warning(message, mergeNotificationOptions(normalizedDefaults, options));
      },
      apiError(
        error: unknown,
        fallback: string,
        options?: NotificationVariantOptions,
      ) {
        notifications.error(
          resolveNotificationMessage(error, fallback),
          mergeNotificationOptions(normalizedDefaults, options),
        );
      },
      saved(
        message: ReactNode = "Cambios guardados correctamente",
        options?: NotificationVariantOptions,
      ) {
        notifications.success(message, mergeNotificationOptions(normalizedDefaults, options));
      },
      deleted(
        message: ReactNode = "Registro eliminado correctamente",
        options?: NotificationVariantOptions,
      ) {
        notifications.success(message, mergeNotificationOptions(normalizedDefaults, options));
      },
      imported(
        message: ReactNode = "Importacion completada correctamente",
        options?: NotificationVariantOptions,
      ) {
        notifications.success(message, mergeNotificationOptions(normalizedDefaults, options));
      },
    }),
    [
      notifications,
      normalizedDefaults,
    ],
  );
}
