-- This migration came from a generated index rename, but in the canonical
-- migration history `DocumentSeries` is created later. On fresh databases the
-- old index never exists, so the rename must be conditional.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'i'
      AND relname = 'DocumentSeries_issuerId_documentType_establishmentCode_emission'
  ) THEN
    ALTER INDEX "DocumentSeries_issuerId_documentType_establishmentCode_emission"
      RENAME TO "DocumentSeries_issuerId_documentType_establishmentCode_emis_key";
  END IF;
END $$;
