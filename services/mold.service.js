const db = require('../db');
const socketService = require('./socket');

async function getMolds() {
  const mldRes = await db.query('SELECT * FROM molds ORDER BY code ASC');
  return mldRes.rows.map(m => {
    const currentShots = parseInt(m.current_shots) || 0;
    const interval = parseInt(m.service_interval_shots) || 100000;
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      cavities: parseInt(m.cavities) || 1,
      currentShots,
      serviceIntervalShots: interval,
      maintenanceIntervalShots: interval,
      lifeShotsLimit: interval * 10 || 1000000,
      lastServicedDate: m.last_serviced_date,
      lastServiced: m.last_serviced_date ? new Date(m.last_serviced_date).toLocaleDateString() : 'Operational in Toolroom',
      location: m.location || 'Toolroom Bay',
      status: m.status || 'Active',
      productSku: m.product_sku || ''
    };
  });
}

async function addMold(data) {
  const { name, code, cavities, currentShots, serviceIntervalShots, location, productSku } = data;
  const id = `mld_${Date.now()}`;

  const insertRes = await db.query(
    `INSERT INTO molds (id, name, code, cavities, current_shots, service_interval_shots, location, product_sku)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, name, code, parseInt(cavities) || 1, parseInt(currentShots) || 0, parseInt(serviceIntervalShots) || 100000, location, productSku]
  );

  socketService.broadcast('mold:updated', { moldId: id });
  return insertRes.rows[0];
}

async function updateMold(id, data) {
  const { name, cavities, serviceIntervalShots, location, status, productSku } = data;

  const updateRes = await db.query(
    `UPDATE molds SET
      name = COALESCE($1, name),
      cavities = COALESCE($2, cavities),
      service_interval_shots = COALESCE($3, service_interval_shots),
      location = COALESCE($4, location),
      status = COALESCE($5, status),
      product_sku = COALESCE($6, product_sku),
      updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [name, cavities, serviceIntervalShots, location, status, productSku, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Mold not found');
    error.status = 404;
    throw error;
  }

  socketService.broadcast('mold:updated', { moldId: id });
  return updateRes.rows[0];
}

async function logMoldShots(id, shots) {
  const additionalShots = parseInt(shots);
  if (isNaN(additionalShots) || additionalShots <= 0) {
    const error = new Error('Valid positive shot count required.');
    error.status = 400;
    throw error;
  }

  const updateRes = await db.query(
    `UPDATE molds 
     SET current_shots = current_shots + $1, updated_at = NOW() 
     WHERE id = $2 
     RETURNING *`,
    [additionalShots, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Mold not found');
    error.status = 404;
    throw error;
  }

  const updatedMold = updateRes.rows[0];
  socketService.broadcast('mold:shots_logged', { moldId: id, shots: updatedMold.current_shots });
  socketService.broadcast('mold:updated', { moldId: id });

  return { success: true, mold: updatedMold };
}

module.exports = {
  getMolds,
  addMold,
  updateMold,
  logMoldShots
};
