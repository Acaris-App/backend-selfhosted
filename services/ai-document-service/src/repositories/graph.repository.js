const pool = require('../config/db');

class GraphRepository {
  /**
   * Upsert entity (insert or update based on canonical_id if present)
   */
  async upsertEntity({ entity_type, name, canonical_id = null, properties = {} }) {
    if (canonical_id) {
      const query = `
        INSERT INTO acaris_graph_entities (entity_type, name, canonical_id, properties, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (canonical_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          entity_type = EXCLUDED.entity_type,
          properties = acaris_graph_entities.properties || EXCLUDED.properties,
          updated_at = NOW()
        RETURNING *;
      `;
      const res = await pool.query(query, [entity_type, name, canonical_id, JSON.stringify(properties)]);
      return res.rows[0];
    } else {
      const query = `
        INSERT INTO acaris_graph_entities (entity_type, name, properties, updated_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *;
      `;
      const res = await pool.query(query, [entity_type, name, JSON.stringify(properties)]);
      return res.rows[0];
    }
  }

  /**
   * Find entity by canonical ID
   */
  async findEntityByCanonical(canonical_id) {
    const query = 'SELECT * FROM acaris_graph_entities WHERE canonical_id = $1 LIMIT 1;';
    const res = await pool.query(query, [canonical_id]);
    return res.rows[0] || null;
  }

