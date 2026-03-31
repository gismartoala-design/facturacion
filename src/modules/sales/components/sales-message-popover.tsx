import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type MessageTone = "success" | "error" | "info";

export type SalesMessage = {
  text: string;
  tone: MessageTone;
};

type SalesMessagePopoverProps = {
  message: SalesMessage | null;
  onClose: () => void;
};

export function SalesMessagePopover({
  message,
  onClose,
}: SalesMessagePopoverProps) {
  const ToneIcon =
    message?.tone === "success"
      ? CheckCircle2
      : message?.tone === "error"
        ? AlertTriangle
        : Info;

  return (
    <Snackbar
      open={Boolean(message)}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        onClose();
      }}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      autoHideDuration={4500}
    >
      <Alert
        severity={message?.tone ?? "info"}
        variant="filled"
        icon={<ToneIcon className="h-4 w-4" />}
        action={
          <IconButton
            aria-label="Cerrar mensaje"
            color="inherit"
            size="small"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </IconButton>
        }
        sx={{
          width: "100%",
          minWidth: 320,
          borderRadius: "16px",
          boxShadow: "0 18px 38px rgba(74, 60, 88, 0.18)",
        }}
      >
        {message?.text ?? ""}
      </Alert>
    </Snackbar>
  );
}
