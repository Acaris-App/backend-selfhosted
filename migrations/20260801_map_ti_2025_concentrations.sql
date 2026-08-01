BEGIN;

WITH mapping(concentration_code, course_code) AS (
  VALUES
    ('SK', 'INF625306'), ('SK', 'INF625307'), ('SK', 'INF625320'),
    ('SK', 'INF625329'), ('SK', 'INF625334'), ('SK', 'INF625337'),
    ('RPL', 'INF625313'), ('RPL', 'INF625314'), ('RPL', 'INF625318'),
    ('RPL', 'INF625319'), ('RPL', 'INF625323'), ('RPL', 'INF625324'),
    ('RPL', 'INF625325'), ('RPL', 'INF625328'), ('RPL', 'INF625330'),
    ('RPL', 'INF625332'), ('RPL', 'INF625335'),
    ('TI', 'INF625315'), ('TI', 'INF625316'), ('TI', 'INF625317'),
    ('TI', 'INF625321'), ('TI', 'INF625322'), ('TI', 'INF625326'),
    ('TI', 'INF625327'), ('TI', 'INF625331'), ('TI', 'INF625333'),
    ('TI', 'INF625336'), ('TI', 'INF625338')
), target AS (
  SELECT c.id FROM konsentrasi c JOIN kurikulum k ON k.id = c.kurikulum_id WHERE k.kode = 'TI-2025'
)
DELETE FROM konsentrasi_mata_kuliah cmk USING target t WHERE cmk.konsentrasi_id = t.id;

WITH mapping(concentration_code, course_code) AS (
  VALUES
    ('SK', 'INF625306'), ('SK', 'INF625307'), ('SK', 'INF625320'),
    ('SK', 'INF625329'), ('SK', 'INF625334'), ('SK', 'INF625337'),
    ('RPL', 'INF625313'), ('RPL', 'INF625314'), ('RPL', 'INF625318'),
    ('RPL', 'INF625319'), ('RPL', 'INF625323'), ('RPL', 'INF625324'),
    ('RPL', 'INF625325'), ('RPL', 'INF625328'), ('RPL', 'INF625330'),
    ('RPL', 'INF625332'), ('RPL', 'INF625335'),
    ('TI', 'INF625315'), ('TI', 'INF625316'), ('TI', 'INF625317'),
    ('TI', 'INF625321'), ('TI', 'INF625322'), ('TI', 'INF625326'),
    ('TI', 'INF625327'), ('TI', 'INF625331'), ('TI', 'INF625333'),
    ('TI', 'INF625336'), ('TI', 'INF625338')
)
INSERT INTO konsentrasi_mata_kuliah (konsentrasi_id, kurikulum_mata_kuliah_id)
SELECT c.id, kmk.id
FROM mapping m
JOIN kurikulum k ON k.kode = 'TI-2025'
JOIN konsentrasi c ON c.kurikulum_id = k.id AND c.kode = m.concentration_code
JOIN mata_kuliah mk ON mk.kode = m.course_code
JOIN kurikulum_mata_kuliah kmk ON kmk.kurikulum_id = k.id AND kmk.mata_kuliah_id = mk.id
ON CONFLICT DO NOTHING;

COMMIT;
