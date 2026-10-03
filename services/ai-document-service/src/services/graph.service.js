const pool = require('../config/db');
const graphRepository = require('../repositories/graph.repository');

class GraphService {
  /**
   * Add or update an entity directly
   */
  async upsertEntity({ entity_type, name, canonical_id, properties = {} }) {
    if (!entity_type || !name) {
      throw { status: 400, message: 'entity_type dan name wajib diisi' };
    }
    return await graphRepository.upsertEntity({
      entity_type,
      name,
      canonical_id: canonical_id || null,
      properties
    });
  }

  /**
   * Add or update a relation directly
   */
  async upsertRelation({ source_id, relation_type, target_id, weight = 1.0, properties = {} }) {
    if (!source_id || !relation_type || !target_id) {
      throw { status: 400, message: 'source_id, relation_type, dan target_id wajib diisi' };
    }
    return await graphRepository.upsertRelation({
      source_id,
      relation_type,
      target_id,
      weight,
      properties
    });
  }

  /**
   * Add an observation to an entity
   */
  async addObservation({ entity_id, observation, source = 'manual', source_ref_id = null }) {
    if (!entity_id || !observation) {
      throw { status: 400, message: 'entity_id dan observation wajib diisi' };
    }
    return await graphRepository.addObservation({
      entity_id,
      observation,
      source,
      source_ref_id
    });
  }

  /**
   * Automatically synchronize a student's full relational data into Memory Graph
   */
  async syncStudentAcademicData(npm) {
    if (!npm) throw { status: 400, message: 'NPM wajib diisi' };

    // 1. Fetch student & user details
    const studentQuery = `
      SELECT 
        u.id AS user_id, u.name, u.email, u.npm_nip,
        m.angkatan, m.ipk, m.current_semester, m.konsentrasi,
        d.id AS dosen_id, d.name AS dosen_name, d.npm_nip AS dosen_nip,
        dp.kode_kelas
      FROM users u
      JOIN mahasiswa m ON m.user_id = u.id
      LEFT JOIN users d ON d.id = m.dosen_pa_id
      LEFT JOIN dosen_pa dp ON dp.user_id = d.id
      WHERE u.npm_nip = $1;
    `;
    const studentRes = await pool.query(studentQuery, [npm]);
    if (studentRes.rows.length === 0) {
      throw { status: 404, message: `Mahasiswa dengan NPM ${npm} tidak ditemukan` };
    }

    const row = studentRes.rows[0];

    // 2. Upsert Mahasiswa Entity
    const mhsEntity = await graphRepository.upsertEntity({
      entity_type: 'mahasiswa',
      name: row.name,
      canonical_id: `mhs:${row.npm_nip}`,
      properties: {
        npm: row.npm_nip,
        email: row.email,
        angkatan: row.angkatan,
        ipk: row.ipk ? parseFloat(row.ipk) : null,
        current_semester: row.current_semester,
        konsentrasi: row.konsentrasi
      }
    });

    // Add baseline observation
    await graphRepository.addObservation({
      entity_id: mhsEntity.id,
      observation: `Mahasiswa aktif angkatan ${row.angkatan || '-'}, semester ${row.current_semester || '-'}, IPK: ${row.ipk || '0.00'}.`,
      source: 'sync',
      source_ref_id: `sync:${npm}`
    });

    // 3. Upsert Konsentrasi Entity & Relation
    if (row.konsentrasi) {
      const konsentrasiEntity = await graphRepository.upsertEntity({
        entity_type: 'konsentrasi',
        name: `Konsentrasi ${row.konsentrasi}`,
        canonical_id: `konsentrasi:${row.konsentrasi.toLowerCase().replace(/\s+/g, '_')}`,
        properties: { bidang: row.konsentrasi }
      });

      await graphRepository.upsertRelation({
        source_id: mhsEntity.id,
        relation_type: 'MENGAMBIL_KONSENTRASI',
        target_id: konsentrasiEntity.id,
        weight: 1.0
      });
    }

    // 4. Upsert Dosen PA Entity & Relation
    if (row.dosen_id && row.dosen_name) {
      const dosenEntity = await graphRepository.upsertEntity({
        entity_type: 'dosen',
        name: row.dosen_name,
        canonical_id: `dsn:${row.dosen_nip || row.dosen_id}`,
        properties: {
          nip: row.dosen_nip,
          kode_kelas: row.kode_kelas,
          role: 'Dosen Pembimbing Akademik'
        }
      });

      await graphRepository.upsertRelation({
        source_id: mhsEntity.id,
        relation_type: 'DIBIMBING_OLEH',
        target_id: dosenEntity.id,
        weight: 1.0,
        properties: { peran: 'Dosen PA', kode_kelas: row.kode_kelas }
      });
    }

    // 5. Sync Bimbingan Bookings & Consultation Notes
    const bookingsQuery = `
      SELECT bb.id, bb.catatan, bb.keterangan, bb.status, jb.tanggal, jb.waktu_mulai, u.name AS dosen_name
      FROM booking_bimbingan bb
      JOIN jadwal_bimbingan jb ON jb.id = bb.jadwal_id
      JOIN users u ON u.id = jb.dosen_id
      WHERE bb.mahasiswa_id = $1
      ORDER BY jb.tanggal DESC, jb.waktu_mulai DESC
      LIMIT 10;
    `;
    const bookingsRes = await pool.query(bookingsQuery, [row.user_id]);
    for (const b of bookingsRes.rows) {
      if (b.catatan || b.keterangan) {
        const revisiEntity = await graphRepository.upsertEntity({
          entity_type: 'catatan_akademik',
          name: `Catatan Bimbingan ${b.tanggal.toISOString().slice(0, 10)}`,
          canonical_id: `bimbingan:${b.id}`,
          properties: {
            tanggal: b.tanggal.toISOString().slice(0, 10),
            status: b.status,
            dosen: b.dosen_name,
            keterangan: b.keterangan
          }
        });

        await graphRepository.upsertRelation({
          source_id: mhsEntity.id,
          relation_type: 'MEMILIKI_CATATAN',
          target_id: revisiEntity.id,
          weight: 0.9
        });

        if (b.catatan) {
          await graphRepository.addObservation({
            entity_id: revisiEntity.id,
            observation: `Catatan bimbingan: "${b.catatan}". Status: ${b.status}.`,
            source: 'bimbingan',
            source_ref_id: `booking:${b.id}`
          });
        }
      }
    }

    // 6. Sync Uploaded Documents
    const docsQuery = `
      SELECT id, document_type, semester, uploaded_at
      FROM dokumen_mahasiswa
      WHERE user_id = $1
      ORDER BY semester ASC;
    `;
    const docsRes = await pool.query(docsQuery, [row.user_id]);
    for (const doc of docsRes.rows) {
      const docEntity = await graphRepository.upsertEntity({
        entity_type: 'konsep',
        name: `Dokumen ${doc.document_type.toUpperCase()} Semester ${doc.semester || 'All'}`,
        canonical_id: `dokumen:${doc.id}`,
        properties: {
          tipe: doc.document_type,
          semester: doc.semester,
          uploaded_at: doc.uploaded_at
        }
      });

      await graphRepository.upsertRelation({
        source_id: mhsEntity.id,
        relation_type: 'MENGUNGGAH',
        target_id: docEntity.id,
        weight: 0.8
      });
    }

    return await graphRepository.getStudentSubgraph(npm);
  }

