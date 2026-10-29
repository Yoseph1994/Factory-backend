const db = require('../db');
const socketService = require('./socket');

async function getProducts() {
  const prodRes = await db.query('SELECT * FROM products ORDER BY category, name ASC');
  return prodRes.rows.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    partWeightGrams: parseFloat(p.part_weight_grams),
    runnerWeightGrams: parseFloat(p.runner_weight_grams),
    cycleTimeSeconds: parseFloat(p.cycle_time_seconds),
    machineType: p.machine_type,
    moldId: p.mold_id,
    sellingPrice: parseFloat(p.selling_price),
    stockQty: p.stock_qty,
    recipe: p.bom,
    bom: p.bom,
    updatedAt: p.updated_at
  }));
}

async function addProduct(data) {
  const { name, sku, category, partWeightGrams, runnerWeightGrams, cycleTimeSeconds, machineType, moldId, sellingPrice, recipe, bom } = data;
  const id = `prd_${Date.now()}`;
  const bomPayload = JSON.stringify(recipe || bom || []);

  const insertRes = await db.query(
    `INSERT INTO products (id, name, sku, category, part_weight_grams, runner_weight_grams, cycle_time_seconds, machine_type, mold_id, selling_price, bom)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [id, name, sku, category, parseFloat(partWeightGrams) || 0, parseFloat(runnerWeightGrams) || 0, parseFloat(cycleTimeSeconds) || 10, machineType, moldId, parseFloat(sellingPrice) || 0, bomPayload]
  );

  socketService.broadcast('products:updated', { productId: id });
  return insertRes.rows[0];
}

async function updateProduct(id, data) {
  const { name, sku, category, partWeightGrams, runnerWeightGrams, cycleTimeSeconds, machineType, moldId, sellingPrice, recipe, bom } = data;
  const bomPayload = recipe || bom ? JSON.stringify(recipe || bom) : null;

  const updateRes = await db.query(
    `UPDATE products SET
      name = COALESCE($1, name),
      sku = COALESCE($2, sku),
      category = COALESCE($3, category),
      part_weight_grams = COALESCE($4, part_weight_grams),
      runner_weight_grams = COALESCE($5, runner_weight_grams),
      cycle_time_seconds = COALESCE($6, cycle_time_seconds),
      machine_type = COALESCE($7, machine_type),
      mold_id = COALESCE($8, mold_id),
      selling_price = COALESCE($9, selling_price),
      bom = COALESCE($10, bom),
      updated_at = NOW()
     WHERE id = $11
     RETURNING *`,
    [name, sku, category, partWeightGrams, runnerWeightGrams, cycleTimeSeconds, machineType, moldId, sellingPrice, bomPayload, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  socketService.broadcast('products:updated', { productId: id });
  return updateRes.rows[0];
}

async function deleteProduct(id) {
  await db.query('DELETE FROM products WHERE id = $1', [id]);
  socketService.broadcast('products:updated', { productId: id, deleted: true });
  return { success: true };
}

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct
};
