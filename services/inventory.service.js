const db = require('../db');
const socketService = require('./socket');

async function getInventory() {
  const [matRes, txRes] = await Promise.all([
    db.query('SELECT * FROM materials ORDER BY category, code ASC'),
    db.query('SELECT * FROM material_transactions ORDER BY created_at DESC LIMIT 50')
  ]);

  const materials = matRes.rows.map(m => ({
    id: m.id,
    code: m.code,
    name: m.name,
    category: m.category,
    unit: m.unit,
    unitCost: parseFloat(m.unit_cost),
    stockQuantity: parseFloat(m.stock_quantity),
    minThreshold: parseFloat(m.min_threshold),
    maxCapacity: parseFloat(m.max_capacity),
    supplier: m.supplier,
    location: m.location,
    updatedAt: m.updated_at
  }));

  return { materials, transactions: txRes.rows };
}

async function addMaterial(data) {
  const { code, name, category, unit, unitCost, stockQuantity, minThreshold, maxCapacity, supplier, location } = data;
  const id = `mat_${Date.now()}`;

  const insertRes = await db.query(
    `INSERT INTO materials (id, code, name, category, unit, unit_cost, stock_quantity, min_threshold, max_capacity, supplier, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [id, code, name, category, unit || 'kg', parseFloat(unitCost) || 0, parseFloat(stockQuantity) || 0, parseFloat(minThreshold) || 0, parseFloat(maxCapacity) || 0, supplier, location]
  );

  const newMaterial = insertRes.rows[0];
  socketService.broadcast('inventory:material_added', newMaterial);
  socketService.broadcast('inventory:updated', { materialId: id });
  return newMaterial;
}

async function updateMaterial(id, data) {
  const { name, category, unit, unitCost, stockQuantity, minThreshold, maxCapacity, supplier, location } = data;

  const updateRes = await db.query(
    `UPDATE materials SET
      name = COALESCE($1, name),
      category = COALESCE($2, category),
      unit = COALESCE($3, unit),
      unit_cost = COALESCE($4, unit_cost),
      stock_quantity = COALESCE($5, stock_quantity),
      min_threshold = COALESCE($6, min_threshold),
      max_capacity = COALESCE($7, max_capacity),
      supplier = COALESCE($8, supplier),
      location = COALESCE($9, location),
      updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [name, category, unit, unitCost, stockQuantity, minThreshold, maxCapacity, supplier, location, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Material not found');
    error.status = 404;
    throw error;
  }

  const updated = updateRes.rows[0];
  socketService.broadcast('inventory:updated', { materialId: id, material: updated });
  return updated;
}

async function adjustStock(id, delta, reason, performedBy) {
  const changeAmount = parseFloat(delta);
  if (isNaN(changeAmount) || changeAmount === 0) {
    const error = new Error('Valid non-zero delta quantity is required.');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const matRes = await client.query('SELECT * FROM materials WHERE id = $1 FOR UPDATE', [id]);
    if (matRes.rows.length === 0) {
      await client.query('ROLLBACK');
      const error = new Error('Material not found');
      error.status = 404;
      throw error;
    }

    const currentStock = parseFloat(matRes.rows[0].stock_quantity);
    const newStock = Math.max(0, currentStock + changeAmount);

    await client.query('UPDATE materials SET stock_quantity = $1, updated_at = NOW() WHERE id = $2', [newStock, id]);
    await client.query(
      `INSERT INTO material_transactions (material_id, change_amount, balance_after, reason, performed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, changeAmount, newStock, reason || (changeAmount > 0 ? 'Stock Inbound Receipt' : 'Shop Floor Material Requisition'), performedBy || 'Floor Operator']
    );

    await client.query('COMMIT');

    const payload = { materialId: id, delta: changeAmount, balance: newStock };
    socketService.broadcast('inventory:adjusted', payload);
    socketService.broadcast('inventory:updated', payload);

    return { success: true, materialId: id, balance: newStock };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteMaterial(id) {
  await db.query('DELETE FROM materials WHERE id = $1', [id]);
  socketService.broadcast('inventory:material_deleted', { materialId: id });
  return { success: true };
}

module.exports = {
  getInventory,
  addMaterial,
  updateMaterial,
  adjustStock,
  deleteMaterial
};
