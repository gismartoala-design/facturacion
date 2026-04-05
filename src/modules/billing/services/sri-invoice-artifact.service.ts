import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { buildSaleInvoicePdfBuffer } from "@/modules/billing/services/sale-invoice-pdf.service";

const logger = createLogger("SriInvoiceArtifact");
const SRI_BASE_URL = (process.env.SRI_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const AUTHORIZED_XML_FETCH_RETRIES = 4;
const AUTHORIZED_XML_FETCH_DELAY_MS = 750;

export type InvoiceEmailAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

type StoredSriArtifactPayload = {
  artifacts?: {
    xml?: string | null;
    xmlType?: string | null;
    authorizedXmlUrl?: string | null;
  } | null;
};

function buildBaseFilename(params: {
  documentNumber: string | null;
  secuencial: string | null;
  sriInvoiceId: string;
}) {
  return params.documentNumber ?? params.secuencial ?? `factura-${params.sriInvoiceId}`;
}

function parseStoredArtifactPayload(payload: unknown): StoredSriArtifactPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as StoredSriArtifactPayload;
}

async function downloadAuthorizedXmlBase64(url: string) {
  const resolvedUrl = url.startsWith("http") ? url : `${SRI_BASE_URL}${url}`;

  for (let attempt = 1; attempt <= AUTHORIZED_XML_FETCH_RETRIES; attempt += 1) {
    const response = await fetch(resolvedUrl, {
      headers: {
        Accept: "application/xml,text/xml,*/*",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const bytes = Buffer.from(await response.arrayBuffer());
      return bytes.toString("base64");
    }

    const isLastAttempt = attempt === AUTHORIZED_XML_FETCH_RETRIES;
    const shouldRetry = response.status === 404 && !isLastAttempt;

    if (!shouldRetry) {
      throw new Error(
        `No se pudo descargar XML autorizado: HTTP ${response.status}`,
      );
    }

    logger.warn("invoice:email:xml-retry", {
      url: resolvedUrl,
      attempt,
      nextDelayMs: AUTHORIZED_XML_FETCH_DELAY_MS,
    });

    await new Promise((resolve) =>
      setTimeout(resolve, AUTHORIZED_XML_FETCH_DELAY_MS),
    );
  }

  throw new Error("No se pudo descargar XML autorizado");
}

async function resolveAuthorizedXmlAttachment(params: {
  sriInvoiceId: string;
  documentNumber: string | null;
  secuencial: string | null;
  createResponsePayload: unknown;
  authorizeResponsePayload: unknown;
}) {
  const authorizePayload = parseStoredArtifactPayload(params.authorizeResponsePayload);
  const createPayload = parseStoredArtifactPayload(params.createResponsePayload);
  const preferredArtifacts =
    authorizePayload?.artifacts?.xmlType === "XML_AUTHORIZED"
      ? authorizePayload.artifacts
      : createPayload?.artifacts?.xmlType === "XML_AUTHORIZED"
        ? createPayload.artifacts
        : authorizePayload?.artifacts ?? createPayload?.artifacts ?? null;

  try {
    let contentBase64: string | null = null;

    if (
      preferredArtifacts?.xml &&
      preferredArtifacts.xmlType === "XML_AUTHORIZED"
    ) {
      contentBase64 = Buffer.from(preferredArtifacts.xml, "utf-8").toString("base64");
    } else if (preferredArtifacts?.authorizedXmlUrl) {
      contentBase64 = await downloadAuthorizedXmlBase64(
        preferredArtifacts.authorizedXmlUrl,
      );
    }

    if (!contentBase64) {
      logger.warn("invoice:email:xml-unavailable", {
        sriInvoiceId: params.sriInvoiceId,
      });
      return null;
    }

    return {
      filename: `${buildBaseFilename(params)}.xml`,
      contentType: "application/xml",
      contentBase64,
    } satisfies InvoiceEmailAttachment;
  } catch (error) {
    logger.warn("invoice:email:xml-failed", {
      sriInvoiceId: params.sriInvoiceId,
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return null;
  }
}

async function resolveLocalPdfAttachment(params: {
  sriInvoiceId: string;
  saleId: string;
  businessId: string;
  logoStorageKey: string | null;
  documentNumber: string | null;
  secuencial: string | null;
}) {
  try {
    const pdfBytes = await buildSaleInvoicePdfBuffer(
      params.saleId,
      params.businessId,
      params.logoStorageKey,
    );

    return {
      filename: `${buildBaseFilename(params)}.pdf`,
      contentType: "application/pdf",
      contentBase64: Buffer.from(pdfBytes).toString("base64"),
    } satisfies InvoiceEmailAttachment;
  } catch (error) {
    logger.warn("invoice:email:pdf-failed", {
      sriInvoiceId: params.sriInvoiceId,
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return null;
  }
}

export async function buildAuthorizedInvoiceEmailAttachments(
  sriInvoiceId: string,
) {
  const invoice = await prisma.sriInvoice.findUnique({
    where: { id: sriInvoiceId },
    select: {
      id: true,
      saleId: true,
      secuencial: true,
      createResponsePayload: true,
      authorizeResponsePayload: true,
    },
  });

  if (!invoice) {
    logger.warn("invoice:email:attachments-missing-invoice", { sriInvoiceId });
    return [];
  }

  const saleDocument = await prisma.saleDocument.findFirst({
    where: { sriInvoiceId },
    select: {
      fullNumber: true,
      issuerId: true,
    },
  });

  const issuer = saleDocument?.issuerId
    ? await prisma.documentIssuer.findUnique({
        where: { id: saleDocument.issuerId },
        select: {
          businessId: true,
          business: {
            select: {
              logoStorageKey: true,
            },
          },
        },
      })
    : null;

  const businessId = issuer?.businessId;
  if (!businessId) {
    logger.warn("invoice:email:attachments-missing-business", { sriInvoiceId });
    return [];
  }

  const [pdfAttachment, xmlAttachment] = await Promise.all([
    resolveLocalPdfAttachment({
      sriInvoiceId,
      saleId: invoice.saleId,
      businessId,
      logoStorageKey: issuer?.business.logoStorageKey ?? null,
      documentNumber: saleDocument?.fullNumber ?? null,
      secuencial: invoice.secuencial,
    }),
    resolveAuthorizedXmlAttachment({
      sriInvoiceId,
      documentNumber: saleDocument?.fullNumber ?? null,
      secuencial: invoice.secuencial,
      createResponsePayload: invoice.createResponsePayload,
      authorizeResponsePayload: invoice.authorizeResponsePayload,
    }),
  ]);

  const attachments = [pdfAttachment, xmlAttachment].filter(
    (attachment): attachment is InvoiceEmailAttachment => Boolean(attachment),
  );

  logger.info("invoice:email:attachments-prepared", {
    sriInvoiceId,
    count: attachments.length,
    filenames: attachments.map((attachment) => attachment.filename),
  });

  return attachments;
}
