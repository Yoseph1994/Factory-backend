const db = require('../db');
const socketService = require('./socket');

async function getQCLogs() {
  const qcRes = await db.query('SELECT * FROM qc_logs ORDER BY timestamp DESC LIMIT 100');
  return qcRes.rows.map(q => ({
    id: q.id,
    orderNumber: q.order_number,
    machineId: q.machine_id,
    inspector: q.inspector,
    sampleSize: q.sample_size,
    defectCount: q.defect_count,
    defectType: q.defect_type,
    status: q.status,
    scrapWeightKg: parseFloat(q.scrap_weight_kg),
    recoverableKg: parseFloat(q.recoverable_kg),
    regrindRecoverableKg: parseFloat(q.recoverable_kg),
    notes: q.notes,
    timestamp: q.timestamp
  }));
}

async function logQCInspection(data) {
  const client = await db.pool.connect();
  try {
    const { orderNumber, machineId, inspector, sampleSize, defectCount, defectType, status, scrapWeightKg, recoverableKg, notes } = data;
    const id = `qc_${Date.now()}`;
    const cleanRecoverableKg = parseFloat(recoverableKg) || 0;

    await client.query('BEGIN');

    // 1. Insert Quality Inspection Record
    const qcInsert = await client.query(
      `INSERT INTO qc_logs (id, order_number, machine_id, inspector, sample_size, defect_count, defect_type, status, scrap_weight_kg, recoverable_kg, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, orderNumber, machineId, inspector || 'QC Lead', parseInt(sampleSize) || 0, parseInt(defectCount) || 0, defectType, status || 'Approved', parseFloat(scrapWeightKg) || 0, cleanRecoverableKg, notes || '']
    );

    // 2. Closed-Loop Automation: If clean scrap exists, automatically credit back to Regrind inventory!
    if (cleanRecoverableKg > 0) {
      const regrindMat = await client.query("SELECT id FROM materials WHERE category = 'Regrind' LIMIT 1");
      if (regrindMat.rows.length > 0) {
        const regrindId = regrindMat.rows[0].id;
        await client.query(
          'UPDATE materials SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2',
          [cleanRecoverableKg, regrindId]
        );
        await client.query(
          `INSERT INTO material_transactions (material_id, change_amount, balance_after, reason, performed_by)
           VALUES ($1, $2, (SELECT stock_quantity FROM materials WHERE id = $1), $3, $4)`,
          [regrindId, cleanRecoverableKg, `Recycled Regrind credited from QC Inspection #${orderNumber || id}`, inspector || 'QC Automation']
        );
      }
    }

    await client.query('COMMIT');

    // Broadcast real-time Socket.IO events to all clients
    socketService.broadcast('qc:logged', qcInsert.rows[0]);
    if (cleanRecoverableKg > 0) {
      socketService.broadcast('inventory:updated', { regrindAdded: cleanRecoverableKg });
    }

    return qcInsert.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getQCLogs,
  logQCInspection
};
