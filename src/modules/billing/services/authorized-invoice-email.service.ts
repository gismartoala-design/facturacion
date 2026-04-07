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
          <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">${escapeHtml(item.productName)}</td>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 13px;">${item.cantidad.toFixed(3)}</td>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b; font-size: 14px; font-weight: 700;">$${money(item.total)}</td>
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
<body style="margin: 0; padding: 32px 18px; background: #f8fafc; background-image: radial-gradient(circle at top, rgba(139, 92, 246, 0.12), transparent 30%), linear-gradient(180deg, #f5f3ff 0%, #f8fafc 26%, #f8fafc 100%); color: #1e293b; font-family: Outfit, 'Avenir Next', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);">
    <div style="padding: 30px 30px 26px; background: linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%); border-bottom: 1px solid #e2e8f0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td style="vertical-align: top;">
              <span style="display: inline-block; padding: 7px 12px; border-radius: 999px; background: #ede9fe; color: #6d28d9; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">Factura autorizada</span>
              <h1 style="margin: 16px 0 8px; font-size: 31px; line-height: 1.08; color: #1e293b;">${escapeHtml(documentIdentifier(data))}</h1>
              <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.7;">Hola ${escapeHtml(data.customerName)}, adjuntamos tu comprobante electronico autorizado.</p>
            </td>
            <td style="width: 148px; vertical-align: top; text-align: right;">
              <div style="display: inline-block; min-width: 120px; padding: 14px 16px; border-radius: 18px; background: #8b5cf6; color: #ffffff; text-align: left; box-shadow: 0 14px 32px rgba(139, 92, 246, 0.28);">
                <div style="font-size: 11px; line-height: 1.2; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.76;">Total</div>
                <div style="margin-top: 8px; font-size: 26px; line-height: 1; font-weight: 800;">$${money(data.total)}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="padding: 28px 30px 30px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
        <tbody>
          <tr>
            <td style="width: 50%; padding: 0 10px 10px 0; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #8b5cf6; margin-bottom: 8px;">Empresa</div>
              <div style="font-size: 17px; font-weight: 700; color: #1e293b; line-height: 1.35;">${escapeHtml(data.companyLegalName || data.companyName)}</div>
              <div style="margin-top: 8px; font-size: 13px; line-height: 1.7; color: #64748b;">${escapeHtml(data.companyEmail || "Sin correo registrado")}</div>
            </td>
            <td style="width: 50%; padding: 0 0 10px 10px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #8b5cf6; margin-bottom: 8px;">Cliente</div>
              <div style="font-size: 17px; font-weight: 700; color: #1e293b; line-height: 1.35;">${escapeHtml(data.customerName)}</div>
              <div style="margin-top: 8px; font-size: 13px; line-height: 1.7; color: #64748b;">${escapeHtml(data.customerIdentification)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tbody>
          <tr>
            <td style="width: 33.33%; padding: 0 12px 0 0; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Fecha emision</div>
              <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${escapeHtml(data.fechaEmision)}</div>
            </td>
            <td style="width: 33.33%; padding: 0 12px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Fecha autorizacion</div>
              <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${escapeHtml(data.fechaAutorizacion || "No disponible")}</div>
            </td>
            <td style="width: 33.33%; padding: 0 0 0 12px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Estado</div>
              <div><span style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: #ecfdf5; color: #059669; font-size: 12px; font-weight: 800;">Autorizada</span></div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-bottom: 22px; padding: 16px 0 18px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <div style="margin: 0 0 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #8b5cf6;">N. autorizacion / clave de acceso</div>
        <div style="word-break: break-all; font-size: 14px; line-height: 1.8; color: #1e293b;">${escapeHtml(data.numeroAutorizacion || data.claveAcceso || "No disponible")}</div>
      </div>

      <div style="margin-bottom: 22px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff;">
        <div style="padding: 16px 18px; background: #f5f3ff; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #6d28d9;">Detalle de la venta</div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #ffffff;">
            <th style="padding: 14px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;">Descripcion</th>
            <th style="padding: 14px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;">Cant.</th>
            <th style="padding: 14px 16px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="3" style="padding: 18px 16px; text-align: center; color: #64748b; font-size: 14px;">Sin detalle</td></tr>`}
        </tbody>
      </table>
      </div>

      <div style="padding: 18px 20px; border-radius: 20px; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e2e8f0;">
        <div style="margin: 0 0 14px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #8b5cf6;">Resumen</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr><td style="padding: 0 0 10px; color: #64748b; font-size: 14px;">Subtotal</td><td style="padding: 0 0 10px; text-align: right; color: #1e293b; font-size: 14px; font-weight: 700;">$${money(data.subtotal)}</td></tr>
            <tr><td style="padding: 0 0 10px; color: #64748b; font-size: 14px;">Descuento</td><td style="padding: 0 0 10px; text-align: right; color: #1e293b; font-size: 14px; font-weight: 700;">$${money(data.discountTotal)}</td></tr>
            <tr><td style="padding: 0 0 12px; color: #64748b; font-size: 14px;">IVA</td><td style="padding: 0 0 12px; text-align: right; color: #1e293b; font-size: 14px; font-weight: 700;">$${money(data.taxTotal)}</td></tr>
            <tr><td colspan="2" style="padding: 0 0 12px;"><div style="height: 1px; background: #e2e8f0;"></div></td></tr>
            <tr><td style="padding: 0; color: #1e293b; font-size: 16px; font-weight: 800;">Total final</td><td style="padding: 0; text-align: right; color: #8b5cf6; font-size: 21px; font-weight: 800;">$${money(data.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <p style="margin: 22px 0 0; font-size: 14px; line-height: 1.75; color: #64748b;">
        Si necesitas ayuda con tu comprobante, puedes comunicarte con
        <span style="color: #1e293b; font-weight: 700;">${escapeHtml(data.companyName)}</span>${data.companyEmail ? ` en <span style="color: #8b5cf6; font-weight: 700;">${escapeHtml(data.companyEmail)}</span>` : ""}.
      </div>
    </div>
    <div style="padding: 16px 30px 22px; border-top: 1px solid #e2e8f0; background: #ffffff;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">ARG MVP · Facturacion electronica · Este mensaje fue generado automaticamente para el flujo de ventas.</p>
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