  /**
   * Sync all lecturers and students to initialize the graph
   */
  async syncAllRelationalData() {
    // 1. Sync all lecturers
    const dosenQuery = `
      SELECT u.id, u.name, u.email, u.npm_nip, dp.kode_kelas
      FROM users u
      LEFT JOIN dosen_pa dp ON dp.user_id = u.id
      WHERE u.role = 'dosen';
    `;
    const dosenRes = await pool.query(dosenQuery);
    let syncedDosen = 0;
    for (const d of dosenRes.rows) {
      await graphRepository.upsertEntity({
        entity_type: 'dosen',
        name: d.name,
        canonical_id: `dsn:${d.npm_nip || d.id}`,
        properties: {
          nip: d.npm_nip,
          email: d.email,
          kode_kelas: d.kode_kelas,
          role: 'Dosen Pembimbing'
        }
      });
      syncedDosen++;
    }

    // 2. Sync all students with NPM
    const mhsQuery = `
      SELECT npm_nip FROM users WHERE role = 'mahasiswa' AND npm_nip IS NOT NULL;
    `;
    const mhsRes = await pool.query(mhsQuery);
    let syncedMhs = 0;
    for (const m of mhsRes.rows) {
      try {
        await this.syncStudentAcademicData(m.npm_nip);
        syncedMhs++;
      } catch (err) {
        console.warn(`[GraphSync] Failed to sync ${m.npm_nip}:`, err.message);
      }
    }

    const stats = await graphRepository.getFullGraph({ limit: 1 });
    return {
      message: 'Sinkronisasi Memory Graph berhasil!',
      synced_dosen: syncedDosen,
      synced_mahasiswa: syncedMhs,
      statistics: stats.statistics
    };
  }

