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
    WITH selected_series AS (
      SELECT id
      FROM "DocumentSeries"
      WHERE "issuerId" = ${issuerId}::uuid
        AND "documentType" = ${documentType}::"DocumentSeriesType"
        AND active = true
      ORDER BY "establishmentCode" ASC, "emissionPointCode" ASC
      LIMIT 1
      FOR UPDATE
    ),
    series_state AS (
      SELECT
        ds.id,
        ds."issuerId",
        ds."establishmentCode",
        ds."emissionPointCode",
        ds."nextSequence",
        COALESCE(MAX(sd."sequenceNumber"), 0) + 1 AS min_available_sequence
      FROM "DocumentSeries" ds
      JOIN selected_series ss ON ss.id = ds.id
      LEFT JOIN "SaleDocument" sd ON sd."documentSeriesId" = ds.id
      GROUP BY
        ds.id,
        ds."issuerId",
        ds."establishmentCode",
        ds."emissionPointCode",
        ds."nextSequence"
    )
    UPDATE "DocumentSeries" ds
    SET "nextSequence" =
      GREATEST(series_state."nextSequence", series_state.min_available_sequence) + 2
    FROM series_state
    WHERE ds.id = series_state.id
    RETURNING
      ds.id,
      ds."issuerId" AS issuer_id,
      ds."establishmentCode" AS establishment_code,
      ds."emissionPointCode" AS emission_point_code,
      GREATEST(series_state."nextSequence", series_state.min_available_sequence) AS sequence_number
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
