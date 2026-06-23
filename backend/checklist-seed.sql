-- Seed checklist items for TV Box
INSERT INTO checklist_items (item_name, device_type, sort_order) VALUES
('Software', 'TV Box', 1),
('Hardware', 'TV Box', 2),
('Interface', 'TV Box', 3),
('Power Supply Unit', 'TV Box', 4),
('HDMI', 'TV Box', 5),
('Batterie', 'TV Box', 6),
('Bluetooth Voice Remote', 'TV Box', 7),
('WiFi', 'TV Box', 8),
('LAN', 'TV Box', 9),
('USB 2.0', 'TV Box', 10),
('USB 3.0', 'TV Box', 11),
('TF Card', 'TV Box', 12)
ON CONFLICT DO NOTHING;

-- Seed checklist items for Receiver Satellite
INSERT INTO checklist_items (item_name, device_type, sort_order) VALUES
('Software', 'Receiver Satellite', 1),
('Interface', 'Receiver Satellite', 2),
('Hardware', 'Receiver Satellite', 3),
('HDMI', 'Receiver Satellite', 4),
('USB', 'Receiver Satellite', 5),
('Power Supply', 'Receiver Satellite', 6),
('AV', 'Receiver Satellite', 7),
('LNB IN', 'Receiver Satellite', 8),
('Display IR', 'Receiver Satellite', 9),
('WiFi', 'Receiver Satellite', 10),
('IPTV', 'Receiver Satellite', 11),
('Upgrade Online', 'Receiver Satellite', 12)
ON CONFLICT DO NOTHING;
