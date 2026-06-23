-- Seed checklist items for TV Box firmware
INSERT INTO checklist_items_firmware (item_name, device_type, sort_order) VALUES
('Firmware Flash Successful', 'TV Box', 1),
('Boot Time', 'TV Box', 2),
('System Stability', 'TV Box', 3),
('UI Responsiveness', 'TV Box', 4),
('Network Connectivity', 'TV Box', 5),
('Audio/Video Quality', 'TV Box', 6),
('Storage Access', 'TV Box', 7),
('OTA Update Functionality', 'TV Box', 8),
('Remote Control Functionality', 'TV Box', 9),
('Language Settings', 'TV Box', 10)
ON CONFLICT DO NOTHING;

-- Seed checklist items for Receiver Satellite firmware
INSERT INTO checklist_items_firmware (item_name, device_type, sort_order) VALUES
('Firmware Flash Successful', 'Receiver Satellite', 1),
('Boot Time', 'Receiver Satellite', 2),
('System Stability', 'Receiver Satellite', 3),
('Signal Reception', 'Receiver Satellite', 4),
('Channel Scanning', 'Receiver Satellite', 5),
('Satellite List', 'Receiver Satellite', 6),
('Network Config', 'Receiver Satellite', 7),
('DiSEqC Mode (DiSEqC 1.0)', 'Receiver Satellite', 5),
('Audio/Video Quality', 'Receiver Satellite', 6),
('IPTV Functionality', 'Receiver Satellite', 7),
('USB Upgrade', 'Receiver Satellite', 8),
('Http Upgrade', 'Receiver Satellite', 9),
('Remote Control Functionality', 'Receiver Satellite', 10),
('Language Settings', 'Receiver Satellite', 11),
('Weather', 'Receiver Satellite', 12),
('Channel Color Switch', 'Receiver Satellite', 13),
('System Stability', 'Receiver Satellite', 14),
('AV Settings', 'Receiver Satellite', 15),
('Timers', 'Receiver Satellite', 16),
('Xcam Setup', 'Receiver Satellite', 17),
('Sky Share', 'Receiver Satellite', 18),
('Sky Share Pro', 'Receiver Satellite', 19),
('Sky Share Max', 'Receiver Satellite', 20),
('Auto Biss', 'Receiver Satellite', 21)
ON CONFLICT DO NOTHING;
