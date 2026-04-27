import {
  AccountingSourceType,
  AccountsPayableStatus,
  Prisma,
  PurchaseStatus,
  SupplierPaymentStatus,
} from "@prisma/client";

import {
  postSupplierPaymentEntryInTransaction,
  reversePostedEntryBySourceInTransaction,
} from "@/core/accounting/accounting-entry.service";
import {
  createSupplierPaymentSchema,
  voidSupplierPaymentSchema,
} from "@/core/purchases/accounts-payable.schemas";
import { prisma } from "@/lib/prisma";

const payableSelect = {
  id: true,
  businessId: true,
  supplierId: true,
  purchaseId: true,
  documentType: true,
  documentNumber: true,
  currency: true,
  issuedAt: true,
  dueAt: true,
  originalAmount: true,
  paidAmount: true,
  pendingAmount: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: {
      id: true,
      razonSocial: true,
      nombreComercial: true,
      identificacion: true,
    },
  },
  purchase: {
    select: {
      purchaseNumber: true,
      status: true,
    },
  },
  payments: {
    select: {
      id: true,
      supplierPaymentNumber: true,
      amount: true,
      paymentMethod: true,
      status: true,
      externalReference: true,
      notes: true,
      paidAt: true,
      voidedAt: true,
      voidReason: true,
      createdAt: true,
    },
    orderBy: { paidAt: "desc" },
  },
} satisfies Prisma.AccountsPayableSelect;

type PayablePayload = Prisma.AccountsPayableGetPayload<{
  select: typeof payableSelect;
}>;

type PayableSeed = {
  businessId: string;
  supplierId: string;
  purchaseId: string;
  documentType: string;
  documentNumber: string;
  issuedAt: Date;
  total: Prisma.Decimal | number;
  supplierCreditDays: number;
};

