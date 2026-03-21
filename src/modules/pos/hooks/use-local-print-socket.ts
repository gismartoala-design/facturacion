"use client";

import { useEffect, useRef, useState } from "react";

const LOCAL_PRINT_WS_URL =
  process.env.NEXT_PUBLIC_LOCAL_PRINT_WS_URL ?? "ws://localhost:10000/print";
const PRINTER_STORAGE_KEY = "arg-pos-printer-name";
const PRINT_DEBUG_PREFIX = "[POS Print WS]";

type SocketAction = "GetPrinters" | "PrintDocument";

type SocketEnvelope = {
  Action: SocketAction;
  StatusCode: number | null;
  Message: string | null;
  ResponseModel: unknown;
};

type PendingRequest = {
  resolve: (value: SocketEnvelope) => void;
  reject: (reason?: unknown) => void;
  timeoutId: number;
};

function toBase64(document: Uint8Array | string) {
  if (typeof document === "string") {
    return document;
  }

  let binary = "";
  for (let index = 0; index < document.length; index += 1) {
    binary += String.fromCharCode(document[index] ?? 0);
  }

  return window.btoa(binary);
}

export function useLocalPrintSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const connectPromiseRef = useRef<Promise<WebSocket> | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);
  const pendingRequestRef = useRef<Map<SocketAction, PendingRequest>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinterState] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(PRINTER_STORAGE_KEY),
  );

  function setSelectedPrinter(nextPrinter: string | null) {
    console.log(`${PRINT_DEBUG_PREFIX} setSelectedPrinter`, {
      nextPrinter,
    });
    setSelectedPrinterState(nextPrinter);

    if (typeof window === "undefined") {
      return;
    }

    if (nextPrinter) {
      window.localStorage.setItem(PRINTER_STORAGE_KEY, nextPrinter);
      return;
    }

    window.localStorage.removeItem(PRINTER_STORAGE_KEY);
  }

  function rejectPendingRequests(error: Error) {
    console.error(`${PRINT_DEBUG_PREFIX} rejectPendingRequests`, {
      message: error.message,
      pendingRequests: pendingRequestRef.current.size,
    });
    pendingRequestRef.current.forEach((pending) => {
      window.clearTimeout(pending.timeoutId);
      pending.reject(error);
    });
    pendingRequestRef.current.clear();
  }

  function scheduleReconnect() {
    if (!shouldReconnectRef.current || reconnectTimeoutRef.current !== null) {
      return;
    }

    console.warn(`${PRINT_DEBUG_PREFIX} scheduleReconnect`, {
      delayMs: 1800,
    });
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      void connect().catch(() => {
        scheduleReconnect();
      });
    }, 1800);
  }

  function handleSocketMessage(event: MessageEvent<string>) {
    try {
      console.log(`${PRINT_DEBUG_PREFIX} message:raw`, event.data);
      const parsed = JSON.parse(event.data) as SocketEnvelope;
      console.log(`${PRINT_DEBUG_PREFIX} message:parsed`, parsed);

      if (
        parsed.Action === "GetPrinters" &&
        parsed.StatusCode === 200 &&
        Array.isArray(parsed.ResponseModel)
      ) {
        setPrinters(
          parsed.ResponseModel.filter(
            (value): value is string => typeof value === "string",
          ),
        );
      }

      const pending = pendingRequestRef.current.get(parsed.Action);
      if (!pending) {
        return;
      }

      window.clearTimeout(pending.timeoutId);
      pendingRequestRef.current.delete(parsed.Action);
      pending.resolve(parsed);
    } catch {
      console.warn(`${PRINT_DEBUG_PREFIX} message:invalid-json`, event.data);
    }
  }

  function connect() {
    const current = socketRef.current;
    if (current?.readyState === WebSocket.OPEN) {
      console.log(`${PRINT_DEBUG_PREFIX} connect:reuse-open-socket`);
      return Promise.resolve(current);
    }

    if (connectPromiseRef.current) {
      console.log(`${PRINT_DEBUG_PREFIX} connect:reuse-pending-promise`);
      return connectPromiseRef.current;
    }

    connectPromiseRef.current = new Promise<WebSocket>((resolve, reject) => {
      try {
        console.log(`${PRINT_DEBUG_PREFIX} connect:opening`, {
          url: LOCAL_PRINT_WS_URL,
        });
        const socket = new WebSocket(LOCAL_PRINT_WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log(`${PRINT_DEBUG_PREFIX} socket:onopen`);
          setIsConnected(true);
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          connectPromiseRef.current = null;
          resolve(socket);
          void sendRequest("GetPrinters", null).catch(() => {
            // The bridge may connect before the printer service is ready.
          });
        };

        socket.onclose = () => {
          console.warn(`${PRINT_DEBUG_PREFIX} socket:onclose`);
          setIsConnected(false);
          socketRef.current = null;
          connectPromiseRef.current = null;
          rejectPendingRequests(
            new Error("La conexion con la impresora local se cerro"),
          );
          scheduleReconnect();
        };

        socket.onerror = () => {
          console.error(`${PRINT_DEBUG_PREFIX} socket:onerror`);
          setIsConnected(false);
          connectPromiseRef.current = null;
          reject(
            new Error(
              "No se pudo conectar con el servicio local de impresion",
            ),
          );
        };

        socket.onmessage = handleSocketMessage;
      } catch {
        console.error(`${PRINT_DEBUG_PREFIX} connect:init-failed`);
        connectPromiseRef.current = null;
        reject(
          new Error("No se pudo inicializar el servicio local de impresion"),
        );
      }
    });

    return connectPromiseRef.current;
  }

  function ensureSocket() {
    const current = socketRef.current;
    if (current?.readyState === WebSocket.OPEN) {
      return Promise.resolve(current);
    }

    if (current?.readyState === WebSocket.CONNECTING && connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    return connect();
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    void connect().catch(() => {
      // The POS can still fall back to browser printing if the local bridge
      // is unavailable during startup.
    });

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  async function sendRequest(action: SocketAction, responseModel: unknown) {
    const socket = await ensureSocket();
    console.log(`${PRINT_DEBUG_PREFIX} request:start`, {
      action,
      responseModel,
      readyState: socket.readyState,
    });

    if (pendingRequestRef.current.has(action)) {
      const existing = pendingRequestRef.current.get(action);
      if (existing) {
        window.clearTimeout(existing.timeoutId);
        existing.reject(
          new Error("La solicitud anterior de impresion fue reemplazada"),
        );
      }
      pendingRequestRef.current.delete(action);
    }

    return new Promise<SocketEnvelope>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        pendingRequestRef.current.delete(action);
        console.error(`${PRINT_DEBUG_PREFIX} request:timeout`, {
          action,
        });
        reject(new Error("El servicio local de impresion no respondio"));
      }, 8000);

      pendingRequestRef.current.set(action, {
        resolve,
        reject,
        timeoutId,
      });

      const payload = {
        Action: action,
        StatusCode: null,
        Message: null,
        ResponseModel: responseModel,
      };

      console.log(`${PRINT_DEBUG_PREFIX} request:send`, payload);
      socket.send(JSON.stringify(payload));
    });
  }

  async function loadPrinters() {
    const response = await sendRequest("GetPrinters", null);
    console.log(`${PRINT_DEBUG_PREFIX} loadPrinters:response`, response);
    if (response.StatusCode !== 200) {
      throw new Error(response.Message || "No se pudieron obtener impresoras");
    }

    return Array.isArray(response.ResponseModel)
      ? response.ResponseModel.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
  }

  async function printDocumentBytes(
    printerName: string,
    document: Uint8Array | string,
  ) {
    const encodedDocument = toBase64(document);

    console.log(`${PRINT_DEBUG_PREFIX} printDocumentBytes:start`, {
      printerName,
      payloadType: typeof document === "string" ? "base64" : "uint8array",
      originalLength:
        typeof document === "string" ? document.length : document.byteLength,
      base64Length: encodedDocument.length,
      base64Preview: encodedDocument.slice(0, 64),
    });
    const response = await sendRequest("PrintDocument", {
      namePrinter: printerName,
      documents: [encodedDocument],
    });

    console.log(`${PRINT_DEBUG_PREFIX} printDocumentBytes:response`, response);
    if (response.StatusCode !== 200) {
      throw new Error(response.Message || "No se pudo imprimir el documento");
    }

    return response;
  }

  return {
    isConnected,
    printers,
    selectedPrinter,
    setSelectedPrinter,
    loadPrinters,
    printDocumentBytes,
  };
}
