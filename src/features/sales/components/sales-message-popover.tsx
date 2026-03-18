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
  if (!message) return null;

  const toneStyles: Record<MessageTone, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-indigo-200 bg-indigo-50 text-indigo-800",
  };

  const ToneIcon =
    message.tone === "success"
      ? CheckCircle2
      : message.tone === "error"
        ? AlertTriangle
        : Info;

  return (
    <div className="fixed right-4 top-4 z-60 w-full max-w-sm">
      <div
        className={`rounded-xl border p-3 shadow-lg ${toneStyles[message.tone]}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-2">
          <ToneIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1 text-sm font-medium">{message.text}</p>
          <button
            type="button"
            aria-label="Cerrar mensaje"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
