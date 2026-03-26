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
  const reservedSeriesRows = await tx.$queryRaw<
    Array<{
      id: string;
      issuer_id: string;
      establishment_code: string;
      emission_point_code: string;
      sequence_number: number;
    }>
  >`
    UPDATE "DocumentSeries"
    SET "nextSequence" = "nextSequence" + 1
    WHERE id = (
      SELECT id
      FROM "DocumentSeries"
      WHERE "issuerId" = ${issuerId}
        AND "documentType" = ${documentType}
        AND active = true
      ORDER BY "establishmentCode" ASC, "emissionPointCode" ASC
      LIMIT 1
      FOR UPDATE
    )
    RETURNING
      id,
      "issuerId" AS issuer_id,
      "establishmentCode" AS establishment_code,
      "emissionPointCode" AS emission_point_code,
      "nextSequence" - 1 AS sequence_number
  `;

  const reservedSeries = reservedSeriesRows[0];

  if (!reservedSeries) {
    throw new Error("No existe una serie documental activa para este emisor");
  }

  const sequenceNumber = reservedSeries.sequence_number;
  const formattedSequence = formatDocumentSequence(sequenceNumber);

  return {
    documentSeriesId: reservedSeries.id,
    issuerId: reservedSeries.issuer_id,
    establishmentCode: reservedSeries.establishment_code,
    emissionPointCode: reservedSeries.emission_point_code,
    sequenceNumber,
    formattedSequence,
    fullNumber: buildDocumentFullNumber(
      reservedSeries.establishment_code,
      reservedSeries.emission_point_code,
      sequenceNumber,
    ),
  };
}
