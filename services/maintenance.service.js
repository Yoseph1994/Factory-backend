const db = require('../db');
const socketService = require('./socket');

async function getMaintenanceTickets() {
  const maintRes = await db.query('SELECT * FROM maintenance_tickets ORDER BY logged_at DESC');
  return maintRes.rows.map(t => ({
    id: t.id,
    ticketNumber: t.ticket_number,
    title: t.title || t.issue,
    equipmentType: t.equipment_type,
    equipmentId: t.equipment_id,
    targetItem: t.equipment_id,
    category: t.equipment_type,
    issue: t.issue,
    priority: t.priority,
    status: t.status,
    technician: t.technician,
    downtimeMinutes: t.downtime_minutes,
    details: t.details,
    loggedAt: t.logged_at,
    reportedDate: t.logged_at,
    resolvedAt: t.resolved_at
  }));
}

async function addMaintenanceTicket(data) {
  const { equipmentType, equipmentId, issue, priority, technician, title, details } = data;
  const id = `mnt_${Date.now()}`;
  const ticketNumber = `TKT-${Math.floor(100 + Math.random() * 900)}`;

  const insertRes = await db.query(
    `INSERT INTO maintenance_tickets (id, ticket_number, title, equipment_type, equipment_id, issue, priority, technician, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, ticketNumber, title || issue, equipmentType || 'Machine', equipmentId || 'MCH-01', issue, priority || 'Medium', technician || 'Unassigned', details || '']
  );

  socketService.broadcast('maintenance:ticket_created', insertRes.rows[0]);
  return insertRes.rows[0];
}

async function updateMaintenanceTicket(id, data) {
  const { status, technician, downtimeMinutes, details } = data;
  const resolvedAt = status === 'Resolved' ? new Date() : null;

  const updateRes = await db.query(
    `UPDATE maintenance_tickets SET
      status = COALESCE($1, status),
      technician = COALESCE($2, technician),
      downtime_minutes = COALESCE($3, downtime_minutes),
      details = COALESCE($4, details),
      resolved_at = COALESCE($5, resolved_at)
     WHERE id = $6
     RETURNING *`,
    [status, technician, downtimeMinutes, details, resolvedAt, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Maintenance ticket not found');
    error.status = 404;
    throw error;
  }

  socketService.broadcast('maintenance:ticket_updated', { ticketId: id, ticket: updateRes.rows[0] });
  return updateRes.rows[0];
}

module.exports = {
  getMaintenanceTickets,
  addMaintenanceTicket,
  updateMaintenanceTicket
};
