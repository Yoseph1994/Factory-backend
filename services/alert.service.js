const db = require('../db');

/**
 * Evaluates live database conditions and generates active enterprise plant alerts
 */
async function generatePlantAlerts() {
  const alerts = [];

  // 1. Material Silo Thresholds
  const matRes = await db.query('SELECT * FROM materials ORDER BY stock_quantity ASC');
  for (const m of matRes.rows) {
    const stock = parseFloat(m.stock_quantity);
    const min = parseFloat(m.min_threshold);
    const critical = min * 0.4;

    if (stock <= critical) {
      alerts.push({
        id: `crit_stock_${m.id}`,
        severity: 'critical',
        title: `CRITICAL STOCK: ${m.name}`,
        message: `Current stock (${stock.toLocaleString()} ${m.unit}) is below emergency reserve (${critical.toLocaleString()} ${m.unit}). Order immediately from ${m.supplier || 'supplier'}.`,
        targetTab: 'inventory',
        timestamp: new Date()
      });
    } else if (stock <= min) {
      alerts.push({
        id: `warn_stock_${m.id}`,
        severity: 'warning',
        title: `Reorder Warning: ${m.code}`,
        message: `Stock level (${stock.toLocaleString()} ${m.unit}) breached minimum threshold (${min.toLocaleString()} ${m.unit}) in ${m.location || 'Silo'}.`,
        targetTab: 'inventory',
        timestamp: new Date()
      });
    }
  }

  // 2. Mold Tooling Service Thresholds
  const moldRes = await db.query('SELECT * FROM molds');
  for (const mld of moldRes.rows) {
    const shots = parseInt(mld.current_shots);
    const interval = parseInt(mld.service_interval_shots);

    if (shots >= interval) {
      alerts.push({
        id: `crit_mold_${mld.id}`,
        severity: 'critical',
        title: `MOLD MAINTENANCE DUE: ${mld.code}`,
        message: `Mold "${mld.name}" reached ${shots.toLocaleString()} shots (service threshold: ${interval.toLocaleString()}). Cavity inspection required immediately to prevent tool damage.`,
        targetTab: 'maintenance',
        timestamp: new Date()
      });
    }
  }

  // 3. Unresolved Critical Maintenance Breakdowns
  const maintRes = await db.query("SELECT * FROM maintenance_tickets WHERE status != 'Resolved' AND priority = 'Critical'");
  for (const tkt of maintRes.rows) {
    alerts.push({
      id: `crit_maint_${tkt.id}`,
      severity: 'critical',
      title: `MACHINE BREAKDOWN: ${tkt.equipment_id}`,
      message: `${tkt.issue} (Reported: ${tkt.technician || 'Technician assigned'}).`,
      targetTab: 'maintenance',
      timestamp: tkt.logged_at
    });
  }

  return alerts;
}

module.exports = {
  generatePlantAlerts
};
