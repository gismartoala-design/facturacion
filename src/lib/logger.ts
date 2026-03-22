type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const DEFAULT_DEBUG_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DEBUG_LOGS === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";

function getNowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function roundDuration(durationMs: number) {
  return Number(durationMs.toFixed(1));
}

function writeLog(
  level: LogLevel,
  scope: string,
  message: string,
  context?: LogContext,
) {
  const method =
    level === "debug"
      ? console.debug
      : level === "info"
        ? console.info
        : level === "warn"
          ? console.warn
          : console.error;

  const prefix = `[${scope}] ${message}`;
  if (context && Object.keys(context).length > 0) {
    method(prefix, context);
    return;
  }

  method(prefix);
}

export function createLogger(scope: string, options?: { debugEnabled?: boolean }) {
  const debugEnabled = options?.debugEnabled ?? DEFAULT_DEBUG_ENABLED;

  return {
    debug(message: string, context?: LogContext) {
      if (!debugEnabled) {
        return;
      }

      writeLog("debug", scope, message, context);
    },
    info(message: string, context?: LogContext) {
      writeLog("info", scope, message, context);
    },
    warn(message: string, context?: LogContext) {
      writeLog("warn", scope, message, context);
    },
    error(message: string, context?: LogContext) {
      writeLog("error", scope, message, context);
    },
  };
}

export function startTimer() {
  return getNowMs();
}

export function timerDurationMs(startedAt: number) {
  return roundDuration(getNowMs() - startedAt);
}
