import {
  BarChart3,
  Package,
  type LucideIcon,
  ShoppingCart,
  Users,
} from "lucide-react";

export type ReportCatalogEntry = {
  id: string;
  href: string;
  label: string;
  shortDescription: string;
  purpose: string;
  questions: string[];
  tags: string[];
  icon: LucideIcon;
};

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  {
    id: "sales-period",
    href: "/reports/sales-period",
    label: "Ventas por periodo",
    shortDescription: "Libro transaccional por rango de fechas.",
    purpose:
      "Auditar las ventas registradas en un corte y validar cliente, vendedor, documento, pagos declarados y detalle por lineas.",
    questions: [
      "Que ventas se emitieron en el periodo consultado",
      "Quien registro cada venta y para que cliente",
      "Con que documento y medios de pago quedo respaldada",
    ],
    tags: ["Ventas", "Auditoria", "Exportable"],
    icon: ShoppingCart,
  },
  {
    id: "sales-by-customer",
    href: "/reports/sales-by-customer",
    label: "Ventas por cliente",
    shortDescription: "Ranking comercial para saber quien compra mas.",
    purpose:
      "Agrupar ventas por cliente para identificar recurrencia, monto acumulado y ticket promedio dentro de un periodo.",
    questions: [
      "Que clientes compran mas",
      "Cuantas compras hizo cada cliente en el periodo",
      "Cual es el ticket promedio y la ultima compra por cliente",
    ],
    tags: ["Clientes", "Ranking", "Analitico"],
    icon: Users,
  },
  {
    id: "sales-by-product",
    href: "/reports/sales-by-product",
    label: "Ventas por producto",
    shortDescription: "Ranking de productos mas vendidos.",
    purpose:
      "Agrupar lineas de venta por producto para identificar rotacion, monto vendido y participacion comercial.",
    questions: [
      "Que productos se venden mas",
      "Cuantas unidades se movieron por producto",
      "Que productos aportan mayor facturacion",
    ],
    tags: ["Productos", "Ranking", "Analitico"],
    icon: Package,
  },
];

export const REPORTS_MODULE_COPY = {
  title: "Reportes",
  description:
    "Este modulo concentra vistas de lectura y auditoria. Cada reporte existe para responder una pregunta concreta del negocio sin mezclar captura operativa, calculo y presentacion.",
  catalogTitle: "Catalogo de reportes",
  catalogDescription:
    "Cada entrada debe tener un proposito claro, filtros propios y una salida util para auditoria o analisis.",
  icon: BarChart3,
} as const;
