const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_enterprise_jwt_key_plastix_9988771122';

/**
 * Access Matrix Permissions by Role:
 * - plant_owner: Full access
 * - production_manager: dashboard, work_orders, machines, molds, recipes, employees (read), qc (read)
 * - shift_supervisor: floor_terminal, machines, molds, qc (create), maintenance (create), inventory (request)
 * - qc_inspector: qc, floor_terminal
 * - warehouse_officer: inventory, dispatch, work_orders (dispatch)
 * - maintenance_tech: machines, molds, maintenance
 * - hr_payroll: employees, payroll
 */
const ROLE_PERMISSIONS = {
  plant_owner: ['*'],
  production_manager: [
    'dashboard:read', 'orders:read', 'orders:write', 
    'machines:read', 'machines:write', 'molds:read', 'molds:write',
    'recipes:read', 'recipes:write', 'inventory:read', 'qc:read',
    'employees:read', 'maintenance:read', 'maintenance:write'
  ],
  shift_supervisor: [
    'floor_mode', 'machines:read', 'machines:write', 'molds:shots',
    'qc:create', 'maintenance:create', 'inventory:read', 'inventory:request',
    'orders:read'
  ],
  qc_inspector: [
    'qc:read', 'qc:write', 'qc:create', 'floor_mode', 'inventory:read'
  ],
  warehouse_officer: [
    'inventory:read', 'inventory:write', 'inventory:adjust',
    'orders:read', 'orders:dispatch', 'gate_pass:write'
  ],
  maintenance_tech: [
    'machines:read', 'machines:write', 'molds:read', 'molds:write', 'molds:shots',
    'maintenance:read', 'maintenance:write', 'maintenance:create', 'floor_mode'
  ],
  hr_payroll: [
    'employees:read', 'employees:write', 'payroll:read', 'payroll:write', 'payroll:generate'
  ]
};

// Authenticate via httpOnly cookie (preferred) or Authorization: Bearer <token>
async function requireAuth(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in with your phone and password.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch live user from PostgreSQL database to ensure account is active
    const userRes = await db.query(
      'SELECT id, phone, name, role, department, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      res.clearCookie('token');
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.'
      });
    }

    req.user = userRes.rows[0];
    req.user.permissions = ROLE_PERMISSIONS[req.user.role] || [];
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  }
}

// Role-Based Access Control Guard
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    // Plant owner has super-admin override
    if (req.user.role === 'plant_owner') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access Denied: Your role (${req.user.role}) is not permitted to access this resource.`,
      requiredRoles: allowedRoles,
      userRole: req.user.role
    });
  };
}

module.exports = {
  requireAuth,
  requireRole,
  ROLE_PERMISSIONS,
  JWT_SECRET
};
