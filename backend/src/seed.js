const bcrypt = require('bcryptjs');
const pool = require('./db');

if(process.env.NODE_ENV==='production'||process.env.ALLOW_DESTRUCTIVE_DEMO_SEED!=='true'){console.error('Refusing destructive demo seed outside an explicitly enabled non-production environment.');process.exit(2);}
async function seed() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const demoPassword = process.env.SEED_DEMO_PASSWORD || '';
  const tenantId = (process.env.TENANT_ID || '').trim();
  if (!adminEmail || !tenantId || demoPassword.length < 12) throw new Error('Seed admin email, tenant, and a 12+ character password are required');
  console.log('🌱 Seeding database...\n');

  // Only clear data for fresh seed, keep structure
  await pool.query(`
    TRUNCATE TABLE sales, cash_records, alerts, maintenance, pricing_rules, planograms,
      inventory, routes, products, machines, users RESTART IDENTITY CASCADE;
  `).catch(() => console.log('Tables may not exist yet, creating...'));

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      endpoint VARCHAR(100),
      input_data JSONB,
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS maintenance_predictions (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
      failure_probability FLOAT,
      components_at_risk JSONB,
      recommended_action TEXT,
      urgency VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'operator',
      tenant_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS machines (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(500) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      capacity INTEGER DEFAULT 40,
      model_type VARCHAR(100) DEFAULT 'Standard',
      lat DECIMAL(10,6) DEFAULT 0,
      lng DECIMAL(10,6) DEFAULT 0,
      last_serviced TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2) NOT NULL,
      barcode VARCHAR(50),
      supplier VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 0,
      max_quantity INTEGER DEFAULT 20,
      slot_number VARCHAR(10),
      last_restocked TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS planograms (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      config JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pricing_rules (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
      base_price DECIMAL(10,2) NOT NULL,
      current_price DECIMAL(10,2) NOT NULL,
      rule_type VARCHAR(50) DEFAULT 'standard',
      parameters JSONB DEFAULT '{}',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      driver VARCHAR(255),
      route_date DATE,
      status VARCHAR(50) DEFAULT 'planned',
      machines_list JSONB DEFAULT '[]',
      estimated_time DECIMAL(5,2),
      distance DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cash_records (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
      record_date DATE DEFAULT CURRENT_DATE,
      expected_amount DECIMAL(10,2),
      actual_amount DECIMAL(10,2),
      variance DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'cash',
      sold_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      severity VARCHAR(50) DEFAULT 'info',
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'scheduled',
      scheduled_date DATE,
      completed_date DATE,
      cost DECIMAL(10,2),
      technician VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ Tables created');

  // Seed Users
  const hashedPassword = await bcrypt.hash(demoPassword, 12);
  await pool.query(`
    INSERT INTO users (email, password, name, role, tenant_id) VALUES
    ($1, $2, 'Admin User', 'admin', $3),
    ('operator@vendingnet.invalid', $2, 'John Operator', 'operator', $3),
    ('manager@vendingnet.invalid', $2, 'Sarah Manager', 'manager', $3)
  `, [adminEmail, hashedPassword, tenantId]);
  console.log('✅ Users seeded');

  // Seed Machines (18 machines)
  await pool.query(`
    INSERT INTO machines (name, location, status, capacity, model_type, lat, lng, last_serviced) VALUES
    ('VM-001 Downtown', '123 Main St, Downtown Plaza', 'active', 45, 'Combo Deluxe', 40.7128, -74.0060, NOW() - INTERVAL '3 days'),
    ('VM-002 Airport T1', 'Airport Terminal 1, Gate A', 'active', 60, 'Premium XL', 40.6413, -73.7781, NOW() - INTERVAL '1 day'),
    ('VM-003 Hospital', 'City General Hospital, Lobby', 'active', 40, 'Health Focus', 40.7282, -73.9942, NOW() - INTERVAL '5 days'),
    ('VM-004 University', 'State University, Student Center', 'active', 50, 'Combo Deluxe', 40.7295, -73.9965, NOW() - INTERVAL '2 days'),
    ('VM-005 Mall East', 'Eastside Mall, Food Court', 'active', 55, 'Premium XL', 40.7484, -73.9857, NOW() - INTERVAL '4 days'),
    ('VM-006 Office Tower', '500 Business Ave, Floor 1', 'active', 40, 'Standard', 40.7527, -73.9772, NOW() - INTERVAL '6 days'),
    ('VM-007 Train Station', 'Central Station, Platform 3', 'active', 45, 'Combo Deluxe', 40.7527, -73.9772, NOW() - INTERVAL '1 day'),
    ('VM-008 Gym', 'FitLife Gym, Entrance', 'active', 35, 'Health Focus', 40.7589, -73.9851, NOW() - INTERVAL '3 days'),
    ('VM-009 Park', 'Central Park, South Entrance', 'active', 30, 'Outdoor Rugged', 40.7649, -73.9740, NOW() - INTERVAL '7 days'),
    ('VM-010 Library', 'City Public Library, 2nd Floor', 'active', 35, 'Quiet Model', 40.7532, -73.9823, NOW() - INTERVAL '4 days'),
    ('VM-011 Factory', 'Industrial Zone, Factory #3', 'active', 50, 'Heavy Duty', 40.7075, -74.0113, NOW() - INTERVAL '2 days'),
    ('VM-012 Hotel', 'Grand Hotel, Pool Area', 'active', 40, 'Premium XL', 40.7580, -73.9855, NOW() - INTERVAL '5 days'),
    ('VM-013 School', 'Lincoln High School, Cafeteria', 'active', 45, 'Standard', 40.7430, -73.9900, NOW() - INTERVAL '3 days'),
    ('VM-014 Beach', 'Rockaway Beach, Boardwalk', 'maintenance', 30, 'Outdoor Rugged', 40.5834, -73.8168, NOW() - INTERVAL '10 days'),
    ('VM-015 Cinema', 'Megaplex Cinema, Lobby', 'active', 50, 'Combo Deluxe', 40.7560, -73.9870, NOW() - INTERVAL '2 days'),
    ('VM-016 Laundromat', 'Clean & Fresh Laundry', 'active', 25, 'Compact', 40.7200, -73.9950, NOW() - INTERVAL '8 days'),
    ('VM-017 Gas Station', 'QuickStop Gas, Highway 95', 'active', 40, 'Outdoor Rugged', 40.6900, -74.0200, NOW() - INTERVAL '1 day'),
    ('VM-018 Co-working', 'WeWork Hub, 3rd Floor', 'inactive', 35, 'Standard', 40.7400, -73.9900, NOW() - INTERVAL '15 days')
  `);
  console.log('✅ Machines seeded (18)');

  // Seed Products (20 products)
  await pool.query(`
    INSERT INTO products (name, category, price, cost, barcode, supplier) VALUES
    ('Coca-Cola Classic', 'Beverages', 2.50, 0.85, 'BEV001', 'Coca-Cola Co.'),
    ('Pepsi', 'Beverages', 2.50, 0.80, 'BEV002', 'PepsiCo'),
    ('Mountain Dew', 'Beverages', 2.50, 0.80, 'BEV003', 'PepsiCo'),
    ('Dasani Water', 'Beverages', 1.75, 0.40, 'BEV004', 'Coca-Cola Co.'),
    ('Red Bull Energy', 'Energy Drinks', 3.50, 1.50, 'ENG001', 'Red Bull GmbH'),
    ('Monster Energy', 'Energy Drinks', 3.25, 1.40, 'ENG002', 'Monster Beverage'),
    ('Lays Classic Chips', 'Snacks', 2.00, 0.65, 'SNK001', 'Frito-Lay'),
    ('Doritos Nacho', 'Snacks', 2.25, 0.70, 'SNK002', 'Frito-Lay'),
    ('Snickers Bar', 'Candy', 1.75, 0.55, 'CND001', 'Mars Inc.'),
    ('Kit Kat', 'Candy', 1.75, 0.50, 'CND002', 'Nestle'),
    ('M&Ms Peanut', 'Candy', 2.00, 0.60, 'CND003', 'Mars Inc.'),
    ('Granola Bar', 'Healthy', 2.50, 0.90, 'HLT001', 'Nature Valley'),
    ('Trail Mix', 'Healthy', 3.00, 1.10, 'HLT002', 'Planters'),
    ('Protein Bar', 'Healthy', 3.50, 1.30, 'HLT003', 'Clif Bar'),
    ('Gatorade Blue', 'Sports Drinks', 2.75, 0.95, 'SPT001', 'PepsiCo'),
    ('Coffee - Black', 'Hot Beverages', 2.00, 0.45, 'HOT001', 'Nescafe'),
    ('Hot Chocolate', 'Hot Beverages', 2.25, 0.55, 'HOT002', 'Swiss Miss'),
    ('Pringles Original', 'Snacks', 2.50, 0.80, 'SNK003', 'Kelloggs'),
    ('Twix Bar', 'Candy', 1.75, 0.55, 'CND004', 'Mars Inc.'),
    ('Smartwater', 'Beverages', 2.25, 0.60, 'BEV005', 'Coca-Cola Co.')
  `);
  console.log('✅ Products seeded (20)');

  // Seed Inventory (40+ records across machines)
  await pool.query(`
    INSERT INTO inventory (machine_id, product_id, quantity, max_quantity, slot_number, last_restocked) VALUES
    (1, 1, 8, 15, 'A1', NOW() - INTERVAL '2 days'),
    (1, 4, 3, 12, 'A2', NOW() - INTERVAL '3 days'),
    (1, 7, 12, 15, 'B1', NOW() - INTERVAL '1 day'),
    (1, 9, 5, 10, 'B2', NOW() - INTERVAL '4 days'),
    (2, 1, 2, 20, 'A1', NOW() - INTERVAL '5 days'),
    (2, 5, 6, 15, 'A2', NOW() - INTERVAL '2 days'),
    (2, 12, 14, 15, 'B1', NOW() - INTERVAL '1 day'),
    (2, 15, 1, 12, 'B2', NOW() - INTERVAL '6 days'),
    (3, 4, 10, 15, 'A1', NOW() - INTERVAL '1 day'),
    (3, 12, 3, 10, 'A2', NOW() - INTERVAL '4 days'),
    (3, 13, 8, 12, 'B1', NOW() - INTERVAL '2 days'),
    (3, 14, 2, 10, 'B2', NOW() - INTERVAL '5 days'),
    (4, 1, 4, 15, 'A1', NOW() - INTERVAL '3 days'),
    (4, 3, 7, 15, 'A2', NOW() - INTERVAL '2 days'),
    (4, 6, 11, 15, 'B1', NOW() - INTERVAL '1 day'),
    (4, 8, 1, 10, 'B2', NOW() - INTERVAL '7 days'),
    (5, 2, 9, 20, 'A1', NOW() - INTERVAL '1 day'),
    (5, 5, 5, 15, 'A2', NOW() - INTERVAL '3 days'),
    (5, 10, 13, 15, 'B1', NOW() - INTERVAL '2 days'),
    (5, 18, 2, 12, 'B2', NOW() - INTERVAL '5 days'),
    (6, 16, 6, 10, 'A1', NOW() - INTERVAL '2 days'),
    (6, 4, 8, 12, 'A2', NOW() - INTERVAL '1 day'),
    (6, 12, 3, 10, 'B1', NOW() - INTERVAL '4 days'),
    (7, 1, 0, 15, 'A1', NOW() - INTERVAL '8 days'),
    (7, 2, 4, 15, 'A2', NOW() - INTERVAL '3 days'),
    (7, 7, 7, 12, 'B1', NOW() - INTERVAL '2 days'),
    (8, 14, 9, 12, 'A1', NOW() - INTERVAL '1 day'),
    (8, 15, 5, 10, 'A2', NOW() - INTERVAL '3 days'),
    (8, 4, 11, 15, 'B1', NOW() - INTERVAL '1 day'),
    (9, 4, 1, 15, 'A1', NOW() - INTERVAL '6 days'),
    (9, 15, 3, 12, 'A2', NOW() - INTERVAL '4 days'),
    (10, 16, 7, 10, 'A1', NOW() - INTERVAL '2 days'),
    (10, 17, 4, 8, 'A2', NOW() - INTERVAL '3 days'),
    (11, 1, 6, 20, 'A1', NOW() - INTERVAL '2 days'),
    (11, 5, 2, 15, 'A2', NOW() - INTERVAL '5 days'),
    (11, 6, 8, 15, 'B1', NOW() - INTERVAL '1 day'),
    (12, 20, 10, 12, 'A1', NOW() - INTERVAL '1 day'),
    (12, 14, 4, 10, 'A2', NOW() - INTERVAL '3 days'),
    (13, 1, 5, 15, 'A1', NOW() - INTERVAL '2 days'),
    (13, 7, 3, 12, 'B1', NOW() - INTERVAL '4 days'),
    (15, 2, 12, 20, 'A1', NOW() - INTERVAL '1 day'),
    (15, 8, 6, 15, 'A2', NOW() - INTERVAL '2 days')
  `);
  console.log('✅ Inventory seeded (42)');

  // Seed Sales (50+ records)
  await pool.query(`
    INSERT INTO sales (machine_id, product_id, quantity, amount, payment_method, sold_at) VALUES
    (1, 1, 2, 5.00, 'card', NOW() - INTERVAL '1 day'),
    (1, 1, 1, 2.50, 'cash', NOW() - INTERVAL '2 days'),
    (1, 4, 3, 5.25, 'card', NOW() - INTERVAL '1 day'),
    (1, 7, 1, 2.00, 'cash', NOW() - INTERVAL '3 days'),
    (1, 9, 2, 3.50, 'mobile', NOW() - INTERVAL '1 day'),
    (2, 1, 5, 12.50, 'card', NOW() - INTERVAL '1 day'),
    (2, 5, 3, 10.50, 'card', NOW() - INTERVAL '2 days'),
    (2, 12, 1, 2.50, 'cash', NOW() - INTERVAL '1 day'),
    (2, 15, 4, 11.00, 'mobile', NOW() - INTERVAL '3 days'),
    (3, 4, 2, 3.50, 'card', NOW() - INTERVAL '1 day'),
    (3, 12, 3, 7.50, 'cash', NOW() - INTERVAL '2 days'),
    (3, 14, 2, 7.00, 'card', NOW() - INTERVAL '1 day'),
    (4, 1, 4, 10.00, 'cash', NOW() - INTERVAL '1 day'),
    (4, 3, 2, 5.00, 'card', NOW() - INTERVAL '2 days'),
    (4, 6, 3, 9.75, 'mobile', NOW() - INTERVAL '1 day'),
    (4, 8, 5, 11.25, 'cash', NOW() - INTERVAL '3 days'),
    (5, 2, 3, 7.50, 'card', NOW() - INTERVAL '1 day'),
    (5, 5, 2, 7.00, 'card', NOW() - INTERVAL '2 days'),
    (5, 10, 1, 2.00, 'cash', NOW() - INTERVAL '1 day'),
    (5, 18, 4, 10.00, 'mobile', NOW() - INTERVAL '4 days'),
    (6, 16, 2, 4.00, 'cash', NOW() - INTERVAL '1 day'),
    (6, 4, 1, 1.75, 'card', NOW() - INTERVAL '2 days'),
    (7, 1, 6, 15.00, 'card', NOW() - INTERVAL '1 day'),
    (7, 2, 3, 7.50, 'mobile', NOW() - INTERVAL '2 days'),
    (7, 7, 2, 4.00, 'cash', NOW() - INTERVAL '1 day'),
    (8, 14, 3, 10.50, 'card', NOW() - INTERVAL '1 day'),
    (8, 15, 2, 5.50, 'mobile', NOW() - INTERVAL '2 days'),
    (8, 4, 1, 1.75, 'cash', NOW() - INTERVAL '3 days'),
    (9, 4, 5, 8.75, 'card', NOW() - INTERVAL '1 day'),
    (9, 15, 3, 8.25, 'mobile', NOW() - INTERVAL '2 days'),
    (10, 16, 2, 4.00, 'cash', NOW() - INTERVAL '1 day'),
    (10, 17, 1, 2.25, 'card', NOW() - INTERVAL '3 days'),
    (11, 1, 3, 7.50, 'cash', NOW() - INTERVAL '1 day'),
    (11, 5, 4, 14.00, 'card', NOW() - INTERVAL '2 days'),
    (11, 6, 2, 6.50, 'mobile', NOW() - INTERVAL '1 day'),
    (12, 20, 1, 2.25, 'card', NOW() - INTERVAL '1 day'),
    (12, 14, 2, 7.00, 'cash', NOW() - INTERVAL '2 days'),
    (13, 1, 3, 7.50, 'mobile', NOW() - INTERVAL '1 day'),
    (13, 7, 4, 8.00, 'cash', NOW() - INTERVAL '3 days'),
    (15, 2, 5, 12.50, 'card', NOW() - INTERVAL '1 day'),
    (15, 8, 3, 6.75, 'mobile', NOW() - INTERVAL '2 days'),
    (1, 1, 1, 2.50, 'cash', NOW() - INTERVAL '5 days'),
    (2, 1, 2, 5.00, 'card', NOW() - INTERVAL '5 days'),
    (3, 4, 3, 5.25, 'mobile', NOW() - INTERVAL '5 days'),
    (4, 6, 1, 3.25, 'cash', NOW() - INTERVAL '5 days'),
    (5, 2, 2, 5.00, 'card', NOW() - INTERVAL '5 days'),
    (1, 9, 1, 1.75, 'mobile', NOW() - INTERVAL '7 days'),
    (2, 5, 2, 7.00, 'card', NOW() - INTERVAL '7 days'),
    (4, 1, 3, 7.50, 'cash', NOW() - INTERVAL '7 days'),
    (7, 2, 1, 2.50, 'card', NOW() - INTERVAL '7 days')
  `);
  console.log('✅ Sales seeded (50)');

  // Seed Planograms (16 records)
  await pool.query(`
    INSERT INTO planograms (machine_id, name, config, status) VALUES
    (1, 'Downtown Standard Layout', '{"rows": 4, "cols": 6, "slots": [{"pos": "A1", "product": "Coca-Cola"}, {"pos": "A2", "product": "Water"}]}', 'active'),
    (2, 'Airport Premium Layout', '{"rows": 5, "cols": 8, "slots": [{"pos": "A1", "product": "Red Bull"}, {"pos": "A2", "product": "Granola"}]}', 'active'),
    (3, 'Hospital Healthy Layout', '{"rows": 4, "cols": 5, "slots": [{"pos": "A1", "product": "Water"}, {"pos": "A2", "product": "Trail Mix"}]}', 'active'),
    (4, 'University Mix Layout', '{"rows": 4, "cols": 7, "slots": [{"pos": "A1", "product": "Monster"}, {"pos": "A2", "product": "Doritos"}]}', 'active'),
    (5, 'Mall High-Traffic Layout', '{"rows": 5, "cols": 8, "slots": [{"pos": "A1", "product": "Pepsi"}, {"pos": "A2", "product": "Chips"}]}', 'active'),
    (6, 'Office Morning Layout', '{"rows": 3, "cols": 5, "slots": [{"pos": "A1", "product": "Coffee"}, {"pos": "A2", "product": "Granola"}]}', 'active'),
    (7, 'Station Rush Layout', '{"rows": 4, "cols": 6, "slots": [{"pos": "A1", "product": "Cola"}, {"pos": "A2", "product": "Snickers"}]}', 'active'),
    (8, 'Gym Fitness Layout', '{"rows": 3, "cols": 5, "slots": [{"pos": "A1", "product": "Protein Bar"}, {"pos": "A2", "product": "Gatorade"}]}', 'active'),
    (9, 'Park Outdoor Layout', '{"rows": 3, "cols": 4, "slots": [{"pos": "A1", "product": "Water"}, {"pos": "A2", "product": "Gatorade"}]}', 'draft'),
    (10, 'Library Quiet Layout', '{"rows": 3, "cols": 4, "slots": [{"pos": "A1", "product": "Coffee"}, {"pos": "A2", "product": "Water"}]}', 'active'),
    (11, 'Factory Break Room', '{"rows": 4, "cols": 7, "slots": [{"pos": "A1", "product": "Cola"}, {"pos": "A2", "product": "Monster"}]}', 'active'),
    (12, 'Hotel Luxury Layout', '{"rows": 4, "cols": 5, "slots": [{"pos": "A1", "product": "Smartwater"}, {"pos": "A2", "product": "Trail Mix"}]}', 'active'),
    (13, 'School Cafeteria Layout', '{"rows": 4, "cols": 6, "slots": [{"pos": "A1", "product": "Cola"}, {"pos": "A2", "product": "Chips"}]}', 'draft'),
    (15, 'Cinema Snack Layout', '{"rows": 5, "cols": 7, "slots": [{"pos": "A1", "product": "Pepsi"}, {"pos": "A2", "product": "M&Ms"}]}', 'active'),
    (16, 'Laundromat Basic Layout', '{"rows": 2, "cols": 4, "slots": [{"pos": "A1", "product": "Cola"}, {"pos": "A2", "product": "Chips"}]}', 'active'),
    (17, 'Gas Station Quick Layout', '{"rows": 4, "cols": 5, "slots": [{"pos": "A1", "product": "Red Bull"}, {"pos": "A2", "product": "Snickers"}]}', 'active')
  `);
  console.log('✅ Planograms seeded (16)');

  // Seed Pricing Rules (18 records)
  await pool.query(`
    INSERT INTO pricing_rules (product_id, machine_id, base_price, current_price, rule_type, parameters, active) VALUES
    (1, 1, 2.50, 2.50, 'standard', '{"margin": 0.65}', true),
    (1, 2, 2.50, 3.00, 'location_premium', '{"premium": 0.20, "reason": "Airport markup"}', true),
    (5, 2, 3.50, 4.00, 'location_premium', '{"premium": 0.14, "reason": "Airport markup"}', true),
    (4, 9, 1.75, 2.25, 'demand_surge', '{"multiplier": 1.28, "trigger": "temperature > 85F"}', true),
    (15, 8, 2.75, 3.25, 'demand_surge', '{"multiplier": 1.18, "trigger": "post-workout hours"}', true),
    (1, 4, 2.50, 2.00, 'student_discount', '{"discount": 0.20, "reason": "Student pricing"}', true),
    (7, 15, 2.00, 2.50, 'event_pricing', '{"premium": 0.25, "trigger": "movie premiere"}', true),
    (9, 1, 1.75, 1.75, 'standard', '{"margin": 0.69}', true),
    (12, 3, 2.50, 2.50, 'standard', '{"margin": 0.64}', true),
    (14, 8, 3.50, 3.50, 'standard', '{"margin": 0.63}', true),
    (6, 11, 3.25, 2.75, 'volume_discount', '{"discount": 0.15, "min_daily_sales": 10}', true),
    (16, 6, 2.00, 2.00, 'standard', '{"margin": 0.78}', true),
    (2, 5, 2.50, 2.50, 'standard', '{"margin": 0.68}', true),
    (3, 4, 2.50, 2.25, 'time_based', '{"discount": 0.10, "hours": "14-16", "reason": "Afternoon dip"}', true),
    (5, 11, 3.50, 3.75, 'demand_surge', '{"multiplier": 1.07, "trigger": "shift change"}', true),
    (20, 12, 2.25, 2.75, 'location_premium', '{"premium": 0.22, "reason": "Hotel markup"}', true),
    (8, 13, 2.25, 2.00, 'student_discount', '{"discount": 0.11, "reason": "School pricing"}', false),
    (11, 15, 2.00, 2.50, 'event_pricing', '{"premium": 0.25, "trigger": "weekend screenings"}', true)
  `);
  console.log('✅ Pricing rules seeded (18)');

  // Seed Routes (16 records)
  await pool.query(`
    INSERT INTO routes (name, driver, route_date, status, machines_list, estimated_time, distance) VALUES
    ('Downtown Morning Run', 'Mike Johnson', CURRENT_DATE, 'in_progress', '[1, 6, 10]', 3.5, 12.4),
    ('Airport & Transit', 'Lisa Chen', CURRENT_DATE, 'planned', '[2, 7]', 2.0, 8.7),
    ('Health & Fitness Route', 'Tom Davis', CURRENT_DATE, 'planned', '[3, 8]', 2.5, 15.2),
    ('Education Circuit', 'Amy Wilson', CURRENT_DATE + 1, 'planned', '[4, 13]', 3.0, 18.6),
    ('Mall & Cinema Loop', 'Chris Brown', CURRENT_DATE, 'completed', '[5, 15]', 2.0, 6.3),
    ('Industrial Zone', 'Mike Johnson', CURRENT_DATE + 1, 'planned', '[11, 17]', 4.0, 25.8),
    ('Luxury & Leisure', 'Lisa Chen', CURRENT_DATE + 1, 'planned', '[12, 9]', 3.0, 14.1),
    ('Community Run', 'Tom Davis', CURRENT_DATE + 2, 'planned', '[16, 10]', 2.5, 9.4),
    ('Emergency Restock', 'Chris Brown', CURRENT_DATE, 'in_progress', '[7, 2]', 1.5, 5.2),
    ('Weekend Full Route', 'Amy Wilson', CURRENT_DATE + 3, 'planned', '[1, 2, 3, 4, 5]', 6.0, 35.7),
    ('North District', 'Mike Johnson', CURRENT_DATE + 2, 'planned', '[9, 12, 15]', 4.0, 22.3),
    ('South District', 'Tom Davis', CURRENT_DATE + 2, 'planned', '[11, 14, 17]', 3.5, 19.8),
    ('Express Restock', 'Lisa Chen', CURRENT_DATE + 1, 'planned', '[1, 4, 7]', 2.0, 10.5),
    ('Full Network Audit', 'Chris Brown', CURRENT_DATE + 7, 'planned', '[1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17]', 10.0, 65.0),
    ('Beach Maintenance', 'Tom Davis', CURRENT_DATE + 3, 'planned', '[14]', 2.0, 28.5),
    ('Night Shift Restock', 'Amy Wilson', CURRENT_DATE + 1, 'planned', '[6, 11, 17]', 3.5, 20.1)
  `);
  console.log('✅ Routes seeded (16)');

  // Seed Cash Records (20 records)
  await pool.query(`
    INSERT INTO cash_records (machine_id, record_date, expected_amount, actual_amount, variance, status, notes) VALUES
    (1, CURRENT_DATE - 1, 245.50, 243.75, -1.75, 'reconciled', 'Minor variance - within tolerance'),
    (2, CURRENT_DATE - 1, 520.00, 518.50, -1.50, 'reconciled', 'Acceptable variance'),
    (3, CURRENT_DATE - 1, 180.25, 180.25, 0.00, 'reconciled', 'Perfect match'),
    (4, CURRENT_DATE - 1, 310.75, 308.00, -2.75, 'reconciled', 'Small shortage noted'),
    (5, CURRENT_DATE - 1, 425.00, 430.50, 5.50, 'flagged', 'Overage detected - possible double count'),
    (6, CURRENT_DATE - 1, 155.00, 155.00, 0.00, 'reconciled', 'Perfect match'),
    (7, CURRENT_DATE - 1, 380.25, 365.00, -15.25, 'flagged', 'Significant shortage - review camera footage'),
    (8, CURRENT_DATE - 1, 195.50, 194.75, -0.75, 'reconciled', 'Within tolerance'),
    (9, CURRENT_DATE - 1, 88.00, 86.50, -1.50, 'reconciled', 'Minor variance'),
    (10, CURRENT_DATE - 1, 125.75, 125.75, 0.00, 'reconciled', 'Perfect match'),
    (11, CURRENT_DATE - 2, 290.00, 285.25, -4.75, 'under_review', 'Investigating shortage'),
    (12, CURRENT_DATE - 2, 210.50, 211.00, 0.50, 'reconciled', 'Negligible overage'),
    (13, CURRENT_DATE - 2, 175.00, 172.50, -2.50, 'reconciled', 'Minor shortage'),
    (15, CURRENT_DATE - 2, 345.00, 348.75, 3.75, 'reconciled', 'Slight overage - likely rounding'),
    (1, CURRENT_DATE - 3, 230.00, 228.50, -1.50, 'reconciled', 'Normal variance'),
    (2, CURRENT_DATE - 3, 495.75, 450.00, -45.75, 'flagged', 'Major shortage - maintenance window coincided'),
    (4, CURRENT_DATE - 3, 285.50, 284.00, -1.50, 'reconciled', 'Acceptable'),
    (7, CURRENT_DATE - 3, 360.00, 355.25, -4.75, 'under_review', 'Second consecutive shortage'),
    (5, CURRENT_DATE - 3, 410.25, 410.25, 0.00, 'reconciled', 'Perfect match'),
    (11, CURRENT_DATE - 3, 305.00, 300.50, -4.50, 'reconciled', 'Within extended tolerance for high-volume')
  `);
  console.log('✅ Cash records seeded (20)');

  // Seed Alerts (18 records)
  await pool.query(`
    INSERT INTO alerts (machine_id, type, severity, message, status, created_at) VALUES
    (7, 'low_stock', 'critical', 'Coca-Cola Classic is OUT OF STOCK in slot A1', 'active', NOW() - INTERVAL '2 hours'),
    (9, 'low_stock', 'critical', 'Dasani Water critically low (1 remaining) in slot A1', 'active', NOW() - INTERVAL '3 hours'),
    (2, 'low_stock', 'warning', 'Gatorade Blue low stock (1 remaining) in slot B2', 'active', NOW() - INTERVAL '4 hours'),
    (4, 'low_stock', 'warning', 'Doritos Nacho low stock (1 remaining) in slot B2', 'active', NOW() - INTERVAL '5 hours'),
    (14, 'maintenance', 'critical', 'Machine offline - coin mechanism jammed', 'active', NOW() - INTERVAL '1 day'),
    (18, 'maintenance', 'warning', 'Machine inactive for 15 days - needs inspection', 'active', NOW() - INTERVAL '2 days'),
    (7, 'cash_anomaly', 'warning', 'Cash shortage detected: -$15.25 variance', 'active', NOW() - INTERVAL '1 day'),
    (2, 'cash_anomaly', 'critical', 'Major cash shortage: -$45.75 on 2 days ago', 'active', NOW() - INTERVAL '2 days'),
    (5, 'cash_anomaly', 'info', 'Cash overage detected: +$5.50', 'acknowledged', NOW() - INTERVAL '1 day'),
    (1, 'temperature', 'warning', 'Cooling unit temperature above normal (42°F)', 'active', NOW() - INTERVAL '6 hours'),
    (11, 'connectivity', 'info', 'Brief connectivity loss detected (2 min)', 'resolved', NOW() - INTERVAL '1 day'),
    (3, 'sales_milestone', 'info', 'Hospital machine reached 1000 sales this month', 'acknowledged', NOW() - INTERVAL '12 hours'),
    (6, 'service_due', 'warning', 'Scheduled maintenance overdue by 2 days', 'active', NOW() - INTERVAL '2 days'),
    (16, 'service_due', 'warning', 'Filter replacement needed - last changed 90 days ago', 'active', NOW() - INTERVAL '1 day'),
    (9, 'vandalism', 'critical', 'Possible tampering detected - door sensor triggered', 'active', NOW() - INTERVAL '8 hours'),
    (12, 'performance', 'info', 'Hotel machine sales up 25% this week', 'acknowledged', NOW() - INTERVAL '1 day'),
    (15, 'low_stock', 'warning', 'Multiple products running low - restocking needed', 'active', NOW() - INTERVAL '3 hours'),
    (17, 'connectivity', 'warning', 'Intermittent connection issues detected', 'active', NOW() - INTERVAL '4 hours')
  `);
  console.log('✅ Alerts seeded (18)');

  // Seed Maintenance (18 records)
  await pool.query(`
    INSERT INTO maintenance (machine_id, type, description, status, scheduled_date, completed_date, cost, technician) VALUES
    (1, 'Preventive', 'Quarterly cleaning and inspection', 'completed', CURRENT_DATE - 3, CURRENT_DATE - 3, 85.00, 'Roberto Garcia'),
    (2, 'Repair', 'Card reader replacement', 'completed', CURRENT_DATE - 5, CURRENT_DATE - 4, 250.00, 'Sarah Kim'),
    (3, 'Preventive', 'Sanitization and filter change', 'completed', CURRENT_DATE - 7, CURRENT_DATE - 7, 65.00, 'Roberto Garcia'),
    (4, 'Repair', 'Coin mechanism adjustment', 'completed', CURRENT_DATE - 10, CURRENT_DATE - 9, 120.00, 'Jake Martin'),
    (14, 'Repair', 'Coin mechanism jam - major repair', 'in_progress', CURRENT_DATE - 1, NULL, 350.00, 'Jake Martin'),
    (18, 'Inspection', 'Full diagnostic inspection', 'scheduled', CURRENT_DATE + 2, NULL, 150.00, 'Sarah Kim'),
    (6, 'Preventive', 'Overdue maintenance - cleaning and calibration', 'scheduled', CURRENT_DATE + 1, NULL, 95.00, 'Roberto Garcia'),
    (16, 'Repair', 'Filter replacement', 'scheduled', CURRENT_DATE + 1, NULL, 45.00, 'Jake Martin'),
    (5, 'Preventive', 'Monthly inspection and cleaning', 'scheduled', CURRENT_DATE + 3, NULL, 75.00, 'Roberto Garcia'),
    (7, 'Inspection', 'Cash mechanism audit after shortage', 'scheduled', CURRENT_DATE + 1, NULL, 100.00, 'Sarah Kim'),
    (9, 'Repair', 'Door sensor repair after tampering alert', 'scheduled', CURRENT_DATE, NULL, 175.00, 'Jake Martin'),
    (1, 'Preventive', 'Cooling system maintenance', 'scheduled', CURRENT_DATE + 5, NULL, 110.00, 'Roberto Garcia'),
    (10, 'Preventive', 'Quarterly maintenance', 'completed', CURRENT_DATE - 14, CURRENT_DATE - 14, 75.00, 'Sarah Kim'),
    (11, 'Repair', 'Display screen flickering fix', 'completed', CURRENT_DATE - 8, CURRENT_DATE - 7, 200.00, 'Jake Martin'),
    (12, 'Preventive', 'Deep cleaning and restocking check', 'completed', CURRENT_DATE - 5, CURRENT_DATE - 5, 90.00, 'Roberto Garcia'),
    (15, 'Upgrade', 'Contactless payment module installation', 'completed', CURRENT_DATE - 12, CURRENT_DATE - 11, 450.00, 'Sarah Kim'),
    (17, 'Repair', 'Network card replacement', 'scheduled', CURRENT_DATE + 2, NULL, 180.00, 'Jake Martin'),
    (2, 'Preventive', 'Monthly inspection', 'scheduled', CURRENT_DATE + 7, NULL, 75.00, 'Roberto Garcia')
  `);
  console.log('✅ Maintenance seeded (18)');

  console.log('\n🎉 Database seeding complete!\n');
  console.log('Login credentials:');
  console.log('  Email: admin@vendingnet.com');
  console.log('Demo login users provisioned from the local environment.');

  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
