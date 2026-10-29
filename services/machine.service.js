const db = require('../db');
const socketService = require('./socket');

async function getMachines() {
  const mchRes = await db.query('SELECT * FROM machines ORDER BY code ASC');
  return mchRes.rows.map(m => ({
    id: m.id,
    name: m.name,
    code: m.code,
    model: m.model,
    clampingTons: m.tonnage,
    tonnage: m.tonnage,
    powerKw: parseFloat(m.power_kw),
    status: m.status,
    currentOrderId: m.current_order_id,
    operator: m.operator,
    currentOperator: m.operator || 'Operator On Duty',
    temperatureBarrelC: m.barrel_temp_c,
    barrelTempC: m.barrel_temp_c,
    oilPressureBar: m.hydraulic_pressure_bar,
    hydraulicPressureBar: m.hydraulic_pressure_bar,
    totalRuntimeHours: parseFloat(m.total_runtime_hours),
    cycleTimeTarget: parseFloat(m.cycle_time_target),
    hourlyCapacity: Math.round(3600 / (parseFloat(m.cycle_time_target) || 8) * (m.tonnage > 200 ? 16 : 8))
  }));
}

async function addMachine(data) {
  const { name, code, model, tonnage, powerKw, status, operator } = data;
  const id = `mch_${Date.now()}`;

  const insertRes = await db.query(
    `INSERT INTO machines (id, name, code, model, tonnage, power_kw, status, operator)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, name, code, model || 'Injection Press', parseInt(tonnage) || 100, parseFloat(powerKw) || 20, status || 'Idle', operator || '']
  );

  socketService.broadcast('machine:updated', { machineId: id });
  return insertRes.rows[0];
}

async function updateMachine(id, data) {
  const { name, status, operator, currentOperator, barrelTempC, temperatureBarrelC, hydraulicPressureBar, oilPressureBar } = data;

  const updateRes = await db.query(
    `UPDATE machines SET
      name = COALESCE($1, name),
      status = COALESCE($2, status),
      operator = COALESCE($3, $4, operator),
      barrel_temp_c = COALESCE($5, $6, barrel_temp_c),
      hydraulic_pressure_bar = COALESCE($7, $8, hydraulic_pressure_bar),
      updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [name, status, operator, currentOperator, barrelTempC, temperatureBarrelC, hydraulicPressureBar, oilPressureBar, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Machine not found');
    error.status = 404;
    throw error;
  }

  socketService.broadcast('machine:updated', { machineId: id, machine: updateRes.rows[0] });
  return updateRes.rows[0];
}

module.exports = {
  getMachines,
  addMachine,
  updateMachine
};
