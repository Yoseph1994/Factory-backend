const db = require('../db');
const socketService = require('./socket');

async function getPayrolls() {
  const payRes = await db.query('SELECT * FROM payrolls ORDER BY id DESC');
  return payRes.rows.map(p => ({
    id: p.id,
    employeeId: p.employee_id,
    employeeName: p.employee_name,
    empCode: p.emp_code,
    role: p.role,
    department: p.department,
    month: p.month,
    baseSalary: parseFloat(p.base_salary),
    allowances: parseFloat(p.allowances),
    deductions: parseFloat(p.deductions),
    netSalary: parseFloat(p.net_salary),
    paymentMethod: p.payment_method,
    paymentStatus: p.payment_status,
    disbursedAt: p.disbursed_at
  }));
}

/**
 * Zero-Pressure Trust Policy: Generates full monthly salary runs for all active workers
 */
async function generateMonthlyPayroll(month) {
  const client = await db.pool.connect();
  try {
    const targetMonth = month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    await client.query('BEGIN');
    const emps = await client.query("SELECT * FROM employees WHERE status = 'Active'");
    const createdPayrolls = [];

    for (const e of emps.rows) {
      const payrollId = `pay_${Date.now()}_${e.id}`;
      const baseSalary = parseFloat(e.monthly_salary) || 0;
      const netSalary = baseSalary;

      const insertRes = await client.query(
        `INSERT INTO payrolls (id, employee_id, employee_name, emp_code, role, department, month, base_salary, allowances, deductions, net_salary, payment_method, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, $9, $10, 'Pending')
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [payrollId, e.id, e.name, e.emp_code, e.role, e.department, targetMonth, baseSalary, netSalary, e.payment_method || 'Bank Transfer']
      );

      if (insertRes.rows.length > 0) {
        createdPayrolls.push(insertRes.rows[0]);
      }
    }

    await client.query('COMMIT');
    socketService.broadcast('payroll:updated', { month: targetMonth, count: createdPayrolls.length });
    return { success: true, count: createdPayrolls.length, payrolls: createdPayrolls };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updatePayroll(id, data) {
  const { paymentStatus, allowances, deductions } = data;
  const disbursedAt = paymentStatus === 'Paid' ? new Date() : null;

  const updateRes = await db.query(
    `UPDATE payrolls SET
      payment_status = COALESCE($1, payment_status),
      allowances = COALESCE($2, allowances),
      deductions = COALESCE($3, deductions),
      net_salary = base_salary + COALESCE($2, allowances) - COALESCE($3, deductions),
      disbursed_at = COALESCE($4, disbursed_at)
     WHERE id = $5
     RETURNING *`,
    [paymentStatus, allowances, deductions, disbursedAt, id]
  );

  if (updateRes.rows.length === 0) {
    const error = new Error('Payroll entry not found');
    error.status = 404;
    throw error;
  }

  socketService.broadcast('payroll:updated', { payrollId: id, status: paymentStatus });
  return updateRes.rows[0];
}

module.exports = {
  getPayrolls,
  generateMonthlyPayroll,
  updatePayroll
};
