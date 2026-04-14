"use client";

export type MessageState = {
  tone: "success" | "error" | "info";
  text: string;
} | null;

export type RestaurantOperationsScreen = "floor" | "table" | "waiter" | "kitchen";

export type RestaurantOperationsAppProps = {
  initialBootstrap: RestaurantBootstrap | null;
  initialBootstrapError?: string | null;
  screen?: RestaurantOperationsScreen;
  initialSelectedTableId?: string | null;
};

export type RestaurantBootstrap = {
  business: {
    id: string;
    name: string;
    legalName?: string | null;
    ruc?: string | null;
  };
  operator: {
    id: string;
    name: string;
    role: "ADMIN" | "SELLER";
  };
  posRuntime: {
    policyPack: "POS_GENERIC" | "POS_BUTCHERY" | "POS_RESTAURANT";
  };
  restaurantRuntime: {
    service: {
      tableService: boolean;
      splitBill: boolean;
      transferTables: boolean;
      mergeTables: boolean;
    };
    channels: {
      takeout: boolean;
      delivery: boolean;
    };
    kitchen: {
      kds: boolean;
      printTickets: boolean;
    };
    inventory: {
      recipeConsumption: boolean;
      prepProduction: boolean;
      consumePoint: "SALE_CONFIRM" | "KITCHEN_FIRE";
    };
  };
  cashSession: {
    id: string;
    status: "OPEN" | "CLOSED" | "PENDING_APPROVAL";
    openingAmount: number;
  } | null;
  diningAreas: Array<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
  }>;
  kitchenStations: Array<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
  }>;
  floor: RestaurantFloorTable[];
  products: RestaurantProduct[];
};

export type RestaurantProduct = {
  id: string;
  secuencial: string;
  sku: string | null;
  codigoBarras: string | null;
  tipoProducto: "BIEN" | "SERVICIO";
  nombre: string;
  descripcion: string | null;
  precio: number;
  tarifaIva: number;
  activo: boolean;
  restaurantVisible: boolean;
  restaurantCategory: string | null;
  restaurantMenuGroup: string | null;
  restaurantMenuSortOrder: number | null;
  restaurantStationCode: string | null;
  allowsModifiers: boolean;
  prepTimeMinutes: number | null;
  stock: number;
  minStock: number;
};

export type RestaurantFloorTable = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  areaName: string | null;
  guestCount: number | null;
  hasActiveSession: boolean;
  activeSessionId: string | null;
  activeOrderId: string | null;
  orderStatus:
    | "OPEN"
    | "IN_PREPARATION"
    | "PARTIALLY_SERVED"
    | "SERVED"
    | "PARTIALLY_PAID"
    | "PAID"
    | "CANCELLED"
    | null;
  operationalStatus:
    | "AVAILABLE"
    | "SESSION_OPEN"
    | "ORDER_OPEN"
    | "READY_FOR_SETTLEMENT";
  openTotal: number;
};

export type RestaurantOrderDetail = {
  id: string;
  channel: "DINE_IN" | "TAKEOUT" | "DELIVERY";
  status:
    | "OPEN"
    | "IN_PREPARATION"
    | "PARTIALLY_SERVED"
    | "SERVED"
    | "PARTIALLY_PAID"
    | "PAID"
    | "CANCELLED";
  guestCount: number | null;
  notes: string | null;
  table: {
    id: string;
    code: string;
    name: string;
    diningAreaName: string | null;
  } | null;
  session: {
    id: string;
    status: "OPEN" | "CLOSED" | "MERGED" | "TRANSFERRED";
    guestCount: number;
    openedAt: string;
    closedAt: string | null;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    activeQuantity: number;
    remainingQuantity: number;
    billedQuantity: number;
    cancelledQuantity: number;
    unitPrice: number;
    ivaRate: number;
    discount: number;
    notes: string | null;
    status:
      | "PENDING"
      | "SENT"
      | "IN_PREPARATION"
      | "READY"
      | "SERVED"
      | "CANCELLED"
      | "BILLED";
    totals: {
      subtotal: number;
      taxTotal: number;
      total: number;
      discount: number;
    };
    openTotals: {
      subtotal: number;
      taxTotal: number;
      total: number;
      discount: number;
    };
    modifiers: Array<{
      id: string;
      name: string;
      priceDelta: number;
    }>;
  }>;
  kitchenTickets: Array<{
    id: string;
    stationCode: string;
    stationName: string;
    status: "NEW" | "IN_PREPARATION" | "READY" | "SERVED" | "CANCELLED";
    createdAt: string;
    items: Array<{
      id: string;
      orderItemId: string;
      quantity: number;
      status: "NEW" | "IN_PREPARATION" | "READY" | "SERVED" | "CANCELLED";
    }>;
  }>;
  totals: {
    openTotal: number;
  };
};

export type KitchenTicketView = {
  id: string;
  stationCode: string;
  stationName: string;
  status: "NEW" | "IN_PREPARATION" | "READY" | "SERVED" | "CANCELLED";
  createdAt: string;
  order: {
    id: string;
    channel: "DINE_IN" | "TAKEOUT" | "DELIVERY";
    tableName: string | null;
    customerName: string | null;
  };
  items: Array<{
    id: string;
    orderItemId: string;
    status: "NEW" | "IN_PREPARATION" | "READY" | "SERVED" | "CANCELLED";
    quantity: number;
    productName: string;
    notes: string | null;
    modifiers: string[];
  }>;
};

export type DraftItem = {
  productId: string;
  quantity: number;
};
