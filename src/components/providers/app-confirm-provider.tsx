"use client";

import Alert, { type AlertColor } from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AppConfirmOptions = {
  title?: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: AlertColor;
  destructive?: boolean;
};

type ConfirmRequest = AppConfirmOptions & {
  id: number;
  resolve: (value: boolean) => void;
};

type ConfirmState = {
  open: boolean;
  current: ConfirmRequest | null;
  queue: ConfirmRequest[];
};

type ConfirmContextValue = {
  confirm: (options: AppConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const DEFAULT_TITLE = "Confirmar acción";
const DEFAULT_CONFIRM_LABEL = "Confirmar";
const DEFAULT_CANCEL_LABEL = "Cancelar";

export function AppConfirmProvider({ children }: { children: ReactNode }) {
  const nextIdRef = useRef(0);
  const [state, setState] = useState<ConfirmState>({
    open: false,
    current: null,
    queue: [],
  });

  const confirm = useCallback((options: AppConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      nextIdRef.current += 1;
      const request: ConfirmRequest = {
        id: nextIdRef.current,
        resolve,
        ...options,
      };

      setState((previous) => {
        if (!previous.current) {
          return {
            open: true,
            current: request,
            queue: previous.queue,
          };
        }

        return {
          open: previous.open,
          current: previous.current,
          queue: [...previous.queue, request],
        };
      });
    });
  }, []);

  const settleCurrent = useCallback((accepted: boolean) => {
    setState((previous) => {
      const current = previous.current;

      if (!current) {
        return previous;
      }

      current.resolve(accepted);

      if (previous.queue.length === 0) {
        return {
          open: false,
          current: null,
          queue: [],
        };
      }

      const [nextRequest, ...rest] = previous.queue;

      return {
        open: true,
        current: nextRequest,
        queue: rest,
      };
    });
  }, []);

  const contextValue = useMemo<ConfirmContextValue>(
    () => ({ confirm }),
    [confirm],
  );

  const severity = state.current?.severity ?? "warning";
  const confirmColor =
    state.current?.destructive || severity === "error" ? "error" : "primary";

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <Dialog
        open={state.open}
        onClose={() => settleCurrent(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{state.current?.title ?? DEFAULT_TITLE}</DialogTitle>
        <DialogContent>
          <Alert
            severity={severity}
            variant="outlined"
            sx={{ borderRadius: "16px", alignItems: "flex-start" }}
          >
            <Typography component="span" sx={{ whiteSpace: "pre-line" }}>
              {state.current?.message ?? ""}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button variant="outlined" onClick={() => settleCurrent(false)}>
            {state.current?.cancelLabel ?? DEFAULT_CANCEL_LABEL}
          </Button>
          <Button
            variant="contained"
            color={confirmColor}
            onClick={() => settleCurrent(true)}
          >
            {state.current?.confirmLabel ?? DEFAULT_CONFIRM_LABEL}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useAppConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useAppConfirm must be used within AppConfirmProvider");
  }

  return context.confirm;
}