  /**
   * Find entity by ID
   */
  async findEntityById(id) {
    const query = 'SELECT * FROM acaris_graph_entities WHERE id = $1 LIMIT 1;';
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Find multiple entities with optional filter
   */
  async findEntities({ entity_type, search, limit = 200, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (entity_type) {
      conditions.push(`entity_type = $${idx++}`);
      params.push(entity_type);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR canonical_id ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);
    const limitClause = `LIMIT $${idx++}`;
    params.push(offset);
    const offsetClause = `OFFSET $${idx++}`;

    const query = `
      SELECT * FROM acaris_graph_entities
      ${whereClause}
      ORDER BY id ASC
      ${limitClause} ${offsetClause};
    `;
    const res = await pool.query(query, params);
    return res.rows;
  }

  /**
   * Upsert relation between two entities
   */
  async upsertRelation({ source_id, relation_type, target_id, weight = 1.0, properties = {} }) {
    if (source_id === target_id) {
      throw new Error('Self-loop relations are not permitted in Acaris Memory Graph');
    }
    const query = `
      INSERT INTO acaris_graph_relations (source_id, relation_type, target_id, weight, properties, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (source_id, relation_type, target_id)
      DO UPDATE SET
        weight = EXCLUDED.weight,
        properties = acaris_graph_relations.properties || EXCLUDED.properties,
        updated_at = NOW()
      RETURNING *;
    `;
    const res = await pool.query(query, [source_id, relation_type, target_id, weight, JSON.stringify(properties)]);
    return res.rows[0];
  }

  /**
   * Add observation to an entity
   */
  async addObservation({ entity_id, observation, source = 'chatbot', source_ref_id = null }) {
    const query = `
      INSERT INTO acaris_graph_observations (entity_id, observation, source, source_ref_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const res = await pool.query(query, [entity_id, observation, source, source_ref_id]);
    return res.rows[0];
  }

  /**
   * Get all observations for an entity
   */
  async getObservationsByEntity(entity_id, limit = 20) {
    const query = `
      SELECT * FROM acaris_graph_observations
      WHERE entity_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const res = await pool.query(query, [entity_id, limit]);
    return res.rows;
  }

  /**
   * Get Full Graph for Visualizer
   */
  async getFullGraph({ limit = 300, entity_type = null } = {}) {
    const entityConditions = [];
    const params = [];
    if (entity_type) {
      entityConditions.push('entity_type = $1');
      params.push(entity_type);
    }
    const whereEntity = entityConditions.length > 0 ? `WHERE ${entityConditions.join(' AND ')}` : '';
    params.push(limit);

    // Nodes
    const nodesQuery = `
      SELECT 
        e.id, 
        e.entity_type, 
        e.name, 
        e.canonical_id, 
        e.properties, 
        e.created_at,
        COUNT(DISTINCT o.id)::int AS observation_count
      FROM acaris_graph_entities e
      LEFT JOIN acaris_graph_observations o ON o.entity_id = e.id
      ${whereEntity}
      GROUP BY e.id
      ORDER BY e.id ASC
      LIMIT $${params.length};
    `;
    const nodesRes = await pool.query(nodesQuery, params);
    const nodes = nodesRes.rows;

    if (nodes.length === 0) {
      return { nodes: [], edges: [], statistics: { total_nodes: 0, total_edges: 0, total_observations: 0 } };
    }

    const nodeIds = nodes.map(n => n.id);

    // Edges connected to retrieved nodes
    const edgesQuery = `
      SELECT 
        r.id,
        r.source_id,
        r.relation_type,
        r.target_id,
        r.weight,
        r.properties,
        s.name AS source_name,
        t.name AS target_name
      FROM acaris_graph_relations r
      JOIN acaris_graph_entities s ON s.id = r.source_id
      JOIN acaris_graph_entities t ON t.id = r.target_id
      WHERE r.source_id = ANY($1::bigint[]) AND r.target_id = ANY($1::bigint[])
      ORDER BY r.id ASC;
    `;
    const edgesRes = await pool.query(edgesQuery, [nodeIds]);
    const edges = edgesRes.rows;

    // Overall stats
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM acaris_graph_entities) AS total_nodes,
        (SELECT COUNT(*) FROM acaris_graph_relations) AS total_edges,
        (SELECT COUNT(*) FROM acaris_graph_observations) AS total_observations;
    `;
    const statsRes = await pool.query(statsQuery);
    const stats = statsRes.rows[0];

    return {
      nodes,
      edges,
      statistics: {
        total_nodes: parseInt(stats.total_nodes, 10),
        total_edges: parseInt(stats.total_edges, 10),
        total_observations: parseInt(stats.total_observations, 10)
      }
    };
  }

  /**
   * Get Student-Centric Subgraph (Mahasiswa, Dosen, Skripsi, Bab, Revisi, Matkul)
   */
  async getStudentSubgraph(npm) {
    const studentCanonical = `mhs:${npm}`;
    const student = await this.findEntityByCanonical(studentCanonical);
    if (!student) return null;

    // 1-hop and 2-hop connected nodes
    const query = `
      WITH RECURSIVE graph_traverse AS (
        SELECT id, 0 AS depth
        FROM acaris_graph_entities
        WHERE id = $1

        UNION

        SELECT 
          CASE 
            WHEN r.source_id = gt.id THEN r.target_id 
            ELSE r.source_id 
          END AS id,
          gt.depth + 1 AS depth
        FROM acaris_graph_relations r
        JOIN graph_traverse gt ON r.source_id = gt.id OR r.target_id = gt.id
        WHERE gt.depth < 2
      )
      SELECT DISTINCT e.id, e.entity_type, e.name, e.canonical_id, e.properties
      FROM graph_traverse gt
      JOIN acaris_graph_entities e ON e.id = gt.id;
    `;
    const nodesRes = await pool.query(query, [student.id]);
    const nodes = nodesRes.rows;
    const nodeIds = nodes.map(n => n.id);

    // Edges among these nodes
    const edgesRes = await pool.query(`
      SELECT 
        r.id, r.source_id, r.relation_type, r.target_id, r.weight, r.properties,
        s.name AS source_name, t.name AS target_name
      FROM acaris_graph_relations r
      JOIN acaris_graph_entities s ON s.id = r.source_id
      JOIN acaris_graph_entities t ON t.id = r.target_id
      WHERE r.source_id = ANY($1::bigint[]) AND r.target_id = ANY($1::bigint[]);
    `, [nodeIds]);

    // Observations for connected entities
    const obsRes = await pool.query(`
      SELECT o.id, o.entity_id, e.name AS entity_name, e.entity_type, o.observation, o.source, o.created_at
      FROM acaris_graph_observations o
      JOIN acaris_graph_entities e ON e.id = o.entity_id
      WHERE o.entity_id = ANY($1::bigint[])
      ORDER BY o.created_at DESC
      LIMIT 50;
    `, [nodeIds]);

    return {
      student,
      nodes,
      edges: edgesRes.rows,
      observations: obsRes.rows
    };
  }

  /**
   * Delete entity by ID
   */
  async deleteEntity(id) {
    const res = await pool.query('DELETE FROM acaris_graph_entities WHERE id = $1 RETURNING *;', [id]);
    return res.rows[0] || null;
  }
}

module.exports = new GraphRepository();
