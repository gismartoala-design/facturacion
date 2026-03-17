"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, ChevronDown, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

const helpMessages: Record<string, { title: string; message: string }> = {
    overview: {
        title: "¡Hola! Soy tu asistente 🤖",
        message:
            "Aquí en el Resumen puedes ver de un vistazo el estado de tus ventas, ingresos y los productos que están con bajo stock. ¡Es tu centro de control!",
    },
    products: {
        title: "Gestión de Productos 📦",
        message:
            "En esta sección puedes buscar, crear o editar tus productos. Recuerda asignar correctamente el precio y el IVA. ¡Mantén tu catálogo al día!",
    },
    inventory: {
        title: "Control de Inventario 📊",
        message:
            "Aquí controlas las entradas y salidas de mercancía. Usa el botón 'Ajustar stock' para registrar nuevos ingresos o mermas de forma manual.",
    },
    checkout: {
        title: "Punto de Venta (Checkout) 🛒",
        message:
            "¡Hora de vender! Sigue los pasos: 1. Verifica los datos de emisión. 2. Busca o selecciona el cliente. 3. Agrega los productos al carrito. Al final, presiona Confirmar.",
    },
    quotes: {
        title: "Cotizaciones / Proformas 📄",
        message:
            "Guarda propuestas sin afectar stock y conviértelas a venta cuando el cliente confirme. También puedes anular cotizaciones que ya no apliquen.",
    },
    sri: {
        title: "Facturación Electrónica (SRI) 🧾",
        message:
            "Si alguna factura no pudo ser autorizada por el SRI debido a un error temporal, puedes intentar reenviarla desde aquí. ¡Asegúrate de no tener pendientes!",
    },
};

export function HelpBot() {
    const [isOpen, setIsOpen] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const pathname = usePathname();
    const activeSection = pathname.replace("/", "") || "overview";

    const currentHelp = helpMessages[activeSection] || helpMessages.overview;

    useEffect(() => {
        // Cuando cambia la sección, hacemos un pequeno efecto de atencion si el bot esta abierto
        if (isOpen) {
            const startTimer = setTimeout(() => setIsAnimating(true), 0);
            const stopTimer = setTimeout(() => setIsAnimating(false), 500);
            return () => {
                clearTimeout(startTimer);
                clearTimeout(stopTimer);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, isOpen]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`w-72 md:w-80 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl transition-transform ${isAnimating ? "scale-[1.02]" : ""
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 text-indigo-700">
                                <Bot className="h-5 w-5" />
                                <h3 className="font-semibold">{currentHelp.title}</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                            {currentHelp.message}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className={`h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isOpen ? "bg-slate-800 hover:bg-slate-700" : "bg-gradient-to-tr from-indigo-600 to-purple-600 hover:shadow-xl"
                    } text-white border-0`}
            >
                {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-6 w-6" />}
            </Button>
        </div>
    );
}
