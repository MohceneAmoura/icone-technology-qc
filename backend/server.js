import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import db, { initDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store connected users (user id → socket id)
const connectedUsers = new Map();

// Initialize database connection
initDatabase().catch(err => {
  console.error('Failed to initialize database. Exiting...', err);
  process.exit(1);
});

// Middleware: JWT Authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalid or expired' });
    }
    req.user = user;
    next();
  });
}

// Middleware: Admin role check
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin permission required' });
  }
  next();
}

// ----------------- AUTH ENDPOINTS -----------------

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userRes = await db.query(`
      SELECT u.*, p.nom, p.prenom, p.age, p.diplome, p.poste, p.entreprise, p.photo 
      FROM users u 
      LEFT JOIN profile p ON u.id = p.user_id 
      WHERE u.username = $1
    `, [username.toLowerCase().trim()]);
    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullname: user.fullname },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullname: user.fullname,
        nom: user.nom,
        prenom: user.prenom,
        age: user.age,
        diplome: user.diplome,
        poste: user.poste,
        entreprise: user.entreprise,
        photo: user.photo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me (Verify current session and get full profile)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query(`
      SELECT u.*, p.nom, p.prenom, p.age, p.diplome, p.poste, p.entreprise, p.photo 
      FROM users u 
      LEFT JOIN profile p ON u.id = p.user_id 
      WHERE u.id = $1
    `, [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullname: user.fullname,
        nom: user.nom,
        prenom: user.prenom,
        age: user.age,
        diplome: user.diplome,
        poste: user.poste,
        entreprise: user.entreprise,
        photo: user.photo
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------- MODEL ENDPOINTS -----------------

// GET /api/models - Get all models with latest evaluation status
app.get('/api/models', authenticateToken, async (req, res) => {
  try {
    // Left join with evaluations to get the latest evaluation info
    const query = `
      SELECT 
        m.id, 
        m.name, 
        m.device_type, 
        m.status as validation_status,
        m.validated_at,
        m.created_at,
        u.fullname as validated_by_name,
        e.id as latest_evaluation_id,
        e.serial_number,
        e.evaluation_date,
        e.score,
        e.status as evaluation_status,
        e.general_notes,
        ue.fullname as evaluator_name
      FROM models m
      LEFT JOIN users u ON m.validated_by = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM evaluations 
        WHERE model_id = m.id 
        ORDER BY evaluation_date DESC 
        LIMIT 1
      ) e ON TRUE
      LEFT JOIN users ue ON e.evaluator_id = ue.id
      ORDER BY m.device_type, m.name
    `;
    const modelsRes = await db.query(query);
    res.json(modelsRes.rows);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// GET /api/checklist/:deviceType - Get checklist items for a device type
app.get('/api/checklist/:deviceType', authenticateToken, async (req, res) => {
  const deviceType = req.params.deviceType;
  try {
    const result = await db.query(`
      SELECT id, item_name, sort_order
      FROM checklist_items
      WHERE device_type = $1 AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [deviceType]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching checklist items:', error);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// GET /api/models/:id/evaluation - Get details of the latest evaluation
app.get('/api/models/:id/evaluation', authenticateToken, async (req, res) => {
  const modelId = req.params.id;

  try {
    // Get latest evaluation for this model
    const evalRes = await db.query(`
      SELECT e.*, u.fullname as evaluator_name 
      FROM evaluations e
      JOIN users u ON e.evaluator_id = u.id
      WHERE e.model_id = $1
      ORDER BY e.evaluation_date DESC
      LIMIT 1
    `, [modelId]);

    if (evalRes.rowCount === 0) {
      return res.status(404).json({ error: 'No evaluations found for this model' });
    }

    const evaluation = evalRes.rows[0];

    // Get item checklist details
    const detailsRes = await db.query(`
      SELECT item_name, status, comments 
      FROM evaluation_details
      WHERE evaluation_id = $1
      ORDER BY id
    `, [evaluation.id]);

    res.json({
      evaluation,
      details: detailsRes.rows
    });
  } catch (error) {
    console.error('Error fetching evaluation details:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation details' });
  }
});

// GET /api/evaluations/:evaluationId - Get details of a specific evaluation by ID
app.get('/api/evaluations/:evaluationId', authenticateToken, async (req, res) => {
  try {
    const evalId = parseInt(req.params.evaluationId);

    // Get evaluation details
    const evalRes = await db.query(`
      SELECT 
        e.*, 
        u.fullname as evaluator_name
      FROM evaluations e
      JOIN users u ON e.evaluator_id = u.id
      WHERE e.id = $1
    `, [evalId]);

    if (evalRes.rowCount === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const evaluation = evalRes.rows[0];

    // Get item checklist details
    const detailsRes = await db.query(`
      SELECT item_name, status, comments 
      FROM evaluation_details
      WHERE evaluation_id = $1
      ORDER BY id
    `, [evaluation.id]);

    res.json({
      evaluation,
      details: detailsRes.rows
    });
  } catch (error) {
    console.error('Error fetching evaluation details:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation details' });
  }
});

// POST /api/models/:id/evaluation - Submit a new evaluation (IT Support)
app.post('/api/models/:id/evaluation', authenticateToken, async (req, res) => {
  const modelId = req.params.id;
  const { serial_number, score, status, items, general_notes } = req.body;

  console.log('📝 Received evaluation request body:', JSON.stringify(req.body, null, 2));

  if (!serial_number || score === undefined || !status || !items) {
    return res.status(400).json({ error: 'Missing required evaluation fields' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify model exists
    const modelCheck = await client.query('SELECT * FROM models WHERE id = $1', [modelId]);
    if (modelCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Model not found' });
    }

    // 2. Insert into evaluations
    console.log('🗄️ Inserting into evaluations table...');
    const evalRes = await client.query(`
      INSERT INTO evaluations (model_id, serial_number, evaluator_id, score, status, general_notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [modelId, serial_number, req.user.id, score, status.toUpperCase(), general_notes]);

    const evaluationId = evalRes.rows[0].id;
    console.log('✅ Evaluation created with ID:', evaluationId);

    // 3. Insert into evaluation_details for each item
    console.log('🗄️ Inserting evaluation_details for', items.length, 'items...');
    for (const [index, item] of items.entries()) {
      console.log(`  - Inserting item ${index + 1}:`, JSON.stringify(item, null, 2));
      await client.query(`
        INSERT INTO evaluation_details (evaluation_id, item_name, status, comments)
        VALUES ($1, $2, $3, $4)
      `, [evaluationId, item.name, item.status, item.comments || '']);
    }

    // 4. Update the model status
    // If IT specialist approves (meaning 100% score / APPROVED status), set status to 'Approved by IT'.
    // Otherwise set to 'Failed'
    const newModelStatus = status.toUpperCase() === 'APPROVED' ? 'Approved by IT' : 'Failed';
    await client.query(`
      UPDATE models 
      SET status = $1, validated_by = NULL, validated_at = NULL 
      WHERE id = $2
    `, [newModelStatus, modelId]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Evaluation saved successfully', evaluationId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving evaluation:', error);
    console.error('❌ Error details:', error.stack);
    res.status(500).json({ error: 'Failed to save evaluation', details: error.message });
  } finally {
    client.release();
  }
});

// POST /api/models - Create new model (Admin)
app.post('/api/models', authenticateToken, requireAdmin, async (req, res) => {
  const { name, device_type } = req.body;
  
  if (!name || !device_type) {
    return res.status(400).json({ error: 'Model name and device type are required' });
  }

  if (!['TV Box', 'Receiver Satellite'].includes(device_type)) {
    return res.status(400).json({ error: 'Invalid device type' });
  }

  try {
    const result = await db.query(`
      INSERT INTO models (name, device_type)
      VALUES ($1, $2)
      RETURNING *
    `, [name.trim(), device_type]);

    res.status(201).json({ message: 'Model created successfully', model: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Model name already exists' });
    }
    console.error('Error creating model:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

// PUT /api/models/:id - Update model (Admin)
app.put('/api/models/:id', authenticateToken, requireAdmin, async (req, res) => {
  const modelId = req.params.id;
  const { name, device_type } = req.body;

  if (!name && !device_type) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    let query = 'UPDATE models SET ';
    const params = [];
    let paramIndex = 1;

    if (name) {
      query += `name = $${paramIndex}, `;
      params.push(name.trim());
      paramIndex++;
    }
    if (device_type) {
      if (!['TV Box', 'Receiver Satellite'].includes(device_type)) {
        return res.status(400).json({ error: 'Invalid device type' });
      }
      query += `device_type = $${paramIndex}, `;
      params.push(device_type);
      paramIndex++;
    }

    // Remove trailing comma
    query = query.slice(0, -2);
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(modelId);

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ message: 'Model updated successfully', model: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Model name already exists' });
    }
    console.error('Error updating model:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

// DELETE /api/models/:id - Delete model (Admin)
app.delete('/api/models/:id', authenticateToken, requireAdmin, async (req, res) => {
  const modelId = req.params.id;

  try {
    const result = await db.query('DELETE FROM models WHERE id = $1 RETURNING *', [modelId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// ----------------- FIRMWARE ENDPOINTS -----------------

// GET /api/firmware - Get all firmware with latest evaluation status
app.get('/api/firmware', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id, 
        f.name, 
        f.version, 
        f.version_date,
        f.machine,
        f.device_type, 
        f.status as validation_status,
        f.validated_at,
        f.created_at,
        u.fullname as validated_by_name,
        fe.id as latest_evaluation_id,
        fe.evaluation_date,
        fe.score,
        fe.status as evaluation_status,
        fe.general_notes,
        ue.fullname as evaluator_name
      FROM firmware f
      LEFT JOIN users u ON f.validated_by = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM firmware_evaluations 
        WHERE firmware_id = f.id 
        ORDER BY evaluation_date DESC 
        LIMIT 1
      ) fe ON TRUE
      LEFT JOIN users ue ON fe.evaluator_id = ue.id
      ORDER BY f.device_type, f.name
    `;
    const firmwareRes = await db.query(query);
    res.json(firmwareRes.rows);
  } catch (error) {
    console.error('Error fetching firmware:', error);
    res.status(500).json({ error: 'Failed to fetch firmware' });
  }
});

// GET /api/firmware/checklist/:deviceType - Get firmware checklist items for a device type
app.get('/api/firmware/checklist/:deviceType', authenticateToken, async (req, res) => {
  const deviceType = req.params.deviceType;
  try {
    const result = await db.query(`
      SELECT id, item_name, sort_order
      FROM checklist_items_firmware
      WHERE device_type = $1 AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [deviceType]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching firmware checklist items:', error);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// GET /api/firmware/:id/evaluation - Get details of the latest firmware evaluation
app.get('/api/firmware/:id/evaluation', authenticateToken, async (req, res) => {
  const firmwareId = req.params.id;

  try {
    const evalRes = await db.query(`
      SELECT fe.*, u.fullname as evaluator_name 
      FROM firmware_evaluations fe
      JOIN users u ON fe.evaluator_id = u.id
      WHERE fe.firmware_id = $1
      ORDER BY fe.evaluation_date DESC
      LIMIT 1
    `, [firmwareId]);

    if (evalRes.rowCount === 0) {
      return res.status(404).json({ error: 'No evaluations found for this firmware' });
    }

    const evaluation = evalRes.rows[0];

    const detailsRes = await db.query(`
      SELECT item_name, status, comments 
      FROM firmware_evaluation_details
      WHERE firmware_evaluation_id = $1
      ORDER BY id
    `, [evaluation.id]);

    res.json({
      evaluation,
      details: detailsRes.rows
    });
  } catch (error) {
    console.error('Error fetching firmware evaluation details:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation details' });
  }
});

// GET /api/firmware/evaluations/:evaluationId - Get details of a specific firmware evaluation by ID
app.get('/api/firmware/evaluations/:evaluationId', authenticateToken, async (req, res) => {
  try {
    const evalId = parseInt(req.params.evaluationId);

    const evalRes = await db.query(`
      SELECT 
        fe.*, 
        u.fullname as evaluator_name
      FROM firmware_evaluations fe
      JOIN users u ON fe.evaluator_id = u.id
      WHERE fe.id = $1
    `, [evalId]);

    if (evalRes.rowCount === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const evaluation = evalRes.rows[0];

    const detailsRes = await db.query(`
      SELECT item_name, status, comments 
      FROM firmware_evaluation_details
      WHERE firmware_evaluation_id = $1
      ORDER BY id
    `, [evaluation.id]);

    res.json({
      evaluation,
      details: detailsRes.rows
    });
  } catch (error) {
    console.error('Error fetching firmware evaluation details:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation details' });
  }
});

// POST /api/firmware/:id/evaluation - Submit a new firmware evaluation (IT Support)
app.post('/api/firmware/:id/evaluation', authenticateToken, async (req, res) => {
  const firmwareId = req.params.id;
  const { score, status, items, general_notes } = req.body;

  console.log('📝 Received firmware evaluation request body:', JSON.stringify(req.body, null, 2));

  if (score === undefined || !status || !items) {
    return res.status(400).json({ error: 'Missing required evaluation fields' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify firmware exists
    const firmwareCheck = await client.query('SELECT * FROM firmware WHERE id = $1', [firmwareId]);
    if (firmwareCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Firmware not found' });
    }

    // 2. Insert into firmware_evaluations
    console.log('🗄️ Inserting into firmware_evaluations table...');
    const evalRes = await client.query(`
      INSERT INTO firmware_evaluations (firmware_id, evaluator_id, score, status, general_notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [firmwareId, req.user.id, score, status.toUpperCase(), general_notes]);

    const evaluationId = evalRes.rows[0].id;
    console.log('✅ Firmware evaluation created with ID:', evaluationId);

    // 3. Insert into firmware_evaluation_details for each item
    console.log('🗄️ Inserting firmware_evaluation_details for', items.length, 'items...');
    for (const [index, item] of items.entries()) {
      console.log(`  - Inserting item ${index + 1}:`, JSON.stringify(item, null, 2));
      await client.query(`
        INSERT INTO firmware_evaluation_details (firmware_evaluation_id, item_name, status, comments)
        VALUES ($1, $2, $3, $4)
      `, [evaluationId, item.name, item.status, item.comments || '']);
    }

    // 4. Update the firmware status
    const newFirmwareStatus = status.toUpperCase() === 'APPROVED' ? 'Approved by IT' : 'Failed';
    await client.query(`
      UPDATE firmware 
      SET status = $1, validated_by = NULL, validated_at = NULL 
      WHERE id = $2
    `, [newFirmwareStatus, firmwareId]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Evaluation saved successfully', evaluationId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving firmware evaluation:', error);
    console.error('❌ Error details:', error.stack);
    res.status(500).json({ error: 'Failed to save evaluation', details: error.message });
  } finally {
    client.release();
  }
});

// POST /api/firmware - Create new firmware (Admin)
app.post('/api/firmware', authenticateToken, requireAdmin, async (req, res) => {
  const { name, version, version_date, machine, device_type } = req.body;
  
  if (!name || !version || !machine || !device_type) {
    return res.status(400).json({ error: 'Firmware name, version, machine and device type are required' });
  }

  if (!['TV Box', 'Receiver Satellite'].includes(device_type)) {
    return res.status(400).json({ error: 'Invalid device type' });
  }

  try {
    const result = await db.query(`
      INSERT INTO firmware (name, version, version_date, machine, device_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name.trim(), version.trim(), version_date || null, machine.trim(), device_type]);

    res.status(201).json({ message: 'Firmware created successfully', firmware: result.rows[0] });
  } catch (error) {
    console.error('Error creating firmware:', error);
    res.status(500).json({ error: 'Failed to create firmware' });
  }
});

// PUT /api/firmware/:id - Update firmware (Admin)
app.put('/api/firmware/:id', authenticateToken, requireAdmin, async (req, res) => {
  const firmwareId = req.params.id;
  const { name, version, version_date, machine, device_type } = req.body;

  if (!name && !version && !version_date && !machine && !device_type) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    let query = 'UPDATE firmware SET ';
    const params = [];
    let paramIndex = 1;

    if (name) {
      query += `name = $${paramIndex}, `;
      params.push(name.trim());
      paramIndex++;
    }
    if (version) {
      query += `version = $${paramIndex}, `;
      params.push(version.trim());
      paramIndex++;
    }
    if (version_date !== undefined) {
      query += `version_date = $${paramIndex}, `;
      params.push(version_date || null);
      paramIndex++;
    }
    if (machine) {
      query += `machine = $${paramIndex}, `;
      params.push(machine.trim());
      paramIndex++;
    }
    if (device_type) {
      if (!['TV Box', 'Receiver Satellite'].includes(device_type)) {
        return res.status(400).json({ error: 'Invalid device type' });
      }
      query += `device_type = $${paramIndex}, `;
      params.push(device_type);
      paramIndex++;
    }

    // Remove trailing comma
    query = query.slice(0, -2);
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(firmwareId);

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Firmware not found' });
    }

    res.json({ message: 'Firmware updated successfully', firmware: result.rows[0] });
  } catch (error) {
    console.error('Error updating firmware:', error);
    res.status(500).json({ error: 'Failed to update firmware' });
  }
});

// DELETE /api/firmware/:id - Delete firmware (Admin)
app.delete('/api/firmware/:id', authenticateToken, requireAdmin, async (req, res) => {
  const firmwareId = req.params.id;

  try {
    const result = await db.query('DELETE FROM firmware WHERE id = $1 RETURNING *', [firmwareId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Firmware not found' });
    }

    res.json({ message: 'Firmware deleted successfully' });
  } catch (error) {
    console.error('Error deleting firmware:', error);
    res.status(500).json({ error: 'Failed to delete firmware' });
  }
});

// POST /api/firmware/:id/validate - Admin firmware validation
app.post('/api/firmware/:id/validate', authenticateToken, requireAdmin, async (req, res) => {
  const firmwareId = req.params.id;

  try {
    const firmwareCheck = await db.query('SELECT * FROM firmware WHERE id = $1', [firmwareId]);
    if (firmwareCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Firmware not found' });
    }

    const firmware = firmwareCheck.rows[0];
    if (firmware.status !== 'Approved by IT') {
      return res.status(400).json({ error: 'Firmware cannot be validated. It must be "Approved by IT" first.' });
    }

    await db.query(`
      UPDATE firmware 
      SET status = 'Validated', validated_by = $1, validated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [req.user.id, firmwareId]);

    res.json({ message: 'Firmware validated and approved by Admin successfully' });
  } catch (error) {
    console.error('Error validating firmware:', error);
    res.status(500).json({ error: 'Failed to validate firmware' });
  }
});

// GET /api/firmware/history - Get complete history list of all firmware evaluations
app.get('/api/firmware/history', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        fe.id as evaluation_id,
        fe.firmware_id,
        f.name as firmware_name,
        f.version,
        f.device_type,
        f.status as firmware_status,
        fe.evaluation_date,
        fe.score,
        fe.status as evaluation_status,
        fe.general_notes,
        fe.evaluator_id,
        u.fullname as evaluator_name
      FROM firmware_evaluations fe
      JOIN firmware f ON fe.firmware_id = f.id
      JOIN users u ON fe.evaluator_id = u.id
      ORDER BY fe.evaluation_date DESC
      LIMIT 100
    `;
    const historyRes = await db.query(query);
    
    const historyWithLatest = await Promise.all(historyRes.rows.map(async (log) => {
      const latestCheck = await db.query(`
        SELECT id FROM firmware_evaluations WHERE firmware_id = $1 ORDER BY evaluation_date DESC LIMIT 1
      `, [log.firmware_id]);
      const isLatest = latestCheck.rows[0]?.id === log.evaluation_id;
      return { ...log, is_latest_evaluation: isLatest };
    }));
    
    res.json(historyWithLatest);
  } catch (error) {
    console.error('Error fetching firmware history:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation history' });
  }
});

// DELETE /api/firmware/evaluations/:evaluationId - Delete a firmware evaluation
app.delete('/api/firmware/evaluations/:evaluationId', authenticateToken, async (req, res) => {
  const evaluationId = parseInt(req.params.evaluationId);
  
  try {
    const checkRes = await db.query(`
      SELECT fe.id, fe.evaluator_id, fe.firmware_id
      FROM firmware_evaluations fe
      WHERE fe.id = $1
    `, [evaluationId]);
    
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    const evaluation = checkRes.rows[0];
    
    if (req.user.role !== 'admin' && evaluation.evaluator_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this evaluation' });
    }

    if (req.user.role !== 'admin') {
      const latestCheck = await db.query(`
        SELECT id FROM firmware_evaluations WHERE firmware_id = $1 ORDER BY evaluation_date DESC LIMIT 1
      `, [evaluation.firmware_id]);

      const isLatest = latestCheck.rows[0]?.id === evaluationId;

      if (isLatest) {
        const firmwareCheck = await db.query(`
          SELECT status FROM firmware WHERE id = $1
        `, [evaluation.firmware_id]);

        if (firmwareCheck.rows[0]?.status === 'Validated') {
          return res.status(403).json({ error: 'Cannot delete this evaluation because the firmware has been validated by admin' });
        }
      }
    }
    
    await db.query(`DELETE FROM firmware_evaluations WHERE id = $1`, [evaluationId]);
    
    // Now check if there are any remaining evaluations for this firmware and update status
    const remainingEvaluationsCheck = await db.query(`
      SELECT fe.id, fe.status 
      FROM firmware_evaluations fe
      WHERE fe.firmware_id = $1
      ORDER BY fe.evaluation_date DESC
      LIMIT 1
    `, [evaluation.firmware_id]);
    
    if (remainingEvaluationsCheck.rowCount > 0) {
      // There are remaining evaluations, update to the latest one's status
      const latestEvaluation = remainingEvaluationsCheck.rows[0];
      const newFirmwareStatus = latestEvaluation.status === 'APPROVED' ? 'Approved by IT' : 'Failed';
      await db.query(`
        UPDATE firmware 
        SET status = $1, validated_by = NULL, validated_at = NULL
        WHERE id = $2
      `, [newFirmwareStatus, evaluation.firmware_id]);
    } else {
      // No more evaluations, set back to Pending
      await db.query(`
        UPDATE firmware 
        SET status = 'Pending', validated_by = NULL, validated_at = NULL
        WHERE id = $1
      `, [evaluation.firmware_id]);
    }
    
    res.json({ message: 'Evaluation deleted successfully' });
  } catch (error) {
    console.error('Error deleting firmware evaluation:', error);
    res.status(500).json({ error: 'Failed to delete evaluation' });
  }
});

// ----------------- USER MANAGEMENT ENDPOINTS -----------------

// GET /api/users - Get all users with profile (Admin)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersRes = await db.query(`
      SELECT u.id, u.username, u.fullname, u.role, u.created_at,
             p.nom, p.prenom, p.age, p.diplome, p.poste, p.entreprise, p.photo
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      ORDER BY u.role, u.fullname
    `);
    res.json(usersRes.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/users/:id/profile - Update user profile (Admin or self)
app.put('/api/users/:id/profile', authenticateToken, async (req, res) => {
  // Check if user is admin OR editing their own profile
  if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'You can only edit your own profile' });
  }
  const userId = req.params.id;
  const { nom, prenom, age, diplome, poste, entreprise, photo } = req.body;

  try {
    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if profile exists for user
    const profileCheck = await db.query('SELECT id FROM profile WHERE user_id = $1', [userId]);

    if (profileCheck.rowCount === 0) {
      // Insert new profile
      await db.query(`
        INSERT INTO profile (user_id, nom, prenom, age, diplome, poste, entreprise, photo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [userId, nom, prenom, age, diplome, poste, entreprise, photo]);
    } else {
      // Update existing profile
      await db.query(`
        UPDATE profile
        SET nom = $1, prenom = $2, age = $3, diplome = $4, poste = $5, entreprise = $6, photo = $7
        WHERE user_id = $8
      `, [nom, prenom, age, diplome, poste, entreprise, photo, userId]);
    }

    // Return updated user with profile
    const updatedUserRes = await db.query(`
      SELECT u.id, u.username, u.fullname, u.role, u.created_at,
             p.nom, p.prenom, p.age, p.diplome, p.poste, p.entreprise, p.photo
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE u.id = $1
    `, [userId]);

    res.json({ message: 'User profile updated successfully', user: updatedUserRes.rows[0] });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// POST /api/models/:id/validate - Admin system validation
app.post('/api/models/:id/validate', authenticateToken, requireAdmin, async (req, res) => {
  const modelId = req.params.id;

  try {
    // Verify model has an 'Approved by IT' status
    const modelCheck = await db.query('SELECT * FROM models WHERE id = $1', [modelId]);
    if (modelCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const model = modelCheck.rows[0];
    if (model.status !== 'Approved by IT') {
      return res.status(400).json({ error: 'Model cannot be validated. It must be "Approved by IT" first.' });
    }

    // Update status to 'Validated' and log admin details
    await db.query(`
      UPDATE models 
      SET status = 'Validated', validated_by = $1, validated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [req.user.id, modelId]);

    res.json({ message: 'System validated and approved by Admin successfully' });
  } catch (error) {
    console.error('Error validating system:', error);
    res.status(500).json({ error: 'Failed to validate system' });
  }
});

// ----------------- CHAT ENDPOINTS -----------------

// GET /api/chat/users - Get all users (admin and it_support)
app.get('/api/chat/users', authenticateToken, async (req, res) => {
  try {
    const usersRes = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.fullname, 
        u.role, 
        p.nom, 
        p.prenom, 
        p.age, 
        p.diplome, 
        p.poste, 
        p.entreprise, 
        p.photo
      FROM users u
      LEFT JOIN profile p ON u.id = p.user_id
      ORDER BY u.role, u.fullname
    `);
    res.json(usersRes.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/chat/messages/:otherUserId - Get chat messages between current user and another user
app.get('/api/chat/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const messagesRes = await db.query(`
      SELECT 
        cm.*,
        sender.fullname as sender_name,
        receiver.fullname as receiver_name
      FROM chat_messages cm
      JOIN users sender ON cm.sender_id = sender.id
      JOIN users receiver ON cm.receiver_id = receiver.id
      WHERE 
        (cm.sender_id = $1 AND cm.receiver_id = $2) OR
        (cm.sender_id = $2 AND cm.receiver_id = $1)
      ORDER BY cm.created_at ASC
    `, [req.user.id, parseInt(req.params.otherUserId)]);
    
    // Mark messages as read
    await db.query(`
      UPDATE chat_messages 
      SET is_read = TRUE
      WHERE sender_id = $1 AND receiver_id = $2
    `, [parseInt(req.params.otherUserId), req.user.id]);
    
    res.json(messagesRes.rows);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// POST /api/chat/messages - Send a chat message
app.post('/api/chat/messages', authenticateToken, async (req, res) => {
  const { receiver_id, message } = req.body;
  
  if (!receiver_id || !message) {
    return res.status(400).json({ error: 'Receiver and message are required' });
  }
  
  try {
    console.log(`📤 Sending message from ${req.user.fullname} to user ID ${receiver_id}: "${message}"`);
    const result = await db.query(`
      INSERT INTO chat_messages (sender_id, receiver_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.user.id, receiver_id, message.trim()]);
    
    // Get sender and receiver info
    const fullMessageRes = await db.query(`
      SELECT 
        cm.*,
        sender.fullname as sender_name,
        receiver.fullname as receiver_name
      FROM chat_messages cm
      JOIN users sender ON cm.sender_id = sender.id
      JOIN users receiver ON cm.receiver_id = receiver.id
      WHERE cm.id = $1
    `, [result.rows[0].id]);
    
    console.log('✅ Message saved to database with ID:', result.rows[0].id);
    
    // Emit to receiver if connected
    const receiverSocketId = connectedUsers.get(receiver_id);
    if (receiverSocketId) {
      console.log('📡 Receiver is online, emitting newMessage to socket:', receiverSocketId);
      io.to(receiverSocketId).emit('newMessage', fullMessageRes.rows[0]);
    } else {
      console.log('📡 Receiver is offline, message saved for later');
    }
    
    res.status(201).json({ message: 'Message sent successfully', chatMessage: fullMessageRes.rows[0] });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ----------------- SOCKET.IO HANDLERS -----------------
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Handle user authentication via token
  socket.on('authenticate', async (token) => {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ User authenticated via socket:', user.fullname, user.id);
      connectedUsers.set(user.id, socket.id);
      console.log(`👤 User ${user.fullname} connected (ID: ${user.id})`);
      console.log('📱 Connected users:', Array.from(connectedUsers.keys()));
      
      // Notify other user that this user is online
      socket.broadcast.emit('userOnline', user.id);
    } catch (err) {
      console.error('❌ Socket authentication error:', err.message);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Find and remove disconnected user
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👋 User ID ${userId} disconnected`);
        console.log('📱 Remaining connected users:', Array.from(connectedUsers.keys()));
        socket.broadcast.emit('userOffline', userId);
        break;
      }
    }
  });
});

// ----------------- HISTORY & STATS ENDPOINTS -----------------

// GET /api/history - Get complete history list of all evaluations
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id as evaluation_id,
        e.model_id,
        m.name as model_name,
        m.device_type,
        m.status as model_status,
        e.serial_number,
        e.evaluation_date,
        e.score,
        e.status as evaluation_status,
        e.general_notes,
        e.evaluator_id,
        u.fullname as evaluator_name
      FROM evaluations e
      JOIN models m ON e.model_id = m.id
      JOIN users u ON e.evaluator_id = u.id
      ORDER BY e.evaluation_date DESC
      LIMIT 100
    `;
    const historyRes = await db.query(query);
    
    // For each evaluation, check if it's the latest for its model
    const historyWithLatest = await Promise.all(historyRes.rows.map(async (log) => {
      const latestCheck = await db.query(`
        SELECT id FROM evaluations WHERE model_id = $1 ORDER BY evaluation_date DESC LIMIT 1
      `, [log.model_id]);
      const isLatest = latestCheck.rows[0]?.id === log.evaluation_id;
      return { ...log, is_latest_evaluation: isLatest };
    }));
    
    res.json(historyWithLatest);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation history' });
  }
});

// DELETE /api/evaluations/:evaluationId - Delete an evaluation
app.delete('/api/evaluations/:evaluationId', authenticateToken, async (req, res) => {
  const evaluationId = parseInt(req.params.evaluationId);
  
  try {
    // First check if the evaluation exists and get details
    const checkRes = await db.query(`
      SELECT e.id, e.evaluator_id, e.model_id
      FROM evaluations e
      WHERE e.id = $1
    `, [evaluationId]);
    
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    
    const evaluation = checkRes.rows[0];
    
    // Allow deletion if:
    // 1. User is admin, OR
    // 2. User is the one who created the evaluation
    if (req.user.role !== 'admin' && evaluation.evaluator_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this evaluation' });
    }

    // If user is NOT admin, check if model is validated and it's the latest evaluation
    if (req.user.role !== 'admin') {
      // Check if this evaluation is the latest one for its model
      const latestCheck = await db.query(`
        SELECT id FROM evaluations WHERE model_id = $1 ORDER BY evaluation_date DESC LIMIT 1
      `, [evaluation.model_id]);

      const isLatest = latestCheck.rows[0]?.id === evaluationId;

      if (isLatest) {
        // Check model's status
        const modelCheck = await db.query(`
          SELECT status FROM models WHERE id = $1
        `, [evaluation.model_id]);

        if (modelCheck.rows[0]?.status === 'Validated') {
          return res.status(403).json({ error: 'Cannot delete this evaluation because the model has been validated by admin' });
        }
      }
    }
    
    // Delete the evaluation (evaluation_details will be deleted via CASCADE)
    await db.query(`DELETE FROM evaluations WHERE id = $1`, [evaluationId]);
    
    // Now check if there are any remaining evaluations for this model and update status
    const remainingEvaluationsCheck = await db.query(`
      SELECT e.id, e.status 
      FROM evaluations e
      WHERE e.model_id = $1
      ORDER BY e.evaluation_date DESC
      LIMIT 1
    `, [evaluation.model_id]);
    
    if (remainingEvaluationsCheck.rowCount > 0) {
      // There are remaining evaluations, update to the latest one's status
      const latestEvaluation = remainingEvaluationsCheck.rows[0];
      const newModelStatus = latestEvaluation.status === 'APPROVED' ? 'Approved by IT' : 'Failed';
      await db.query(`
        UPDATE models 
        SET status = $1, validated_by = NULL, validated_at = NULL
        WHERE id = $2
      `, [newModelStatus, evaluation.model_id]);
    } else {
      // No more evaluations, set back to Pending
      await db.query(`
        UPDATE models 
        SET status = 'Pending', validated_by = NULL, validated_at = NULL
        WHERE id = $1
      `, [evaluation.model_id]);
    }
    
    res.json({ message: 'Evaluation deleted successfully' });
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    res.status(500).json({ error: 'Failed to delete evaluation' });
  }
});

// GET /api/stats - Get dashboard statistics
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    // 1. Total models
    const modelsCount = await db.query('SELECT COUNT(*) FROM models');
    
    // 2. Models by status
    const statusCount = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'Approved by IT') as approved_by_it,
        COUNT(*) FILTER (WHERE status = 'Validated') as validated,
        COUNT(*) FILTER (WHERE status = 'Failed') as failed
      FROM models
    `);

    // 3. Evaluations count & averages
    const evalStats = await db.query(`
      SELECT 
        COUNT(*) as total_evaluations,
        AVG(score) as average_score,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count
      FROM evaluations
    `);

    const stats = {
      totalModels: parseInt(modelsCount.rows[0].count),
      pending: parseInt(statusCount.rows[0].pending || 0),
      approvedByIT: parseInt(statusCount.rows[0].approved_by_it || 0),
      validated: parseInt(statusCount.rows[0].validated || 0),
      failed: parseInt(statusCount.rows[0].failed || 0),
      totalEvaluations: parseInt(evalStats.rows[0].total_evaluations || 0),
      averageScore: parseFloat(evalStats.rows[0].average_score || 0).toFixed(1),
      approvedCount: parseInt(evalStats.rows[0].approved_count || 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ----------------- START SERVER -----------------
server.listen(PORT, () => {
  console.log(`🚀 Icone Technology QC Server running on port ${PORT}`);
  console.log(`🔌 Socket.io server also running on port ${PORT}`);
});
