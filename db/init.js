const { Client, Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plastix_factory';

async function ensureDatabaseExists() {
  const adminClient = new Client({
    connectionString: 'postgres://postgres:postgres@localhost:5432/postgres'
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'plastix_factory'");
    if (res.rows.length === 0) {
      console.log('Database "plastix_factory" does not exist. Creating now...');
      await adminClient.query('CREATE DATABASE plastix_factory');
      console.log('Database "plastix_factory" created successfully.');
    } else {
      console.log('Database "plastix_factory" already exists.');
    }
  } catch (err) {
    console.error('Error ensuring database exists:', err.message);
    throw err;
  } finally {
    await adminClient.end();
  }
}

async function initializeSchemaAndSeed() {
  await ensureDatabaseExists();

  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to plastix_factory database...');

    // 1. Create Tables
    await pool.query(`
      -- Users & Authentication Table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(30) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Materials & Silos
      CREATE TABLE IF NOT EXISTS materials (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL,
        unit VARCHAR(20) DEFAULT 'kg',
        unit_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
        stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
        min_threshold NUMERIC(12, 2) NOT NULL DEFAULT 0,
        max_capacity NUMERIC(12, 2) NOT NULL DEFAULT 0,
        supplier VARCHAR(150),
        location VARCHAR(100),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Material Stock Adjustment Transactions
      CREATE TABLE IF NOT EXISTS material_transactions (
        id SERIAL PRIMARY KEY,
        material_id VARCHAR(50) REFERENCES materials(id) ON DELETE CASCADE,
        change_amount NUMERIC(12, 2) NOT NULL,
        balance_after NUMERIC(12, 2) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        performed_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Products & BOM Formulations
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        sku VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        part_weight_grams NUMERIC(8, 2) NOT NULL DEFAULT 0,
        runner_weight_grams NUMERIC(8, 2) NOT NULL DEFAULT 0,
        cycle_time_seconds NUMERIC(6, 1) NOT NULL DEFAULT 10,
        machine_type VARCHAR(100),
        mold_id VARCHAR(50),
        selling_price NUMERIC(12, 4) NOT NULL DEFAULT 0,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        bom JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Machines & Presses
      CREATE TABLE IF NOT EXISTS machines (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        model VARCHAR(100) DEFAULT 'Injection Press',
        tonnage INTEGER NOT NULL DEFAULT 100,
        power_kw NUMERIC(8, 2) NOT NULL DEFAULT 20,
        status VARCHAR(50) NOT NULL DEFAULT 'Idle',
        current_order_id VARCHAR(50),
        operator VARCHAR(100),
        barrel_temp_c INTEGER NOT NULL DEFAULT 200,
        hydraulic_pressure_bar INTEGER NOT NULL DEFAULT 140,
        total_runtime_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
        cycle_time_target NUMERIC(6, 1) NOT NULL DEFAULT 10,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Molds & Tooling
      CREATE TABLE IF NOT EXISTS molds (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        cavities INTEGER NOT NULL DEFAULT 1,
        current_shots INTEGER NOT NULL DEFAULT 0,
        service_interval_shots INTEGER NOT NULL DEFAULT 100000,
        last_serviced_date DATE,
        location VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        product_sku VARCHAR(50),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Quality Control Logs
      CREATE TABLE IF NOT EXISTS qc_logs (
        id VARCHAR(50) PRIMARY KEY,
        order_number VARCHAR(50),
        machine_id VARCHAR(50),
        inspector VARCHAR(100) NOT NULL,
        sample_size INTEGER NOT NULL DEFAULT 0,
        defect_count INTEGER NOT NULL DEFAULT 0,
        defect_type VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Approved',
        scrap_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        recoverable_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Customer Work Orders & Dispatch
      CREATE TABLE IF NOT EXISTS work_orders (
        id VARCHAR(50) PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        client_name VARCHAR(150) NOT NULL,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE RESTRICT,
        product_name VARCHAR(150) NOT NULL,
        target_quantity INTEGER NOT NULL DEFAULT 0,
        completed_quantity INTEGER NOT NULL DEFAULT 0,
        machine_id VARCHAR(50),
        start_date DATE NOT NULL,
        target_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Queued',
        priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
        dispatch_details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Maintenance & Breakdown Tickets
      CREATE TABLE IF NOT EXISTS maintenance_tickets (
        id VARCHAR(50) PRIMARY KEY,
        ticket_number VARCHAR(50) DEFAULT 'TKT-100',
        title VARCHAR(200),
        equipment_type VARCHAR(50) DEFAULT 'Machine',
        equipment_id VARCHAR(100) DEFAULT 'N/A',
        issue TEXT,
        priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
        status VARCHAR(50) NOT NULL DEFAULT 'Open',
        technician VARCHAR(100),
        downtime_minutes INTEGER NOT NULL DEFAULT 0,
        details TEXT,
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE
      );
      ALTER TABLE maintenance_tickets ALTER COLUMN ticket_number DROP NOT NULL;
      ALTER TABLE maintenance_tickets ALTER COLUMN equipment_type DROP NOT NULL;
      ALTER TABLE maintenance_tickets ALTER COLUMN equipment_id DROP NOT NULL;
      ALTER TABLE maintenance_tickets ALTER COLUMN issue DROP NOT NULL;
      ALTER TABLE maintenance_tickets ADD COLUMN IF NOT EXISTS title VARCHAR(200);
      ALTER TABLE maintenance_tickets ADD COLUMN IF NOT EXISTS details TEXT;


      -- Staff / Employees Directory
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(50) PRIMARY KEY,
        emp_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        shift VARCHAR(50) NOT NULL,
        monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
        phone VARCHAR(30),
        joined_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
        account_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Monthly Payroll Slips
      CREATE TABLE IF NOT EXISTS payrolls (
        id VARCHAR(100) PRIMARY KEY,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(100) NOT NULL,
        emp_code VARCHAR(50) NOT NULL,
        role VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        month VARCHAR(50) NOT NULL,
        base_salary NUMERIC(12, 2) NOT NULL,
        allowances NUMERIC(12, 2) NOT NULL DEFAULT 0,
        deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
        net_salary NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        disbursed_at TIMESTAMP WITH TIME ZONE
      );

      -- Global Plant Master Settings
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        factory_name VARCHAR(150) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT '$',
        currency_code VARCHAR(10) NOT NULL DEFAULT 'USD',
        electricity_rate_per_kwh NUMERIC(8, 4) NOT NULL DEFAULT 0.16,
        labor_rate_per_hour NUMERIC(8, 2) NOT NULL DEFAULT 7.50,
        overhead_percentage NUMERIC(6, 2) NOT NULL DEFAULT 15.0,
        regrind_recovery_cost_per_kg NUMERIC(8, 2) NOT NULL DEFAULT 0.30,
        notification_email VARCHAR(100),
        shift_hours INTEGER NOT NULL DEFAULT 8,
        active_workers_count INTEGER NOT NULL DEFAULT 74,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Ensure model column allows null or has default
    await pool.query(`ALTER TABLE machines ALTER COLUMN model DROP NOT NULL`);

    console.log('Tables verified and updated successfully.');

    // 2. Seed Default Users for the 7 Actors (Ethiopian Factory Personnel + Legacy Demo)
    const defaultUsers = [
      // Ethiopian Factory Operators & Management (Primary)
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
      },
      // Previous Demo Credentials (Backward Compatible)
      {
        phone: '+15550101',
        name: 'Arthur Vance',
        role: 'plant_owner',
        department: 'Executive Management',
        password: 'password123'
      },
      {
        phone: '+15550102',
        name: 'Carlos Ortiz',
        role: 'production_manager',
        department: 'Production & Operations',
        password: 'password123'
      },
      {
        phone: '+15550103',
        name: 'Rashid Khan',
        role: 'shift_supervisor',
        department: 'Shop Floor Shift Operations',
        password: 'password123'
      },
      {
        phone: '+15550104',
        name: 'Elena Rostova',
        role: 'qc_inspector',
        department: 'Quality Assurance & Regrind',
        password: 'password123'
      },
      {
        phone: '+15550105',
        name: 'Marcus Vance',
        role: 'warehouse_officer',
        department: 'Warehouse & Gate Dispatch',
        password: 'password123'
      },
      {
        phone: '+15550106',
        name: 'Vikram Patel',
        role: 'maintenance_tech',
        department: 'Mold Toolroom & Maintenance',
        password: 'password123'
      },
      {
        phone: '+15550107',
        name: 'Sarah Jenkins',
        role: 'hr_payroll',
        department: 'Human Resources & Finance',
        password: 'password123'
      }
    ];

    for (const u of defaultUsers) {
      const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [u.phone]);
      if (existing.rows.length === 0) {
        const hash = bcrypt.hashSync(u.password, 10);
        await pool.query(
          `INSERT INTO users (phone, password_hash, name, role, department)
           VALUES ($1, $2, $3, $4, $5)`,
          [u.phone, hash, u.name, u.role, u.department]
        );
      }
    }

    // 3. Seed Master Data from factory_data.json if tables are empty
    const jsonPath = path.join(__dirname, '../data/factory_data.json');
    if (fs.existsSync(jsonPath)) {
      const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Seed Settings
      if (rawData.settings) {
        const s = rawData.settings;
        await pool.query(
          `INSERT INTO settings (
            id, factory_name, currency, currency_code, electricity_rate_per_kwh,
            labor_rate_per_hour, overhead_percentage, regrind_recovery_cost_per_kg,
            notification_email, shift_hours, active_workers_count
          ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            factory_name = EXCLUDED.factory_name,
            currency = EXCLUDED.currency,
            electricity_rate_per_kwh = EXCLUDED.electricity_rate_per_kwh,
            labor_rate_per_hour = EXCLUDED.labor_rate_per_hour,
            overhead_percentage = EXCLUDED.overhead_percentage,
            regrind_recovery_cost_per_kg = EXCLUDED.regrind_recovery_cost_per_kg,
            shift_hours = EXCLUDED.shift_hours,
            active_workers_count = EXCLUDED.active_workers_count`,
          [
            s.factoryName, s.currency, s.currencyCode || 'USD',
            s.electricityRatePerKwh, s.laborRatePerHour, s.overheadPercentage,
            s.regrindRecoveryCostPerKg, s.notificationEmail, s.shiftHours, s.activeWorkersCount
          ]
        );
      }

      // Seed Materials
      const matCount = await pool.query('SELECT count(*) FROM materials');
      if (parseInt(matCount.rows[0].count) === 0 && rawData.materials) {
        for (const m of rawData.materials) {
          await pool.query(
            `INSERT INTO materials (id, code, name, category, unit, unit_cost, stock_quantity, min_threshold, max_capacity, supplier, location)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO NOTHING`,
            [m.id, m.code, m.name, m.category, m.unit || 'kg', m.unitCost, m.stockQuantity, m.minThreshold, m.maxCapacity, m.supplier, m.location]
          );
        }
      }

      // Seed Products
      const prodCount = await pool.query('SELECT count(*) FROM products');
      if (parseInt(prodCount.rows[0].count) === 0 && rawData.products) {
        for (const p of rawData.products) {
          const bomData = p.recipe || p.bom || [];
          await pool.query(
            `INSERT INTO products (id, name, sku, category, part_weight_grams, runner_weight_grams, cycle_time_seconds, machine_type, mold_id, selling_price, stock_qty, bom)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO NOTHING`,
            [p.id, p.name, p.sku, p.category, p.partWeightGrams || 0, p.runnerWeightGrams || 0, p.cycleTimeSeconds || 10, p.machineType, p.moldId, p.sellingPrice || 0, p.stockQty || 0, JSON.stringify(bomData)]
          );
        }
      }

      // Seed Machines
      const mchCount = await pool.query('SELECT count(*) FROM machines');
      if (parseInt(mchCount.rows[0].count) === 0 && rawData.machines) {
        for (const m of rawData.machines) {
          await pool.query(
            `INSERT INTO machines (id, name, code, model, tonnage, power_kw, status, current_order_id, operator, barrel_temp_c, hydraulic_pressure_bar, total_runtime_hours, cycle_time_target)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO NOTHING`,
            [
              m.id,
              m.name,
              m.code,
              m.model || m.type || 'Injection Molding',
              m.tonnage || m.clampingTons || 100,
              m.powerKw || 20,
              m.status || 'Idle',
              m.currentOrderId || null,
              m.operator || m.currentOperator || '',
              m.barrelTempC || m.temperatureBarrelC || 200,
              m.hydraulicPressureBar || m.oilPressureBar || 140,
              m.totalRuntimeHours || 0,
              m.cycleTimeTarget || 10
            ]
          );
        }
        console.log(`Seeded machines into PostgreSQL.`);
      }

      // Seed Molds
      const mldCount = await pool.query('SELECT count(*) FROM molds');
      if (parseInt(mldCount.rows[0].count) === 0 && rawData.molds) {
        for (const m of rawData.molds) {
          await pool.query(
            `INSERT INTO molds (id, name, code, cavities, current_shots, service_interval_shots, last_serviced_date, location, status, product_sku)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [
              m.id,
              m.name,
              m.code,
              m.cavities || 1,
              m.currentShots || 0,
              m.serviceIntervalShots || m.maintenanceIntervalShots || 50000,
              m.lastServicedDate || m.lastServiced || null,
              m.location || 'Toolroom Bay',
              m.status || 'Active',
              m.productSku || ''
            ]
          );
        }
        console.log(`Seeded molds into PostgreSQL.`);
      }

      // Seed QC Logs
      const qcCount = await pool.query('SELECT count(*) FROM qc_logs');
      if (parseInt(qcCount.rows[0].count) === 0 && rawData.qcLogs) {
        for (const q of rawData.qcLogs) {
          await pool.query(
            `INSERT INTO qc_logs (id, order_number, machine_id, inspector, sample_size, defect_count, defect_type, status, scrap_weight_kg, recoverable_kg, notes, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO NOTHING`,
            [q.id, q.orderNumber, q.machineId, q.inspector, q.sampleSize || 0, q.defectCount || 0, q.defectType, q.status, q.scrapWeightKg || 0, q.recoverableKg || q.regrindRecoverableKg || 0, q.notes || '', q.timestamp || new Date()]
          );
        }
        console.log(`Seeded QC logs into PostgreSQL.`);
      }

      // Seed Work Orders
      const woCount = await pool.query('SELECT count(*) FROM work_orders');
      if (parseInt(woCount.rows[0].count) === 0 && rawData.workOrders) {
        for (const w of rawData.workOrders) {
          await pool.query(
            `INSERT INTO work_orders (id, order_number, client_name, product_id, product_name, target_quantity, completed_quantity, machine_id, start_date, target_date, status, priority, dispatch_details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO NOTHING`,
            [
              w.id,
              w.orderNumber,
              w.clientName,
              w.productId,
              w.productName,
              w.targetQuantity || 0,
              w.completedQuantity || 0,
              w.machineId || w.assignedMachine || 'ENGEL-180',
              w.startDate || new Date().toISOString().split('T')[0],
              w.targetDate,
              w.status || 'In Production',
              w.priority || 'Medium',
              w.dispatchDetails ? JSON.stringify(w.dispatchDetails) : null
            ]
          );
        }
        console.log(`Seeded work orders into PostgreSQL.`);
      }

      // Seed Maintenance Tickets
      const tktCount = await pool.query('SELECT count(*) FROM maintenance_tickets');
      if (parseInt(tktCount.rows[0].count) === 0 && rawData.maintenanceTickets) {
        for (const t of rawData.maintenanceTickets) {
          await pool.query(
            `INSERT INTO maintenance_tickets (id, ticket_number, title, equipment_type, equipment_id, issue, priority, status, technician, downtime_minutes, details, logged_at, resolved_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO NOTHING`,
            [
              t.id,
              t.ticketNumber || t.id.toUpperCase(),
              t.title || '',
              t.equipmentType || t.category || 'Machine',
              t.equipmentId || t.targetItem || 'N/A',
              t.issue || t.title || 'Service required',
              t.priority || 'Medium',
              t.status || 'Open',
              t.technician || 'Maintenance Team',
              t.downtimeMinutes || 0,
              t.details || '',
              t.loggedAt || t.reportedDate || new Date(),
              t.resolvedAt || null
            ]
          );
        }
        console.log(`Seeded maintenance tickets into PostgreSQL.`);
      }

      // Seed Employees
      const empCount = await pool.query('SELECT count(*) FROM employees');
      if (parseInt(empCount.rows[0].count) === 0 && rawData.employees) {
        for (const e of rawData.employees) {
          await pool.query(
            `INSERT INTO employees (id, emp_code, name, role, department, shift, monthly_salary, phone, joined_date, status, payment_method, account_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO NOTHING`,
            [e.id, e.empCode, e.name, e.role, e.department, e.shift, e.monthlySalary || 0, e.phone, e.joinedDate, e.status, e.paymentMethod || 'Bank Transfer', e.accountNumber || '']
          );
        }
        console.log(`Seeded employees into PostgreSQL.`);
      }

      // Seed Payrolls
      const payCount = await pool.query('SELECT count(*) FROM payrolls');
      if (parseInt(payCount.rows[0].count) === 0 && rawData.payrolls) {
        for (const p of rawData.payrolls) {
          await pool.query(
            `INSERT INTO payrolls (id, employee_id, employee_name, emp_code, role, department, month, base_salary, allowances, deductions, net_salary, payment_method, payment_status, disbursed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (id) DO NOTHING`,
            [p.id, p.employeeId, p.employeeName, p.empCode, p.role, p.department, p.month, p.baseSalary, p.allowances || 0, p.deductions || 0, p.netSalary, p.paymentMethod, p.paymentStatus, p.disbursedAt || null]
          );
        }
        console.log(`Seeded payrolls into PostgreSQL.`);
      }
    }

    console.log('PostgreSQL database initialization and seeding completed successfully!');
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initializeSchemaAndSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeSchemaAndSeed };
