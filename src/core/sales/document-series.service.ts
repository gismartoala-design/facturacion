import { createLogger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

const logger = createLogger("DocumentSeriesService");

type ReserveDocumentNumberResult = {
  documentSeriesId: string;
  issuerId: string;
  establishmentCode: string;
  emissionPointCode: string;
  sequenceNumber: number;
  formattedSequence: string;
  fullNumber: string;
};

export function formatDocumentSequence(sequenceNumber: number) {
  return String(sequenceNumber).padStart(9, "0").slice(-9);
}

export function buildDocumentFullNumber(
  establishmentCode: string,
  emissionPointCode: string,
  sequenceNumber: number,
) {
  return `${establishmentCode}-${emissionPointCode}-${formatDocumentSequence(
    sequenceNumber,
  )}`;
}

const MAX_RESERVATION_ATTEMPTS = 3;

export async function reserveDocumentNumber(
  tx: Prisma.TransactionClient,
  issuerId: string,
  documentType: "INVOICE",
): Promise<ReserveDocumentNumberResult> {
  for (let attempt = 1; attempt <= MAX_RESERVATION_ATTEMPTS; attempt += 1) {
    const documentSeries = await tx.documentSeries.findFirst({
      where: {
        issuerId,
        documentType,
        active: true,
      },
      orderBy: [
        { establishmentCode: "asc" },
        { emissionPointCode: "asc" },
      ],
      select: {
        id: true,
        issuerId: true,
        establishmentCode: true,
        emissionPointCode: true,
        nextSequence: true,
      },
    });

    if (!documentSeries) {
      throw new Error(
        "No existe una serie documental activa para este emisor",
      );
    }

    logger.info("Intentando reservar número de documento", {
      attempt,
      maxAttempts: MAX_RESERVATION_ATTEMPTS,
      documentSeriesId: documentSeries.id,
      issuerId,
      documentType,
      currentNextSequence: documentSeries.nextSequence,
    });

    const sequenceNumber = documentSeries.nextSequence;

    const updateResult = await tx.documentSeries.updateMany({
      where: {
        id: documentSeries.id,
        nextSequence: sequenceNumber,
      },
      data: {
        nextSequence: {
          increment: 1,
        },
      },
    });

    if (updateResult.count === 0) {
      logger.warn("Conflicto al reservar secuencia documental, reintentando", {
        attempt,
        maxAttempts: MAX_RESERVATION_ATTEMPTS,
        documentSeriesId: documentSeries.id,
        issuerId,
        documentType,
        expectedSequence: sequenceNumber,
      });
      continue;
    }

    const formattedSequence = formatDocumentSequence(sequenceNumber);

    return {
      documentSeriesId: documentSeries.id,
      issuerId: documentSeries.issuerId,
      establishmentCode: documentSeries.establishmentCode,
      emissionPointCode: documentSeries.emissionPointCode,
      sequenceNumber,
      formattedSequence,
      fullNumber: buildDocumentFullNumber(
        documentSeries.establishmentCode,
        documentSeries.emissionPointCode,
        sequenceNumber,
      ),
    };
  }

  throw new Error(
    "No se pudo reservar una secuencia documental después de varios intentos. Intenta nuevamente.",
  );
}
