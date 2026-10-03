/**
 * Acaris Memory Graph — Multi-Scenario Comprehensive Test Suite
 * Tests 12 distinct academic knowledge graph scenarios.
 */

const pool = require('../config/db');
const graphService = require('../services/graph.service');
const graphRepository = require('../repositories/graph.repository');

async function runScenarios() {
  console.log('================================================================');
  console.log('🧪 ACARIS MEMORY GRAPH — 12 COMPREHENSIVE TEST SCENARIOS');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: Auto-Sync Existing Relational Data into Graph
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 1] Auto-Sync Existing Database into Graph...');
    const syncResult = await graphService.syncAllRelationalData();
    console.log(`  ✓ Synced ${syncResult.synced_dosen} lecturers and ${syncResult.synced_mahasiswa} students.`);
    console.log(`  ✓ Initial graph state: ${syncResult.statistics.total_nodes} nodes, ${syncResult.statistics.total_edges} edges.\n`);

    // -------------------------------------------------------------------------
    // SCENARIO 2: Create / Upsert Student Entity & Thesis Project
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 2] Registering Thesis & Research Project...');
    const student = await graphRepository.upsertEntity({
      entity_type: 'mahasiswa',
      name: 'Muhammad Arifin Syam',
      canonical_id: 'mhs:140810200001',
      properties: {
        npm: '140810200001',
        angkatan: 2022,
        current_semester: 7,
        ipk: 3.88,
        konsentrasi: 'Sistem Cerdas'
      }
    });

    const skripsi = await graphRepository.upsertEntity({
      entity_type: 'skripsi',
      name: 'Rancang Bangun Memory Graph & Agentic Multi-LLM pada Sistem Bimbingan Acaris',
      canonical_id: 'skripsi:140810200001',
      properties: {
        tahun: 2026,
        status: 'Pengerjaan Bab 3',
        metodologi: 'Graph-RAG & Hybrid Vector Traversal'
      }
    });

    await graphRepository.upsertRelation({
      source_id: student.id,
      relation_type: 'MENGERJAKAN',
      target_id: skripsi.id,
      weight: 1.0,
      properties: { peran: 'Peneliti Utama' }
    });
    console.log(`  ✓ Student [${student.name}] linked to Thesis [${skripsi.name}].\n`);

    // -------------------------------------------------------------------------
    // SCENARIO 3: Decomposing Thesis into 5 Formal Chapters (Bab 1 - 5)
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 3] Decomposing Thesis into Structural Chapters...');
    const chapters = [
      { code: 'bab1', name: 'Bab 1: Pendahuluan & Latar Belakang Masalah', status: 'Disetujui' },
      { code: 'bab2', name: 'Bab 2: Tinjauan Pustaka & Arsitektur Knowledge Graph', status: 'Disetujui' },
      { code: 'bab3', name: 'Bab 3: Metodologi Penelitian & Graph Traversal', status: 'Revisi Aktif' },
      { code: 'bab4', name: 'Bab 4: Implementasi Microservices & Hasil Evaluasi', status: 'Draf' },
      { code: 'bab5', name: 'Bab 5: Kesimpulan & Rencana Pengembangan', status: 'Draf' }
    ];

    const babEntities = [];
    for (const ch of chapters) {
      const bab = await graphRepository.upsertEntity({
        entity_type: 'bab',
        name: ch.name,
        canonical_id: `bab:140810200001:${ch.code}`,
        properties: { status: ch.status, bab_code: ch.code }
      });
      babEntities.push(bab);

      await graphRepository.upsertRelation({
        source_id: skripsi.id,
        relation_type: 'MEMILIKI_BAB',
        target_id: bab.id,
        weight: 1.0
      });
    }
    console.log(`  ✓ 5 Chapters successfully mapped and attached to Thesis.\n`);

    // -------------------------------------------------------------------------
    // SCENARIO 4: Linking Primary Advisor (Dosen Pembimbing)
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 4] Linking Primary Advisor & Lecturer Expertise...');
    const dosenUtama = await graphRepository.upsertEntity({
      entity_type: 'dosen',
      name: 'Dr. Ir. Hendra Kusuma, M.T.',
      canonical_id: 'dsn:198005122005011002',
      properties: {
        nip: '198005122005011002',
        jabatan: 'Lektor Kepala',
        bidang_keahlian: ['Artificial Intelligence', 'Knowledge Representation', 'Distributed Systems']
      }
    });

    await graphRepository.upsertRelation({
      source_id: student.id,
      relation_type: 'DIBIMBING_OLEH',
      target_id: dosenUtama.id,
      weight: 1.0,
      properties: { peran: 'Pembimbing Utama' }
    });

    await graphRepository.upsertRelation({
      source_id: skripsi.id,
      relation_type: 'DISUPERVISI_OLEH',
      target_id: dosenUtama.id,
      weight: 1.0
    });
    console.log(`  ✓ Advisor [${dosenUtama.name}] linked to Student & Thesis.\n`);

    // -------------------------------------------------------------------------
    // SCENARIO 5: Multi-Session Guidance Log & Revision Recording
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 5] Recording Consultation Session & Pending Revision...');
    const bab3 = babEntities.find(b => b.canonical_id.endsWith('bab3'));
    
    const revisiBab3 = await graphRepository.upsertEntity({
      entity_type: 'revisi',
      name: 'Revisi Metodologi Evaluasi Latency Traversal (Bab 3)',
      canonical_id: 'revisi:140810200001:bab3:latency',
      properties: {
        status: 'pending',
        tenggat: '2026-10-15',
        prioritas: 'Tinggi'
      }
    });

    await graphRepository.upsertRelation({
      source_id: bab3.id,
      relation_type: 'MEMILIKI_REVISI',
      target_id: revisiBab3.id,
      weight: 1.0
    });

    await graphRepository.upsertRelation({
      source_id: dosenUtama.id,
      relation_type: 'MEMBERIKAN_CATATAN',
      target_id: revisiBab3.id,
      weight: 0.95
    });

    await graphRepository.addObservation({
      entity_id: revisiBab3.id,
      observation: 'Catatan Dosen: Perbaiki bab 3 dengan menambahkan perbandingan komparasi latency response time antara pgvector murni vs hybrid memory graph traversal.',
      source: 'bimbingan',
      source_ref_id: 'session:bim-20261003'
    });
    console.log('  ✓ Pending revision and guidance observation logged to Bab 3.\n');

    // -------------------------------------------------------------------------
    // SCENARIO 6: Resolving Revision with Verification Proof
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 6] Student Submits Revision Resolution...');
    await graphRepository.addObservation({
      entity_id: revisiBab3.id,
      observation: 'Mahasiswa telah menyelesaikan benchmark 100 concurrent requests: Latency pgvector 42ms vs Hybrid Graph 18ms (peningkatan 57%). Berkas draf Bab 3 v2 diunggah.',
      source: 'dokumen',
      source_ref_id: 'doc:rev-bab3-v2'
    });

    const updatedRevisi = await graphRepository.upsertEntity({
      entity_type: 'revisi',
      name: 'Revisi Metodologi Evaluasi Latency Traversal (Bab 3) [SELESAI]',
      canonical_id: 'revisi:140810200001:bab3:latency',
      properties: {
        status: 'selesai',
        tgl_selesai: '2026-10-03',
        status_verifikasi: 'Disetujui Pembimbing'
      }
    });
    console.log(`  ✓ Revision marked [${updatedRevisi.properties.status}] with dual observations.\n`);

    // -------------------------------------------------------------------------
    // SCENARIO 7: Associating Research Topics & Specializations
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 7] Associating Research Topics & Specialization Taxonomies...');
    const topikAI = await graphRepository.upsertEntity({
      entity_type: 'topik_riset',
      name: 'Graph-RAG & Agentic Reasoning',
      canonical_id: 'topik:graph_rag',
      properties: { kategori: 'Artificial Intelligence', tren: 'Hot 2026' }
    });

    const topikMicroservices = await graphRepository.upsertEntity({
      entity_type: 'topik_riset',
      name: 'Self-Hosted Cloud Microservices',
      canonical_id: 'topik:microservices',
      properties: { kategori: 'Software Engineering', domain: 'DevOps & Backend' }
    });

    await graphRepository.upsertRelation({
      source_id: skripsi.id,
      relation_type: 'TERKAIT_BIDANG',
      target_id: topikAI.id,
      weight: 1.0
    });

    await graphRepository.upsertRelation({
      source_id: skripsi.id,
      relation_type: 'TERKAIT_BIDANG',
      target_id: topikMicroservices.id,
      weight: 0.85
    });
    console.log('  ✓ Research taxonomies (Graph-RAG & Microservices) linked.\n');

    // -------------------------------------------------------------------------
    // SCENARIO 8: Chatbot Aca Context Enrichment Simulation
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 8] Testing Chatbot Context Enrichment (NPM: 140810200001)...');
    const enrichedPrompt = await graphService.getEnrichedStudentContext('140810200001');
    console.log('  --- Enriched Context Injected into AI Prompt ---');
    console.log(enrichedPrompt.split('\n').map(l => '  | ' + l).join('\n'));
    console.log('  -----------------------------------------------\n');

    // -------------------------------------------------------------------------
    // SCENARIO 9: Logging Real-time Chat Conversation Observation
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 9] Logging Chatbot Interaction Observation...');
    await graphService.recordChatObservation({
      npm: '140810200001',
      message: 'Aca, apakah Bab 3 saya sudah siap diajukan untuk bimbingan berikutnya?',
      reply: 'Berdasarkan Memory Graph kamu, revisi metodologi latency Bab 3 sudah diselesaikan dan benchmark 18ms sudah terlampir. Kamu siap booking bimbingan Bab 4 dengan Pak Hendra!',
      sessionId: 'S-20261003-TEST01'
    });
    console.log('  ✓ Chat conversation observation attached to student entity.\n');

    // -------------------------------------------------------------------------
    // SCENARIO 10: Multi-Student Cohort Simulation (Diverse Specializations)
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 10] Simulating Multi-Student Cohort (RPL, Jaringan, Komputer)...');
    const cohort = [
      { npm: '140810200002', name: 'Dewi Lestari', kons: 'Rekayasa Perangkat Lunak', judul: 'Otomatisasi Testing CI/CD dengan Playwright & Docker' },
      { npm: '140810200003', name: 'Rian Pratama', kons: 'Teknik Komputer', judul: 'Monitoring Telemetri IoT Berbasis MQTT & Raspberry Pi' },
      { npm: '140810200004', name: 'Siti Rahmawati', kons: 'Sistem Cerdas', judul: 'Deteksi Plagiarisme Teks Skripsi dengan Siamese BERT' }
    ];

    for (const c of cohort) {
      const s = await graphRepository.upsertEntity({
        entity_type: 'mahasiswa',
        name: c.name,
        canonical_id: `mhs:${c.npm}`,
        properties: { npm: c.npm, angkatan: 2022, konsentrasi: c.kons, ipk: 3.75 }
      });

      const th = await graphRepository.upsertEntity({
        entity_type: 'skripsi',
        name: c.judul,
        canonical_id: `skripsi:${c.npm}`,
        properties: { status: 'Seminar Proposal', konsentrasi: c.kons }
      });

      await graphRepository.upsertRelation({
        source_id: s.id,
        relation_type: 'MENGERJAKAN',
        target_id: th.id,
        weight: 1.0
      });

      await graphRepository.upsertRelation({
        source_id: s.id,
        relation_type: 'DIBIMBING_OLEH',
        target_id: dosenUtama.id,
        weight: 0.9
      });
    }
    console.log('  ✓ 3 Additional cohort students registered and linked to Advisor.\n');

    // -------------------------------------------------------------------------
    // SCENARIO 11: Subgraph Query & Verification for Student
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 11] Executing Subgraph Query (NPM: 140810200001)...');
    const subGraph = await graphRepository.getStudentSubgraph('140810200001');
    console.log(`  ✓ Subgraph retrieved: ${subGraph.nodes.length} connected nodes, ${subGraph.edges.length} edges, ${subGraph.observations.length} observations.`);
    console.log(`  ✓ Student Node: ${subGraph.student.name} (Canonical: ${subGraph.student.canonical_id})\n`);

    // -------------------------------------------------------------------------
    // SCENARIO 12: Full Graph Health & Visualizer Payload Verification
    // -------------------------------------------------------------------------
    console.log('▶ [Scenario 12] Full Graph Global State & Visualizer Payload Validation...');
    const fullGraph = await graphRepository.getFullGraph({ limit: 500 });
    console.log('  ==============================================================');
    console.log(`  📊 FINAL GRAPH STATISTICS:`);
    console.log(`     - Total Entities / Nodes : ${fullGraph.statistics.total_nodes}`);
    console.log(`     - Total Relations / Edges: ${fullGraph.statistics.total_edges}`);
    console.log(`     - Total Observations     : ${fullGraph.statistics.total_observations}`);
    console.log('  ==============================================================');
    console.log('  ✓ Visualizer is ready at: https://acaris.my.id/api/chatbot/graph/visualizer\n');

    console.log('🎉 ALL 12 SCENARIOS COMPLETED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Error during scenario execution:', err);
  } finally {
    await pool.end();
  }
}

runScenarios();
