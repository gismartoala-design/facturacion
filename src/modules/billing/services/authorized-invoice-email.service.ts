import { Prisma, SriInvoiceStatus } from "@prisma/client";

import { createLogger } from "@/lib/logger";
import type { SaleInvoicePrintData } from "@/lib/sale-invoice-template";
import { prisma } from "@/lib/prisma";
import { buildAuthorizedInvoiceEmailAttachments } from "@/modules/billing/services/sri-invoice-artifact.service";
import { getSaleInvoicePrintData } from "@/modules/billing/services/sale-document-render.service";
import {
  isTransactionalEmailConfigured,
  sendTransactionalEmail,
  TRANSACTIONAL_EMAIL_SOURCE_SERVICE,
  type TransactionalEmailPayload,
  TransactionalEmailHttpError,
} from "@/modules/notifications/services/transactional-email.client";

const logger = createLogger("AuthorizedInvoiceEmail");

function summarizeEmailPayloadForLog(payload: TransactionalEmailPayload) {
  return {
    sourceService: payload.sourceService,
    eventType: payload.eventType,
    idempotencyKey: payload.idempotencyKey,
    subject: payload.subject,
    to: payload.to,
    attachments:
      payload.attachments?.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        contentBase64Length: attachment.contentBase64.length,
      })) ?? [],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: number): string {
  return value.toFixed(2);
}

function documentIdentifier(data: SaleInvoicePrintData) {
  return data.documentNumber ?? `VENTA-${data.saleNumber}`;
}

function buildAuthorizedInvoiceEmailHtml(data: SaleInvoicePrintData) {
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.productName)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.cantidad.toFixed(3)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${money(item.total)}</td>
        </tr>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura autorizada</title>
