-- Seeding file for Icone Technology Quality Control System

-- Populate Models
INSERT INTO models (name, device_type, status) VALUES 
('Smart TV Box G-TOW', 'TV Box', 'Pending'),
('Smart TV Box CLIC ', 'TV Box', 'Pending'),
('Demodulateur numerique D20', 'Receiver Satellite', 'Pending'),
('Demodulateur numerique D40', 'Receiver Satellite', 'Pending'),
('Demodulateur numerique T50', 'Receiver Satellite', 'Pending')
ON CONFLICT (name) DO NOTHING;
