-- Database schema for Icone Technology Quality Control System

-- Drop tables if they exist

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'it_support')),
    fullname VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profile Table
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
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checklist Items Table (for TV Box & Receiver Satellite)
CREATE TABLE checklist_items (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('TV Box', 'Receiver Satellite')),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Models Table (TV Box or Satellite Receiver)
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('TV Box', 'Receiver Satellite')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved by IT', 'Validated', 'Failed')),
    validated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evaluations Table
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    evaluator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score NUMERIC(5, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('APPROVED', 'NOT APPROVED')),
    general_notes TEXT
);

-- Evaluation Details Table (per checklist item)
CREATE TABLE evaluation_details (
    id SERIAL PRIMARY KEY,
    evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
    checklist_item_id INTEGER REFERENCES checklist_items(id) ON DELETE SET NULL,
    item_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Approved', 'Pending', 'Not Approved')),
    comments TEXT
);

-- Firmware Checklist Items Table
CREATE TABLE checklist_items_firmware (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('TV Box', 'Receiver Satellite')),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firmware Table
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
);

-- Firmware Evaluations Table
CREATE TABLE firmware_evaluations (
    id SERIAL PRIMARY KEY,
    firmware_id INTEGER REFERENCES firmware(id) ON DELETE CASCADE,
    evaluator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score NUMERIC(5, 2) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('APPROVED', 'NOT APPROVED')),
    general_notes TEXT
);

-- Firmware Evaluation Details Table
CREATE TABLE firmware_evaluation_details (
    id SERIAL PRIMARY KEY,
    firmware_evaluation_id INTEGER REFERENCES firmware_evaluations(id) ON DELETE CASCADE,
    checklist_item_id INTEGER REFERENCES checklist_items_firmware(id) ON DELETE SET NULL,
    item_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Approved', 'Pending', 'Not Approved')),
    comments TEXT
);
