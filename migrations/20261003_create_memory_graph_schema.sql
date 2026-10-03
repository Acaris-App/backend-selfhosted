BEGIN;

-- ==============================================================================
-- Acaris Memory Graph Schema (Relational & Hierarchical Knowledge Graph)
-- Extends pgvector semantic search with structured relational & temporal memory.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS acaris_graph_entities (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  canonical_id VARCHAR(150) UNIQUE,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_entity_type CHECK (
    entity_type IN (
      'mahasiswa', 'dosen', 'skripsi', 'bab', 'revisi', 
      'mata_kuliah', 'konsentrasi', 'topik_riset', 'catatan_akademik', 'konsep'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_entities_type 
  ON acaris_graph_entities (entity_type);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_entities_canonical 
  ON acaris_graph_entities (canonical_id);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_entities_name 
  ON acaris_graph_entities (name);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_entities_properties 
  ON acaris_graph_entities USING GIN (properties);

-- ==============================================================================
-- Graph Relations (Edges)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS acaris_graph_relations (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES acaris_graph_entities(id) ON DELETE CASCADE,
  relation_type VARCHAR(100) NOT NULL,
  target_id BIGINT NOT NULL REFERENCES acaris_graph_entities(id) ON DELETE CASCADE,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_acaris_graph_relation UNIQUE (source_id, relation_type, target_id),
  CONSTRAINT chk_relation_no_self_loop CHECK (source_id <> target_id)
);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_relations_source 
  ON acaris_graph_relations (source_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_relations_target 
  ON acaris_graph_relations (target_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_relations_type 
  ON acaris_graph_relations (relation_type);

-- ==============================================================================
-- Graph Observations (Temporal Knowledge & Activity Logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS acaris_graph_observations (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL REFERENCES acaris_graph_entities(id) ON DELETE CASCADE,
  observation TEXT NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'chatbot',
  source_ref_id VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_observation_source CHECK (
    source IN ('chatbot', 'bimbingan', 'dokumen', 'akademik', 'manual', 'sync')
  )
);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_observations_entity 
  ON acaris_graph_observations (entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_acaris_graph_observations_source 
  ON acaris_graph_observations (source, source_ref_id);

COMMIT;
