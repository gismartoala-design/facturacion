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
  const series = await tx.documentSeries.findFirst({
    where: {
      issuerId,
      documentType,
      active: true,
    },
    orderBy: [{ establishmentCode: "asc" }, { emissionPointCode: "asc" }],
  });

  if (!series) {
    throw new Error("No existe una serie documental activa para este emisor");
  }

  const updatedSeries = await tx.documentSeries.update({
    where: { id: series.id },
    data: {
      nextSequence: {
        increment: 1,
      },
    },
  });

  const sequenceNumber = updatedSeries.nextSequence - 1;
  const formattedSequence = formatDocumentSequence(sequenceNumber);

  return {
    documentSeriesId: series.id,
    issuerId: series.issuerId,
    establishmentCode: series.establishmentCode,
    emissionPointCode: series.emissionPointCode,
    sequenceNumber,
    formattedSequence,
    fullNumber: buildDocumentFullNumber(
      series.establishmentCode,
      series.emissionPointCode,
      sequenceNumber,
    ),
  };
}
