BEGIN;

SET LOCAL search_path = public, pg_catalog;

ALTER TABLE pengambilan_mata_kuliah
  DROP CONSTRAINT IF EXISTS pengambilan_mata_kuliah_source_document_id_fkey,
  ADD CONSTRAINT pengambilan_mata_kuliah_source_document_id_fkey
    FOREIGN KEY (source_document_id) REFERENCES dokumen_mahasiswa(id) ON DELETE CASCADE;

ALTER TABLE academic_imports
  DROP CONSTRAINT IF EXISTS academic_imports_source_document_id_fkey,
  ADD CONSTRAINT academic_imports_source_document_id_fkey
    FOREIGN KEY (source_document_id) REFERENCES dokumen_mahasiswa(id) ON DELETE CASCADE;

COMMIT;
