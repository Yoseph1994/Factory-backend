const db = require('../db');
const socketService = require('./socket');

async function getWorkOrders() {
  const woRes = await db.query('SELECT * FROM work_orders ORDER BY target_date ASC');
  return woRes.rows.map(w => ({
    id: w.id,
    orderNumber: w.order_number,
    clientName: w.client_name,
    productId: w.product_id,
    productName: w.product_name,
    targetQuantity: w.target_quantity,
    completedQuantity: w.completed_quantity,
    machineId: w.machine_id,
    assignedMachine: w.machine_id,
    startDate: w.start_date,
    targetDate: w.target_date,
    status: w.status,
    priority: w.priority,
    dispatchDetails: w.dispatch_details,
    createdAt: w.created_at,
    updatedAt: w.updated_at
  }));
}

async function addWorkOrder(data) {
  const { clientName, productId, productName, targetQuantity, machineId, startDate, targetDate, priority } = data;
  const id = `wo_${Date.now()}`;
  const orderNumber = `WO-${Math.floor(9000 + Math.random() * 1000)}`;

  const insertRes = await db.query(
    `INSERT INTO work_orders (id, order_number, client_name, product_id, product_name, target_quantity, machine_id, start_date, target_date, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Queued')
     RETURNING *`,
    [id, orderNumber, clientName, productId, productName, parseInt(targetQuantity) || 0, machineId || 'MCH-01', startDate || new Date().toISOString().split('T')[0], targetDate, priority || 'Medium']
  );

  socketService.broadcast('orders:updated', { workOrderId: id });
  return insertRes.rows[0];
}

async function updateWorkOrder(id, data) {
  const { completedQuantity, status, dispatchDetails, priority, machineId } = data;
  const dispatchJson = dispatchDetails ? JSON.stringify(dispatchDetails) : null;

  const updateRes = await db.query(
    `UPDATE work_orders SET
      completed_quantity = COALESCE($1, completed_quantity),
      status = COALESCE($2, status),
      dispatch_details = COALESCE($3, dispatch_details),
      priority = COALESCE($4, priority),
      machine_id = COALESCE($5, machine_id),
      updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [completedQuantity, status, dispatchJson, priority, machineId, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Work order not found');
    error.status = 404;
    throw error;
  }

  socketService.broadcast('orders:updated', { workOrderId: id, order: updateRes.rows[0] });
  return updateRes.rows[0];
}

module.exports = {
  getWorkOrders,
  addWorkOrder,
  updateWorkOrder
};