</head>
<body style="margin: 0; padding: 24px; background: #f4f1ea; color: #1f2937; font-family: Arial, sans-serif;">
  <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
    <div style="padding: 28px 28px 22px; background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: #ffffff;">
      <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.82;">Factura autorizada</p>
      <h1 style="margin: 0; font-size: 28px; line-height: 1.15;">${escapeHtml(documentIdentifier(data))}</h1>
      <p style="margin: 12px 0 0; font-size: 15px; line-height: 1.55;">Hola ${escapeHtml(data.customerName)}, tu factura ya fue autorizada correctamente.</p>
    </div>

    <div style="padding: 24px 28px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px;">
        <tbody>
          <tr>
            <td style="padding: 8px 0; width: 50%;"><strong>Empresa:</strong><br>${escapeHtml(data.companyLegalName || data.companyName)}</td>
            <td style="padding: 8px 0; width: 50%;"><strong>Cliente:</strong><br>${escapeHtml(data.customerName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Fecha emision:</strong><br>${escapeHtml(data.fechaEmision)}</td>
            <td style="padding: 8px 0;"><strong>Fecha autorizacion:</strong><br>${escapeHtml(data.fechaAutorizacion || "No disponible")}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Identificacion:</strong><br>${escapeHtml(data.customerIdentification)}</td>
            <td style="padding: 8px 0;"><strong>Total:</strong><br>$${money(data.total)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-bottom: 22px; padding: 16px 18px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px;">
        <p style="margin: 0 0 8px;"><strong>Numero de autorizacion:</strong></p>
        <p style="margin: 0 0 14px; word-break: break-all;">${escapeHtml(data.numeroAutorizacion || "No disponible")}</p>
        <p style="margin: 0 0 8px;"><strong>Clave de acceso:</strong></p>
        <p style="margin: 0; word-break: break-all;">${escapeHtml(data.claveAcceso || "No disponible")}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Descripcion</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">Cant.</th>
            <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="3" style="padding: 16px 12px; text-align: center;">Sin detalle</td></tr>`}
        </tbody>
      </table>

      <div style="margin-top: 22px; padding: 16px 18px; background: #fcfaf5; border: 1px solid #efe7d6; border-radius: 14px;">
        <p style="margin: 0 0 10px;"><strong>Resumen</strong></p>
        <p style="margin: 0 0 6px;">Subtotal: $${money(data.subtotal)}</p>
        <p style="margin: 0 0 6px;">Descuento: $${money(data.discountTotal)}</p>
        <p style="margin: 0 0 6px;">IVA: $${money(data.taxTotal)}</p>
        <p style="margin: 0; font-size: 18px;"><strong>Total final: $${money(data.total)}</strong></p>
      </div>

      <p style="margin: 22px 0 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
        Si necesitas ayuda con tu comprobante, puedes comunicarte con
        ${escapeHtml(data.companyName)}${data.companyEmail ? ` en ${escapeHtml(data.companyEmail)}` : ""}.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildAuthorizedInvoiceEmailText(data: SaleInvoicePrintData) {
  const lines = data.items.map(
    (item) =>
      `- ${item.productName} | Cant: ${item.cantidad.toFixed(3)} | Total: $${money(item.total)}`,
  );

  return [
    `Hola ${data.customerName},`,
    "",
    `Tu factura ${documentIdentifier(data)} fue autorizada correctamente.`,
    "",
    `Empresa: ${data.companyLegalName || data.companyName}`,
    `Cliente: ${data.customerName}`,
    `Identificacion: ${data.customerIdentification}`,
    `Fecha de emision: ${data.fechaEmision}`,
    `Fecha de autorizacion: ${data.fechaAutorizacion || "No disponible"}`,
    `Numero de autorizacion: ${data.numeroAutorizacion || "No disponible"}`,
    `Clave de acceso: ${data.claveAcceso || "No disponible"}`,
    "",
    "Detalle:",
    ...lines,
    "",
    `Subtotal: $${money(data.subtotal)}`,
    `Descuento: $${money(data.discountTotal)}`,
    `IVA: $${money(data.taxTotal)}`,
    `Total: $${money(data.total)}`,
    "",
    data.companyEmail
      ? `Si necesitas ayuda, puedes comunicarte con ${data.companyName} en ${data.companyEmail}.`
      : `Si necesitas ayuda, puedes comunicarte con ${data.companyName}.`,
  ].join("\n");
}

async function logEmailIntegration(params: {
  requestPayload: unknown;
  responsePayload?: unknown;
  httpStatus?: number;
  success: boolean;
  errorMessage?: string;
}) {
  await prisma.integrationLog.create({
    data: {
      service: "TRANSACTIONAL_EMAIL",
      operation: "SEND_INVOICE_AUTHORIZED",
      requestPayload: params.requestPayload as Prisma.InputJsonValue,
      responsePayload: params.responsePayload
        ? (params.responsePayload as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      httpStatus: params.httpStatus,
      success: params.success,
      errorMessage: params.errorMessage,
    },
  });
}

async function buildInvoiceAuthorizedEmailPayload(
  sriInvoiceId: string,
): Promise<TransactionalEmailPayload | null> {
  if (!isTransactionalEmailConfigured()) {
    logger.info("invoice:email:skipped-no-config", { sriInvoiceId });
    return null;
  }

  const invoice = await prisma.sriInvoice.findUnique({
    where: { id: sriInvoiceId },
    select: {
      id: true,
      saleId: true,
      issuerId: true,
      status: true,
      sale: {
        select: {
          customer: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    logger.warn("invoice:email:skipped-missing-invoice", { sriInvoiceId });
    return null;
  }

  if (invoice.status !== SriInvoiceStatus.AUTHORIZED) {
    logger.info("invoice:email:skipped-not-authorized", {
      sriInvoiceId,
      status: invoice.status,
    });
    return null;
  }

  const recipientEmail = invoice.sale.customer.email?.trim();
  if (!recipientEmail) {
    logger.info("invoice:email:skipped-missing-recipient", { sriInvoiceId });
    return null;
  }

  const issuer = await prisma.documentIssuer.findUnique({
    where: { id: invoice.issuerId },
    select: {
      businessId: true,
    },
  });

  if (!issuer?.businessId) {
    logger.warn("invoice:email:skipped-missing-business", {
      sriInvoiceId,
      issuerId: invoice.issuerId,
    });
    return null;
  }

  const data = await getSaleInvoicePrintData(invoice.saleId, issuer.businessId);
  const attachments = await buildAuthorizedInvoiceEmailAttachments(sriInvoiceId);
  return {
    sourceService: TRANSACTIONAL_EMAIL_SOURCE_SERVICE,
    eventType: "invoice.authorized",
    idempotencyKey: sriInvoiceId,
    subject: `Factura autorizada ${documentIdentifier(data)}`,
    to: {
      email: recipientEmail,
      name: data.customerName,
    },
    html: buildAuthorizedInvoiceEmailHtml(data),
    text: buildAuthorizedInvoiceEmailText(data),
    attachments,
  };
}

export async function sendAuthorizedInvoiceEmailIfApplicable(
  sriInvoiceId: string,
) {
  let payload: TransactionalEmailPayload | null = null;

  try {
    payload = await buildInvoiceAuthorizedEmailPayload(sriInvoiceId);
    if (!payload) {
      return;
    }
    
    const response = await sendTransactionalEmail(payload);

    await logEmailIntegration({
      requestPayload: summarizeEmailPayloadForLog(payload),
      responsePayload: response,
      httpStatus: 200,
      success: true,
    });

    logger.info("invoice:email:sent", {
      sriInvoiceId,
      to: payload.to.email,
      eventType: payload.eventType,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido enviando correo";
    const httpStatus =
      error instanceof TransactionalEmailHttpError
        ? (error.statusCode ?? undefined)
        : undefined;
    const responseBody =
      error instanceof TransactionalEmailHttpError
        ? error.responseBody
        : undefined;

    if (payload) {
      await logEmailIntegration({
        requestPayload: summarizeEmailPayloadForLog(payload),
        responsePayload: responseBody,
        httpStatus,
        success: false,
        errorMessage: message,
      });
    }

    logger.error("invoice:email:failed", {
      sriInvoiceId,
      to: payload?.to.email ?? null,
      message,
      httpStatus: httpStatus ?? null,
      responseBody: responseBody ?? null,
    });
  }
}