  /**
   * Record Chatbot Conversation Observation
   */
  async recordChatObservation({ npm, message, reply, sessionId }) {
    if (!npm) return;
    const student = await graphRepository.findEntityByCanonical(`mhs:${npm}`);
    if (!student) return;

    // Log key intent observation
    const cleanMessage = String(message || '').trim().slice(0, 150);
    const cleanReply = String(reply || '').trim().slice(0, 150);
    const observationText = `Chatbot Aca - Tanya: "${cleanMessage}" | Saran: "${cleanReply}"`;

    await graphRepository.addObservation({
      entity_id: student.id,
      observation: observationText,
      source: 'chatbot',
      source_ref_id: sessionId || null
    });
  }

  /**
   * Get formatted context string for Chatbot prompt injection
   */
  async getEnrichedStudentContext(npm) {
    if (!npm) return '';
    try {
      const subGraph = await graphRepository.getStudentSubgraph(npm);
      if (!subGraph || !subGraph.student) return '';

      const lines = [];
      const s = subGraph.student;
      const p = s.properties || {};
      lines.push(`[MEMORY GRAPH MAHASISWA]`);
      lines.push(`- Nama: ${s.name} (NPM: ${p.npm || npm})`);
      if (p.angkatan) lines.push(`- Angkatan: ${p.angkatan} | Semester: ${p.current_semester || '-'} | IPK: ${p.ipk || '-'}`);
      if (p.konsentrasi) lines.push(`- Konsentrasi: ${p.konsentrasi}`);

      // Connected nodes
      const dosenNodes = subGraph.nodes.filter(n => n.entity_type === 'dosen');
      if (dosenNodes.length > 0) {
        lines.push(`- Dosen Pembimbing: ${dosenNodes.map(d => d.name).join(', ')}`);
      }

      const skripsiNodes = subGraph.nodes.filter(n => n.entity_type === 'skripsi');
      if (skripsiNodes.length > 0) {
        lines.push(`- Judul Skripsi/Riset: "${skripsiNodes[0].name}"`);
      }

      const babNodes = subGraph.nodes.filter(n => n.entity_type === 'bab');
      if (babNodes.length > 0) {
        lines.push(`- Bab Skripsi Terdaftar: ${babNodes.map(b => b.name).join(', ')}`);
      }

      const revisiNodes = subGraph.nodes.filter(n => n.entity_type === 'revisi' || n.entity_type === 'catatan_akademik');
      if (revisiNodes.length > 0) {
        lines.push(`- Catatan Bimbingan & Revisi: ${revisiNodes.slice(0, 3).map(r => r.name).join('; ')}`);
      }

      // Recent observations
      if (subGraph.observations && subGraph.observations.length > 0) {
        lines.push(`- Riwayat Observasi Akademik Terkini:`);
        for (const obs of subGraph.observations.slice(0, 5)) {
          lines.push(`  * [${obs.source}] ${obs.observation}`);
        }
      }

      return lines.join('\n');
    } catch (err) {
      console.warn('[GraphContext] Failed to get enriched context:', err.message);
      return '';
    }
  }

  /**
   * Get Graph Data for API / Visualizer
   */
  async getGraphData({ npm = null, entity_type = null, limit = 300 } = {}) {
    if (npm) {
      const subGraph = await graphRepository.getStudentSubgraph(npm);
      if (!subGraph) {
        throw { status: 404, message: `Memory graph untuk mahasiswa NPM ${npm} belum tersedia.` };
      }
      return {
        nodes: subGraph.nodes,
        edges: subGraph.edges,
        observations: subGraph.observations,
        statistics: {
          total_nodes: subGraph.nodes.length,
          total_edges: subGraph.edges.length,
          total_observations: subGraph.observations.length
        }
      };
    }

    return await graphRepository.getFullGraph({ limit, entity_type });
  }

  /**
   * Get single node details
   */
  async getNodeDetails(id) {
    const node = await graphRepository.findEntityById(id);
    if (!node) throw { status: 404, message: 'Node entitas tidak ditemukan' };
    const observations = await graphRepository.getObservationsByEntity(id, 50);

    // Get connected relations
    const relationsQuery = `
      SELECT r.id, r.relation_type, r.weight, r.properties,
        s.id AS source_id, s.name AS source_name, s.entity_type AS source_type,
        t.id AS target_id, t.name AS target_name, t.entity_type AS target_type
      FROM acaris_graph_relations r
      JOIN acaris_graph_entities s ON s.id = r.source_id
      JOIN acaris_graph_entities t ON t.id = r.target_id
      WHERE r.source_id = $1 OR r.target_id = $1;
    `;
    const relationsRes = await pool.query(relationsQuery, [id]);

    return {
      node,
      observations,
      relations: relationsRes.rows
    };
  }
}

module.exports = new GraphService();
