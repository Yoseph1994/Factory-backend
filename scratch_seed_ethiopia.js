const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'c:/Users/hp/Desktop/Factory/backend/.env' });

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plastix_factory';

async function updateToEthiopianFactory() {
  const pool = new Pool({ connectionString });

  try {
    console.log('Updating settings to Ethiopian Industrial Parameters...');
    await pool.query(`
      UPDATE settings SET
        factory_name = 'EthioPlast Manufacturing PLC (Dukem Industrial Park, Oromia, Ethiopia)',
        currency = 'ETB',
        currency_code = 'ETB',
        electricity_rate_per_kwh = 2.45,
        labor_rate_per_hour = 95.00,
        overhead_percentage = 15.00,
        regrind_recovery_cost_per_kg = 14.50,
        notification_email = 'operations@ethioplast-factory.et',
        shift_hours = 8,
        active_workers_count = 74
      WHERE id = 1;
    `);

    console.log('Seeding Ethiopian personnel accounts...');
    const ethiopianUsers = [
      {
        phone: '+251911010101',
        name: 'Abebe Tadesse',
        role: 'plant_owner',
        department: 'Executive Management',
        password: 'password123'
      },
      {
        phone: '+251911010102',
        name: 'Tolasa Desta',
        role: 'production_manager',
        department: 'Production & Operations',
        password: 'password123'
      },
      {
        phone: '+251911010103',
        name: 'Chaltu Gemeda',
        role: 'shift_supervisor',
        department: 'Shop Floor Shift Operations',
        password: 'password123'
      },
      {
        phone: '+251911010104',
        name: 'Yohannes Bekele',
        role: 'qc_inspector',
        department: 'Quality Assurance & Regrind',
        password: 'password123'
      },
      {
        phone: '+251911010105',
        name: 'Kenenisa Guyo',
        role: 'warehouse_officer',
        department: 'Warehouse & Gate Dispatch',
        password: 'password123'
      },
      {
        phone: '+251911010106',
        name: 'Dawit Alemu',
        role: 'maintenance_tech',
        department: 'Mold Toolroom & Maintenance',
        password: 'password123'
      },
      {
        phone: '+251911010107',
        name: 'Hanan Mohammed',
        role: 'hr_payroll',
        department: 'Human Resources & Finance',
        password: 'password123'
      }
    ];

    for (const u of ethiopianUsers) {
      const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [u.phone]);
      const hash = bcrypt.hashSync(u.password, 10);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (phone, password_hash, name, role, department)
           VALUES ($1, $2, $3, $4, $5)`,
          [u.phone, hash, u.name, u.role, u.department]
        );
      } else {
        await pool.query(
          `UPDATE users SET name = $1, role = $2, department = $3, password_hash = $4 WHERE phone = $5`,
          [u.name, u.role, u.department, hash, u.phone]
        );
      }
    }

    console.log('Updating suppliers and storage locations to Ethiopian context...');
    await pool.query(`
      UPDATE materials SET 
        location = CASE 
          WHEN code LIKE '%HDPE%' THEN 'Dukem Silo Alpha'
          WHEN code LIKE '%PP%' THEN 'Dukem Silo Beta'
          WHEN code LIKE '%MB%' THEN 'Gelan Color Depot'
          WHEN code LIKE '%REG%' THEN 'Regrind Granulator Yard'
          ELSE 'Main Factory Bay'
        END,
        supplier = CASE
          WHEN category = 'Virgin Polymer' THEN 'National Polymer Importers Addis'
          WHEN category = 'Masterbatch' THEN 'Oromia Colors & Additives'
          WHEN category = 'Regrind' THEN 'EthioPlast In-House Granulator'
          ELSE 'Addis Chemical PLC'
        END;
    `);

    console.log('Ethiopian seed completed successfully!');
  } catch (err) {
    console.error('Error during Ethiopian migration:', err);
  } finally {
    await pool.end();
  }
}

updateToEthiopianFactory();
