-- Quality control (/admin/qc) was removed as unnecessary: drop its tables and
-- status enum. Shipments and print jobs no longer gate on QC records.
DROP TABLE "QcAttachment";
DROP TABLE "QcRecord";
DROP TYPE "QcStatus";