function nullableText(value: string | undefined) {
  return value?.trim() || null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolvePayableStatus(params: {
  originalAmount: number;
  pendingAmount: number;
  dueAt: Date | null;
}) {
  if (params.pendingAmount <= 0) {
    return AccountsPayableStatus.PAID;
  }

  if (params.pendingAmount < params.originalAmount) {
    return params.dueAt && params.dueAt < new Date()
      ? AccountsPayableStatus.OVERDUE
      : AccountsPayableStatus.PARTIALLY_PAID;
  }

  return params.dueAt && params.dueAt < new Date()
    ? AccountsPayableStatus.OVERDUE
    : AccountsPayableStatus.OPEN;
}

function payablePresenter(payable: PayablePayload) {
  const status =
    payable.status === AccountsPayableStatus.CANCELLED
      ? AccountsPayableStatus.CANCELLED
      : resolvePayableStatus({
          originalAmount: Number(payable.originalAmount),
          pendingAmount: Number(payable.pendingAmount),
          dueAt: payable.dueAt,
        });

  return {
    id: payable.id,
    businessId: payable.businessId,
    supplierId: payable.supplierId,
    supplierName:
      payable.supplier.nombreComercial || payable.supplier.razonSocial,
    supplierIdentification: payable.supplier.identificacion,
    purchaseId: payable.purchaseId,
    purchaseNumber: payable.purchase.purchaseNumber.toString(),
    purchaseStatus: payable.purchase.status,
    documentType: payable.documentType,
    documentNumber: payable.documentNumber,
    currency: payable.currency,
    issuedAt: payable.issuedAt.toISOString(),
    dueAt: payable.dueAt?.toISOString() ?? null,
    originalAmount: Number(payable.originalAmount),
    paidAmount: Number(payable.paidAmount),
    pendingAmount: Number(payable.pendingAmount),
    status,
    notes: payable.notes,
    createdAt: payable.createdAt.toISOString(),
    updatedAt: payable.updatedAt.toISOString(),
    payments: payable.payments.map((payment) => ({
      id: payment.id,
      supplierPaymentNumber: payment.supplierPaymentNumber.toString(),
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      externalReference: payment.externalReference,
      notes: payment.notes,
      paidAt: payment.paidAt.toISOString(),
      voidedAt: payment.voidedAt?.toISOString() ?? null,
      voidReason: payment.voidReason,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export async function createPayableForPurchaseInTransaction(
  tx: Prisma.TransactionClient,
  seed: PayableSeed,
) {
  const originalAmount = roundMoney(Number(seed.total));
  const dueAt =
    seed.supplierCreditDays > 0
      ? addDays(seed.issuedAt, seed.supplierCreditDays)
      : seed.issuedAt;

  return tx.accountsPayable.create({
    data: {
      businessId: seed.businessId,
      supplierId: seed.supplierId,
      purchaseId: seed.purchaseId,
      documentType: seed.documentType,
      documentNumber: seed.documentNumber,
      issuedAt: seed.issuedAt,
      dueAt,
      originalAmount: new Prisma.Decimal(originalAmount),
      pendingAmount: new Prisma.Decimal(originalAmount),
      status: resolvePayableStatus({
        originalAmount,
        pendingAmount: originalAmount,
        dueAt,
      }),
      notes: `Generada desde compra ${seed.documentNumber}`,
    },
  });
}

export async function cancelPayableForPurchaseInTransaction(
  tx: Prisma.TransactionClient,
  purchaseId: string,
  reason: string,
) {
  const payable = await tx.accountsPayable.findUnique({
    where: { purchaseId },
    select: {
      id: true,
      paidAmount: true,
      status: true,
    },
  });

  if (!payable) {
    return;
  }

  if (payable.status === AccountsPayableStatus.CANCELLED) {
    return;
  }

  if (Number(payable.paidAmount) > 0) {
    throw new Error(
      "No se puede anular la compra porque ya tiene pagos registrados",
    );
  }

  await tx.accountsPayable.update({
    where: { id: payable.id },
    data: {
      status: AccountsPayableStatus.CANCELLED,
      pendingAmount: new Prisma.Decimal(0),
      notes: `Cancelada por anulacion de compra | ${reason}`,
    },
  });
}

export async function listAccountsPayable(businessId: string) {
  const payables = await prisma.accountsPayable.findMany({
    select: payableSelect,
    where: { businessId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { issuedAt: "desc" }],
    take: 200,
  });

  return payables.map(payablePresenter);
}

export async function createSupplierPayment(
  businessId: string,
  registeredById: string | null,
  rawInput: unknown,
) {
  const input = createSupplierPaymentSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const payable = await tx.accountsPayable.findFirst({
      where: {
        id: input.payableId,
        businessId,
      },
      include: {
        purchase: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!payable) {
      throw new Error("Cuenta por pagar no encontrada");
    }

    if (payable.purchase.status === PurchaseStatus.VOIDED) {
      throw new Error("No se puede pagar una compra anulada");
    }

    if (payable.status === AccountsPayableStatus.CANCELLED) {
      throw new Error("No se puede pagar una cuenta cancelada");
    }

    if (payable.status === AccountsPayableStatus.PAID) {
      throw new Error("La cuenta por pagar ya esta pagada");
    }

    const amount = roundMoney(input.amount);
    const pendingAmount = Number(payable.pendingAmount);

    if (amount > pendingAmount) {
      throw new Error("El pago no puede superar el saldo pendiente");
    }

    const payment = await tx.supplierPayment.create({
      data: {
        businessId,
        supplierId: payable.supplierId,
        payableId: payable.id,
        amount: new Prisma.Decimal(amount),
        paymentMethod: input.paymentMethod,
        externalReference: nullableText(input.externalReference),
        notes: nullableText(input.notes),
        registeredById,
        paidAt: input.paidAt ?? new Date(),
        status: SupplierPaymentStatus.APPLIED,
      },
    });

    await postSupplierPaymentEntryInTransaction(tx, {
      businessId,
      supplierPaymentId: payment.id,
      amount,
      paymentMethod: input.paymentMethod,
    });

    const paidAmount = roundMoney(Number(payable.paidAmount) + amount);
    const nextPendingAmount = roundMoney(Number(payable.originalAmount) - paidAmount);
    const status = resolvePayableStatus({
      originalAmount: Number(payable.originalAmount),
      pendingAmount: nextPendingAmount,
      dueAt: payable.dueAt,
    });

    const updated = await tx.accountsPayable.update({
      where: { id: payable.id },
      data: {
        paidAmount: new Prisma.Decimal(paidAmount),
        pendingAmount: new Prisma.Decimal(nextPendingAmount),
        status,
      },
      select: payableSelect,
    });

    return payablePresenter(updated);
  }, { timeout: 15000 });
}

export async function voidSupplierPayment(
  businessId: string,
  voidedById: string | null,
  paymentId: string,
  rawInput: unknown,
) {
  const input = voidSupplierPaymentSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.findFirst({
      where: {
        id: paymentId,
        businessId,
      },
      include: {
        payable: true,
      },
    });

    if (!payment) {
      throw new Error("Pago a proveedor no encontrado");
    }

    if (payment.status === SupplierPaymentStatus.VOIDED) {
      throw new Error("El pago ya fue anulado");
    }

    if (payment.payable.status === AccountsPayableStatus.CANCELLED) {
      throw new Error("No se puede anular un pago de una cuenta cancelada");
    }

    await tx.supplierPayment.update({
      where: { id: payment.id },
      data: {
        status: SupplierPaymentStatus.VOIDED,
        voidedAt: new Date(),
        voidedById,
        voidReason: input.reason,
      },
    });

    await reversePostedEntryBySourceInTransaction(tx, {
      businessId,
      sourceType: AccountingSourceType.SUPPLIER_PAYMENT,
      sourceId: payment.id,
    });

    const paidAmount = roundMoney(
      Math.max(Number(payment.payable.paidAmount) - Number(payment.amount), 0),
    );
    const pendingAmount = roundMoney(
      Number(payment.payable.originalAmount) - paidAmount,
    );
    const status = resolvePayableStatus({
      originalAmount: Number(payment.payable.originalAmount),
      pendingAmount,
      dueAt: payment.payable.dueAt,
    });

    const updated = await tx.accountsPayable.update({
      where: { id: payment.payableId },
      data: {
        paidAmount: new Prisma.Decimal(paidAmount),
        pendingAmount: new Prisma.Decimal(pendingAmount),
        status,
      },
      select: payableSelect,
    });

    return payablePresenter(updated);
  }, { timeout: 15000 });
}
