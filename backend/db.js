import pg from 'pg';
import fs from 'fs';
import path from 'path';
import fileURLToPath from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connection configurations - support both individual variables and DATABASE_URL
let dbConfig;
if (process.env.DATABASE_URL) {
  // Use DATABASE_URL (for Render, Supabase, etc.)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} else {
  // Use individual variables (for local development)
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'Mohcene',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'Icone',
  };
}

// Create a pool for the application database
let pool = new Pool(dbConfig);

// Get current directory
const __filename = fileURLToPath.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase() {
  console.log('🔄 Checking database connection and initializing schema...');
  
  try {
    const client = await pool.connect();
    console.log('🔌 Successfully connected to PostgreSQL database:', dbConfig.database);
    
    // Check if tables already exist, if not, initialize them
    const tablesCheck = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'
    `);
    
    if (tablesCheck.rowCount === 0) {
      console.log('📄 Database schema not found. Initializing schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Schema initialized successfully.');
      
      console.log('🌱 Seeding models data from seed.sql...');
      const seedPath = path.join(__dirname, 'seed.sql');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('✅ Models seeded successfully.');

      console.log('🌱 Seeding checklist items from checklist-seed.sql...');
      const checklistSeedPath = path.join(__dirname, 'checklist-seed.sql');
      const checklistSeedSql = fs.readFileSync(checklistSeedPath, 'utf8');
      await client.query(checklistSeedSql);
      console.log('✅ Checklist items seeded successfully.');
    } else {
      console.log('📁 Database schema already initialized.');
      
      // Check if chat_messages table exists, if not, create it
      const chatTableCheck = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages'
      `);
      if (chatTableCheck.rowCount === 0) {
        console.log('📄 Creating chat_messages table...');
        await client.query(`
          CREATE TABLE chat_messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ chat_messages table created successfully.');
      }

      // Check if checklist_items table exists, if not, create and seed it
      const checklistTableCheck = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checklist_items'
      `);
      if (checklistTableCheck.rowCount === 0) {
        console.log('📄 Creating checklist_items table...');
        await client.query(`
          CREATE TABLE checklist_items (
            id SERIAL PRIMARY KEY,
            item_name VARCHAR(255) NOT NULL,
            device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('TV Box', 'Receiver Satellite')),
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ checklist_items table created.');

        console.log('🌱 Seeding checklist items...');
        const checklistSeedPath = path.join(__dirname, 'checklist-seed.sql');
        const checklistSeedSql = fs.readFileSync(checklistSeedPath, 'utf8');
        await client.query(checklistSeedSql);
        console.log('✅ Checklist items seeded successfully.');
      } else {
        // If table exists, check if we have items, if not, seed them
        const checklistCount = await client.query('SELECT COUNT(*) FROM checklist_items');
        if (parseInt(checklistCount.rows[0].count) === 0) {
          console.log('🌱 Seeding checklist items...');
          const checklistSeedPath = path.join(__dirname, 'checklist-seed.sql');
          const checklistSeedSql = fs.readFileSync(checklistSeedPath, 'utf8');
          await client.query(checklistSeedSql);
          console.log('✅ Checklist items seeded successfully.');
        }
      }

      // Check if evaluation_details has checklist_item_id column, if not, add it
      console.log('🔍 Checking for checklist_item_id column in evaluation_details...');
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'evaluation_details' AND column_name = 'checklist_item_id'
      `);
      
      if (columnCheck.rowCount === 0) {
        console.log('➕ Adding checklist_item_id column to evaluation_details...');
        await client.query(`
          ALTER TABLE evaluation_details 
          ADD COLUMN IF NOT EXISTS checklist_item_id INTEGER REFERENCES checklist_items(id) ON DELETE SET NULL
        `);
        console.log('✅ checklist_item_id column added!');
      }

      // Check if profile table exists, if not create it
      console.log('🔍 Checking for profile table...');
      const profileTableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'profile'
      `);
      
      if (profileTableCheck.rowCount === 0) {
        console.log('➕ Creating profile table...');
        await client.query(`
          CREATE TABLE profile (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
            nom VARCHAR(100),
            prenom VARCHAR(100),
            age INTEGER,
            diplome VARCHAR(255),
            poste VARCHAR(255),
            entreprise VARCHAR(255),
            photo VARCHAR(255)
          )
        `);
        console.log('✅ Profile table created!');
      }

      // Update Mohcene's profile (upsert)
      console.log('🔄 Updating user profiles...');
      
      // First get Mohcene's user id
      const mohceneRes = await client.query('SELECT id FROM users WHERE username = $1', ['mohcene']);
      if (mohceneRes.rowCount > 0) {
        const mohceneId = mohceneRes.rows[0].id;
        
        // Check if profile exists for Mohcene
        const existingProfile = await client.query('SELECT id FROM profile WHERE user_id = $1', [mohceneId]);
        
        if (existingProfile.rowCount === 0) {
          // Insert new profile
          await client.query(`
            INSERT INTO profile (user_id, nom, prenom, age, diplome, poste, entreprise, photo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            mohceneId, 'Amoura', 'Mohcene', 24, 'Master Système informatique', 'IT Support Specialist', 'Icone Technology', '/profile.jpg'
          ]);
        } else {
          // Update existing profile
          await client.query(`
            UPDATE profile 
            SET nom = $1, prenom = $2, age = $3, diplome = $4, poste = $5, entreprise = $6, photo = $7
            WHERE user_id = $8
          `, [
            'Amoura', 'Mohcene', 24, 'Master Système informatique', 'IT Support Specialist', 'Icone Technology', '/profile.jpg', mohceneId
          ]);
        }
        
        console.log('✅ User profiles updated!');
      }

      // Check for firmware-related tables
      console.log('🔍 Checking for firmware tables...');
      
      // Check checklist_items_firmware
      const checklistFirmwareCheck = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checklist_items_firmware'
      `);
      if (checklistFirmwareCheck.rowCount === 0) {
        console.log('📄 Creating checklist_items_firmware table...');
        await client.query(`
          CREATE TABLE checklist_items_firmware (
            id SERIAL PRIMARY KEY,
            item_name VARCHAR(255) NOT NULL,
            device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('TV Box', 'Receiver Satellite')),
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ checklist_items_firmware created successfully!');
      }

      // Check firmware
      const firmwareTableCheck = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'firmware'
      `);
      if (firmwareTableCheck.rowCount === 0) {
        console.log('📄 Creating firmware table...');
        await client.query(`
          CREATE TABLE firmware (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            version VARCHAR(100) NOT NULL,
            version_date DATE,
            machine VARCHAR(255) NOT NULL,
            device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('TV Box', 'Receiver Satellite')),
            status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved by IT', 'Validated', 'Failed')),
            validated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            validated_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ firmware table created successfully!');
      }

      // Check firmware_evaluations
      const firmwareEvalCheck = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'firmware_evaluations'
      `);
      if (firmwareEvalCheck.rowCount === 0) {
        console.log('📄 Creating firmware_evaluations table...');
        await client.query(`
          CREATE TABLE firmware_evaluations (
            id SERIAL PRIMARY KEY,
            firmware_id INTEGER REFERENCES firmware(id) ON DELETE CASCADE,
            evaluator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            score NUMERIC(5, 2) NOT NULL,
            status VARCHAR(20) NOT NULL CHECK (status IN ('APPROVED', 'NOT APPROVED')),
            general_notes TEXT
          )
        `);
        console.log('✅ firmware_evaluations table created successfully!');
      }

      // Check firmware_evaluation_details
      const firmwareEvalDetailsCheck = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'firmware_evaluation_details'
      `);
      if (firmwareEvalDetailsCheck.rowCount === 0) {
        console.log('📄 Creating firmware_evaluation_details table...');
        await client.query(`
          CREATE TABLE firmware_evaluation_details (
            id SERIAL PRIMARY KEY,
            firmware_evaluation_id INTEGER REFERENCES firmware_evaluations(id) ON DELETE CASCADE,
            checklist_item_id INTEGER REFERENCES checklist_items_firmware(id) ON DELETE SET NULL,
            item_name VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL CHECK (status IN ('Approved', 'Pending', 'Not Approved')),
            comments TEXT
          )
        `);
        console.log('✅ firmware_evaluation_details table created successfully!');
      }

      // Seed firmware checklist items
      const checklistFirmwareCount = await client.query('SELECT COUNT(*) FROM checklist_items_firmware');
      if (parseInt(checklistFirmwareCount.rows[0].count) === 0) {
        console.log('🌱 Seeding firmware checklist items...');
        const checklistFirmwareSeedPath = path.join(__dirname, 'checklist-firmware-seed.sql');
        const checklistFirmwareSeedSql = fs.readFileSync(checklistFirmwareSeedPath, 'utf8');
        await client.query(checklistFirmwareSeedSql);
        console.log('✅ Firmware checklist items seeded successfully!');
      }
    }

    // Ensure default users are seeded
    const usersCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCheck.rows[0].count) === 0) {
      console.log('👤 Seeding default users (admin & mohcene)...');
      
      const adminPass = await bcrypt.hash('admin123', 10);
      const mohcenePass = await bcrypt.hash('mohcene123', 10);

      // Insert users
      await client.query(`
        INSERT INTO users (username, password, role, fullname) VALUES 
        ($1, $2, $3, $4),
        ($5, $6, $7, $8)
        RETURNING id
      `, [
        'admin', adminPass, 'admin', 'System Administrator',
        'mohcene', mohcenePass, 'it_support', 'Mohcene Amoura (IT Support Specialist)'
      ]);
      
      // Get mohcene's id to insert profile
      const mohceneUserRes = await client.query('SELECT id FROM users WHERE username = $1', ['mohcene']);
      if (mohceneUserRes.rowCount > 0) {
        const mohceneId = mohceneUserRes.rows[0].id;
        await client.query(`
          INSERT INTO profile (user_id, nom, prenom, age, diplome, poste, entreprise, photo)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          mohceneId, 'Amoura', 'Mohcene', 24, 'Master Système informatique', 'IT Support Specialist', 'Icone Technology', '/profile.jpg'
        ]);
      }
      
      console.log('✅ Default users created.');
    }

    client.release();
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export default {
  query: (text, params) => pool.query(text, params),
  pool
};
