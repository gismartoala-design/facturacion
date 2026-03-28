import { Prisma } from "@prisma/client";

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

export async function reserveDocumentNumber(
  tx: Prisma.TransactionClient,
  issuerId: string,
  documentType: "INVOICE",
): Promise<ReserveDocumentNumberResult> {
  // 1. Encontrar la serie documental activa
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
    throw new Error("No existe una serie documental activa para este emisor");
  }

  // 2. Calcular el mínimo número disponible
  const maxSequenceResult = await tx.saleDocument.aggregate({
    where: {
      documentSeriesId: documentSeries.id,
    },
    _max: {
      sequenceNumber: true,
    },
  });

  const minAvailableSequence = (maxSequenceResult._max.sequenceNumber ?? 0) + 1;

  // 3. Determinar el número de secuencia a usar
  const sequenceNumber = Math.max(documentSeries.nextSequence, minAvailableSequence);

  // 4. Actualizar nextSequence para la próxima reserva
  await tx.documentSeries.update({
    where: { id: documentSeries.id },
    data: {
      nextSequence: sequenceNumber + 1,
    },
  });

  // 5. Formatear y retornar
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
