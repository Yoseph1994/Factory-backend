const db = require('../db');
const socketService = require('./socket');

async function getEmployees() {
  const empRes = await db.query('SELECT * FROM employees ORDER BY name ASC');
  return empRes.rows.map(e => ({
    id: e.id,
    empCode: e.emp_code,
    name: e.name,
    role: e.role,
    department: e.department,
    shift: e.shift,
    monthlySalary: parseFloat(e.monthly_salary),
    phone: e.phone,
    joinedDate: e.joined_date,
    status: e.status,
    paymentMethod: e.payment_method,
    accountNumber: e.account_number,
    createdAt: e.created_at
  }));
}

async function addEmployee(data) {
  const { empCode, name, role, department, shift, monthlySalary, phone, joinedDate, status, paymentMethod, accountNumber } = data;
  const id = `emp_${Date.now()}`;
  const code = empCode || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const insertRes = await db.query(
    `INSERT INTO employees (id, emp_code, name, role, department, shift, monthly_salary, phone, joined_date, status, payment_method, account_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [id, code, name, role, department, shift || 'Shift A (Morning)', parseFloat(monthlySalary) || 0, phone, joinedDate || new Date().toISOString().split('T')[0], status || 'Active', paymentMethod || 'Bank Transfer', accountNumber || '']
  );

  socketService.broadcast('employees:updated', { employeeId: id });
  return insertRes.rows[0];
}

async function updateEmployee(id, data) {
  const { name, role, department, shift, monthlySalary, phone, status, paymentMethod, accountNumber } = data;

  const updateRes = await db.query(
    `UPDATE employees SET
      name = COALESCE($1, name),
      role = COALESCE($2, role),
      department = COALESCE($3, department),
      shift = COALESCE($4, shift),
      monthly_salary = COALESCE($5, monthly_salary),
      phone = COALESCE($6, phone),
      status = COALESCE($7, status),
      payment_method = COALESCE($8, payment_method),
      account_number = COALESCE($9, account_number)
     WHERE id = $10
     RETURNING *`,
    [name, role, department, shift, monthlySalary, phone, status, paymentMethod, accountNumber, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }

  socketService.broadcast('employees:updated', { employeeId: id, employee: updateRes.rows[0] });
  return updateRes.rows[0];
}

async function deleteEmployee(id) {
  await db.query('DELETE FROM employees WHERE id = $1', [id]);
  socketService.broadcast('employees:updated', { employeeId: id, deleted: true });
  return { success: true };
}

module.exports = {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee
};
