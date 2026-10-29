const db = require('../db');
const socketService = require('./socket');

async function getSettings() {
  const setRes = await db.query('SELECT * FROM settings WHERE id = 1');
  const s = setRes.rows[0] || {};
  return {
    factoryName: s.factory_name,
    currency: s.currency,
    currencyCode: s.currency_code,
    electricityRatePerKwh: parseFloat(s.electricity_rate_per_kwh),
    laborRatePerHour: parseFloat(s.labor_rate_per_hour),
    overheadPercentage: parseFloat(s.overhead_percentage),
    regrindRecoveryCostPerKg: parseFloat(s.regrind_recovery_cost_per_kg),
    notificationEmail: s.notification_email,
    shiftHours: s.shift_hours,
    activeWorkersCount: s.active_workers_count
  };
}

async function updateSettings(data) {
  const { factoryName, currency, currencyCode, electricityRatePerKwh, laborRatePerHour, overheadPercentage, regrindRecoveryCostPerKg, notificationEmail, shiftHours } = data;

  const updateRes = await db.query(
    `UPDATE settings SET
      factory_name = COALESCE($1, factory_name),
      currency = COALESCE($2, currency),
      currency_code = COALESCE($3, currency_code),
      electricity_rate_per_kwh = COALESCE($4, electricity_rate_per_kwh),
      labor_rate_per_hour = COALESCE($5, labor_rate_per_hour),
      overhead_percentage = COALESCE($6, overhead_percentage),
      regrind_recovery_cost_per_kg = COALESCE($7, regrind_recovery_cost_per_kg),
      notification_email = COALESCE($8, notification_email),
      shift_hours = COALESCE($9, shift_hours),
      updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [factoryName, currency, currencyCode, electricityRatePerKwh, laborRatePerHour, overheadPercentage, regrindRecoveryCostPerKg, notificationEmail, shiftHours]
  );

  socketService.broadcast('settings:updated', updateRes.rows[0]);
  return updateRes.rows[0];
}

async function resetDefaults() {
  const { initializeSchemaAndSeed } = require('../db/init');
  await initializeSchemaAndSeed();
  socketService.broadcast('factory:reset', { timestamp: new Date() });
  return { success: true, message: 'Factory master data reset to pristine state.' };
}

module.exports = {
  getSettings,
  updateSettings,
  resetDefaults
};
