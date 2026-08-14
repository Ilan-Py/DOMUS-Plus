-- ============================================================
-- DOMUS+ | Script de datos de prueba
-- Codigo por ILAN PITASHNY
-- SOLO para entorno de desarrollo/testing. NO ejecutar en producción.
-- Requiere haber ejecutado 01_schema.sql primero.
-- Passwords en texto plano aquí; en la app se guardan hasheados.
-- ============================================================

USE domus_db;

-- ------------------------------------------------------------
-- USUARIOS (3 — uno por integrante del equipo para pruebas)
-- password real: "Admin123" — hash bcrypt generado externamente
-- ------------------------------------------------------------
INSERT INTO usuario (nombre, apellido, email, password_hash) VALUES
('Ilan',     'Pitashny',          'ilan@domus.test',     '$2b$10$dummyhash.ilan.pitashny.placeholder'),
('Agustina', 'Di Pasquale',       'agus@domus.test',     '$2b$10$dummyhash.agus.dipasquale.placeholder'),
('Alan',     'Acevedo',           'alan@domus.test',     '$2b$10$dummyhash.alan.acevedo.placeholder');

-- ------------------------------------------------------------
-- GRUPOS FAMILIARES (uno por usuario)
-- ------------------------------------------------------------
INSERT INTO grupo_familiar (usuario_id, nombre) VALUES
(1, 'Familia Pitashny'),
(2, 'Familia Di Pasquale'),
(3, 'Familia Acevedo');

-- ------------------------------------------------------------
-- INTEGRANTES
-- grupo 1: 2 integrantes
-- grupo 2: 1 integrante (adulto mayor — cuidado dependiente)
-- ------------------------------------------------------------
INSERT INTO integrante (grupo_id, nombre, apellido, fecha_nacimiento, tipo, observaciones) VALUES
(1, 'Gotenks',    'Pitashny',    '1975-03-12', 'adulto',  'Hipertenso. Medicación diaria.'),
(1, 'Alduin',     'Pitashny',    '2010-07-04', 'menor',   'Esquema de vacunación completo hasta 2022.'),
(2, 'Maximiliano',   'Di Pasquale', '1948-11-28', 'mayor',   'Diabetes tipo 2. Control mensual.');

-- ------------------------------------------------------------
-- MASCOTAS
-- grupo 1: perro y gato
-- grupo 3: solo perro
-- raza NULL en Mishi (campo opcional)
-- ------------------------------------------------------------
INSERT INTO mascota (grupo_id, nombre, especie, raza, fecha_nacimiento) VALUES
(1, 'Rufus',  'Perro', 'Labrador',      '2020-05-15'),
(1, 'Mishi',  'Gato',  NULL,            '2019-09-01'),
(3, 'Bruno',  'Perro', 'Border Collie', '2021-02-20');

-- ------------------------------------------------------------
-- VACUNAS
-- Integrante 1 (Gotenks): antigripal sin proxima_dosis
-- Integrante 2 (Alduin): doble viral con refuerzo
-- Mascota 1 (Rufus): antirrábica con refuerzo
-- ------------------------------------------------------------
INSERT INTO vacuna (integrante_id, mascota_id, nombre, fecha_aplicacion, proxima_dosis, notas) VALUES
(1, NULL, 'Antigripal',      '2025-04-10', NULL,         'Aplicada en centro de salud.'),
(2, NULL, 'Doble viral',     '2024-09-01', '2025-09-01', 'Refuerzo anual.'),
(NULL, 1, 'Antirrábica',     '2024-11-15', '2025-11-15', 'Vet: Dr. Gómez.'),
(NULL, 1, 'Séxtuple',        '2024-05-20', '2025-05-20', NULL);

-- ------------------------------------------------------------
-- TRATAMIENTOS
-- Integrante 1 (Gotenks): tratamiento crónico sin fecha_fin
-- Integrante 3 (Maximiliano): insulina sin fecha_fin
-- Mascota 2 (Mishi): antibiótico con fecha_fin
-- ------------------------------------------------------------
INSERT INTO tratamiento (integrante_id, mascota_id, descripcion, medicacion, fecha_inicio, fecha_fin) VALUES
(1, NULL, 'Control de hipertensión',  'Enalapril 10mg — 1 comprimido diario', '2023-01-15', NULL),
(3, NULL, 'Control de glucemia',      'Insulina Glargina 10UI — noche',        '2020-06-01', NULL),
(NULL, 2, 'Infección respiratoria',   'Amoxicilina 50mg/ml — 7 días',          '2025-05-01', '2025-05-08');

-- ------------------------------------------------------------
-- HISTORIAL
-- Eventos de control y consulta médica
-- ------------------------------------------------------------
INSERT INTO historial (integrante_id, mascota_id, evento, fecha, descripcion) VALUES
(1, NULL, 'Control cardiológico',  '2025-03-10', 'Presión: 130/85. Sin novedades.'),
(2, NULL, 'Control pediátrico',    '2025-01-20', 'Peso y talla normales para la edad.'),
(3, NULL, 'Control glucemia',      '2025-04-05', 'Glucosa: 118 mg/dL. Se ajusta dosis.'),
(NULL, 1, 'Control veterinario',   '2025-02-14', 'Desparasitación interna y externa.');

-- ------------------------------------------------------------
-- RECORDATORIOS
-- Algunos vinculados a vacuna/tratamiento, otros independientes
-- ------------------------------------------------------------
INSERT INTO recordatorio (usuario_id, vacuna_id, tratamiento_id, tipo, fecha_hora, descripcion, activo) VALUES
(1, 2,    NULL, 'vacuna',      '2025-09-01 09:00:00', 'Refuerzo doble viral de Alduin',          TRUE),
(1, NULL, 1,    'medicacion',  '2025-06-15 08:00:00', 'Control mensual Enalapril Gotenks',       TRUE),
(2, NULL, 2,    'medicacion',  '2025-06-20 22:00:00', 'Insulina nocturna Maximiliano',              TRUE),
(1, 3,    NULL, 'vacuna',      '2025-11-15 10:00:00', 'Antirrábica anual Rufus',                TRUE),
(3, NULL, NULL, 'control',     '2025-07-01 11:00:00', 'Turno veterinario Bruno — revisión',    TRUE);
