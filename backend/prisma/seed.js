// ============================================================
// DOMUS+ | prisma/seed.js
// Datos de prueba para desarrollo y para la demo.
// SOLO para desarrollo/testing. NO ejecutar en producción con datos reales.
// Necesita una base vacía (los emails son únicos). Correr con: npx prisma db seed
//
// Contraseña de todos los usuarios: "Admin123"
//
//   Familias del equipo (una persona cada una, datos mínimos):
//     ilan@domus.test  → Familia Pitashny
//     agus@domus.test  → Familia Di Pasquale
//     alan@domus.test  → Familia Acevedo
//
//   Familias para la demo:
//     laura@domus.test (dueña) + martin@domus.test → Familia Romero
//       5 integrantes de todas las edades, 2 mascotas y datos en todas las secciones
//     pablo@domus.test (dueño) + valeria@domus.test → Familia Herrera
//     sofia@domus.test → sin grupo: para mostrar la invitación con código
//
// Las fechas de recordatorios, vacunas y tratamientos están armadas alrededor
// del día de la presentación: martes 1 de diciembre de 2026 (FECHA_DEMO).
// Ese día hay recordatorios próximos, tratamientos en curso y vacunas por
// vencer. Para otra presentación, cambiar sólo FECHA_DEMO.
// ============================================================

const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ------------------------------------------------------------
// Fechas: todo se cuenta en días desde el día de la presentación
// ------------------------------------------------------------
const FECHA_DEMO = new Date(2026, 11, 1); // martes 1 de diciembre de 2026 (los meses van de 0 a 11)
const HOY = FECHA_DEMO;

// Fecha y hora local `dias` días después de la demo (negativo = antes)
function enDias(dias, hora = '09:00') {
  const [h, m] = hora.split(':').map(Number);
  return new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + dias, h, m, 0, 0);
}

// Fecha sin hora (columnas DATE) `dias` días después de la demo
function diaRelativo(dias) {
  return new Date(Date.UTC(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + dias));
}

// Mismo cálculo que familiaController (MEJ-004): menor < 18 ≤ adulto < 65 ≤ mayor
function tipoSegunEdad(fechaNacimiento) {
  const nacimiento = new Date(fechaNacimiento);
  let edad = HOY.getUTCFullYear() - nacimiento.getUTCFullYear();
  const mes = HOY.getUTCMonth() - nacimiento.getUTCMonth();
  if (mes < 0 || (mes === 0 && HOY.getUTCDate() < nacimiento.getUTCDate())) edad--;
  if (edad < 18) return 'menor';
  if (edad < 65) return 'adulto';
  return 'mayor';
}

function integrante(grupoId, datos) {
  const fechaNacimiento = new Date(datos.fechaNacimiento);
  return prisma.integrante.create({
    data: { grupoId, ...datos, fechaNacimiento, tipo: tipoSegunEdad(fechaNacimiento) }
  });
}

// Serie de recordatorios periódicos (MEJ-005): una fila por repetición
function serie({ grupoId, creadoPor, tipo, descripcion, desdeDias, hora, cadaDias, veces, vacunaId = null, tratamientoId = null }) {
  const serieId = randomUUID();
  return Array.from({ length: veces }, (_, i) => ({
    grupoId, creadoPor, tipo, descripcion, vacunaId, tratamientoId,
    fechaHora: enDias(desdeDias + i * cadaDias, hora),
    serieId, repeticionDias: cadaDias, activo: true
  }));
}

async function main() {
  console.log('Sembrando datos de prueba...');

  const hash = await bcrypt.hash('Admin123', 10);
  const usuario = (nombre, apellido, email) =>
    prisma.usuario.create({ data: { nombre, apellido, email, passwordHash: hash } });

  // ============================================================
  // FAMILIAS DEL EQUIPO (igual que antes, recordatorios con fechas de hoy en adelante)
  // ============================================================
  const ilan = await usuario('Ilan', 'Pitashny', 'ilan@domus.test');
  const agus = await usuario('Agustina', 'Di Pasquale', 'agus@domus.test');
  const alan = await usuario('Alan', 'Acevedo', 'alan@domus.test');

  const grupoPitashny = await prisma.grupoFamiliar.create({
    data: { nombre: 'Familia Pitashny', miembros: { create: { usuarioId: ilan.id, rol: 'dueno' } } }
  });
  const grupoDiPasquale = await prisma.grupoFamiliar.create({
    data: { nombre: 'Familia Di Pasquale', miembros: { create: { usuarioId: agus.id, rol: 'dueno' } } }
  });
  const grupoAcevedo = await prisma.grupoFamiliar.create({
    data: { nombre: 'Familia Acevedo', miembros: { create: { usuarioId: alan.id, rol: 'dueno' } } }
  });

  const gotenks = await integrante(grupoPitashny.id, {
    nombre: 'Gotenks', apellido: 'Pitashny', fechaNacimiento: '1975-03-12',
    observaciones: 'Hipertenso. Medicación diaria.'
  });
  const alduin = await integrante(grupoPitashny.id, {
    nombre: 'Alduin', apellido: 'Pitashny', fechaNacimiento: '2010-07-04',
    observaciones: 'Esquema de vacunación completo hasta 2022.'
  });
  const maxi = await integrante(grupoDiPasquale.id, {
    nombre: 'Maximiliano', apellido: 'Di Pasquale', fechaNacimiento: '1948-11-28',
    observaciones: 'Diabetes tipo 2. Control mensual.'
  });

  const rufus = await prisma.mascota.create({
    data: { grupoId: grupoPitashny.id, nombre: 'Rufus', especie: 'Perro', raza: 'Labrador', fechaNacimiento: new Date('2020-05-15') }
  });
  const mishi = await prisma.mascota.create({
    data: { grupoId: grupoPitashny.id, nombre: 'Mishi', especie: 'Gato', raza: null, fechaNacimiento: new Date('2019-09-01') }
  });
  await prisma.mascota.create({
    data: { grupoId: grupoAcevedo.id, nombre: 'Bruno', especie: 'Perro', raza: 'Border Collie', fechaNacimiento: new Date('2021-02-20') }
  });

  await prisma.vacuna.create({
    data: { integranteId: gotenks.id, nombre: 'Antigripal', fechaAplicacion: new Date('2025-04-10'), notas: 'Aplicada en centro de salud.' }
  });
  const dobleViral = await prisma.vacuna.create({
    data: { integranteId: alduin.id, nombre: 'Doble viral', fechaAplicacion: diaRelativo(-340), proximaDosis: diaRelativo(25), notas: 'Refuerzo anual.' }
  });
  const antirrabica = await prisma.vacuna.create({
    data: { mascotaId: rufus.id, nombre: 'Antirrábica', fechaAplicacion: diaRelativo(-350), proximaDosis: diaRelativo(15), notas: 'Vet: Dr. Gómez.' }
  });
  await prisma.vacuna.create({
    data: { mascotaId: rufus.id, nombre: 'Séxtuple', fechaAplicacion: new Date('2024-05-20'), proximaDosis: new Date('2025-05-20') }
  });

  const enalapril = await prisma.tratamiento.create({
    data: { integranteId: gotenks.id, descripcion: 'Control de hipertensión', medicacion: 'Enalapril 10mg — 1 comprimido diario', fechaInicio: new Date('2023-01-15') }
  });
  const insulina = await prisma.tratamiento.create({
    data: { integranteId: maxi.id, descripcion: 'Control de glucemia', medicacion: 'Insulina Glargina 10UI — noche', fechaInicio: new Date('2020-06-01') }
  });
  await prisma.tratamiento.create({
    data: { mascotaId: mishi.id, descripcion: 'Infección respiratoria', medicacion: 'Amoxicilina 50mg/ml — 7 días', fechaInicio: new Date('2025-05-01'), fechaFin: new Date('2025-05-08') }
  });

  await prisma.historial.createMany({
    data: [
      { integranteId: gotenks.id, evento: 'Control cardiológico', fecha: new Date('2025-03-10'), descripcion: 'Presión: 130/85. Sin novedades.' },
      { integranteId: alduin.id,  evento: 'Control pediátrico',   fecha: new Date('2025-01-20'), descripcion: 'Peso y talla normales para la edad.' },
      { integranteId: maxi.id,    evento: 'Control glucemia',      fecha: new Date('2025-04-05'), descripcion: 'Glucosa: 118 mg/dL. Se ajusta dosis.' },
      { mascotaId: rufus.id,      evento: 'Control veterinario',   fecha: new Date('2025-02-14'), descripcion: 'Desparasitación interna y externa.' },
    ]
  });

  await prisma.recordatorio.createMany({
    data: [
      { grupoId: grupoPitashny.id,   creadoPor: ilan.id, vacunaId: dobleViral.id,     tipo: 'vacuna',     fechaHora: enDias(25, '09:00'), descripcion: 'Refuerzo doble viral de Alduin' },
      { grupoId: grupoPitashny.id,   creadoPor: ilan.id, tratamientoId: enalapril.id, tipo: 'medicacion', fechaHora: enDias(6, '08:00'),  descripcion: 'Control mensual Enalapril Gotenks' },
      { grupoId: grupoDiPasquale.id, creadoPor: agus.id, tratamientoId: insulina.id,  tipo: 'medicacion', fechaHora: enDias(1, '22:00'),  descripcion: 'Insulina nocturna Maximiliano' },
      { grupoId: grupoPitashny.id,   creadoPor: ilan.id, vacunaId: antirrabica.id,    tipo: 'vacuna',     fechaHora: enDias(15, '10:00'), descripcion: 'Antirrábica anual Rufus' },
      { grupoId: grupoAcevedo.id,    creadoPor: alan.id, tipo: 'control', fechaHora: enDias(9, '11:00'), descripcion: 'Turno veterinario Bruno — revisión' },
    ]
  });

  // ============================================================
  // FAMILIA ROMERO — la familia de la demo
  // Dos adultos que usan la app (Laura y Martín), dos hijos, la abuela y dos mascotas.
  // ============================================================
  const laura  = await usuario('Laura', 'Romero', 'laura@domus.test');
  const martin = await usuario('Martín', 'Romero', 'martin@domus.test');
  // Sofía es la hija mayor: tiene cuenta pero todavía no está en ningún grupo.
  // En la demo, Laura le pasa el código de invitación y ella se suma en vivo.
  await usuario('Sofía', 'Romero', 'sofia@domus.test');

  const grupoRomero = await prisma.grupoFamiliar.create({
    data: {
      nombre: 'Familia Romero',
      miembros: { create: [{ usuarioId: laura.id, rol: 'dueno' }, { usuarioId: martin.id, rol: 'miembro' }] }
    }
  });

  const lauraI = await integrante(grupoRomero.id, {
    nombre: 'Laura', apellido: 'Romero', fechaNacimiento: '1985-04-18',
    tipoSangre: 'A+', alergias: null, observaciones: 'Hipotiroidismo controlado.'
  });
  await integrante(grupoRomero.id, {
    nombre: 'Martín', apellido: 'Romero', fechaNacimiento: '1982-09-02',
    tipoSangre: 'O+', alergias: 'Polen', observaciones: null
  });
  const sofiaI = await integrante(grupoRomero.id, {
    nombre: 'Sofía', apellido: 'Romero', fechaNacimiento: '2007-06-10',
    tipoSangre: 'A+', alergias: null, observaciones: 'Estudia en otra ciudad.'
  });
  const tomas = await integrante(grupoRomero.id, {
    nombre: 'Tomás', apellido: 'Romero', fechaNacimiento: '2017-02-21',
    tipoSangre: 'O-', alergias: 'Maní, Picadura de abeja',
    notasEmergencia: 'Lleva un autoinyector de adrenalina en la mochila.',
    observaciones: 'Asma leve. Usa aerosol en invierno.'
  });
  const elsa = await integrante(grupoRomero.id, {
    nombre: 'Elsa', apellido: 'Fernández', fechaNacimiento: '1947-11-05',
    tipoSangre: 'A+', alergias: 'Penicilina, AINEs',
    notasEmergencia: 'Tiene marcapasos desde 2021. Usa audífono en el oído izquierdo.',
    observaciones: 'Abuela materna. Vive con la familia.'
  });

  const coco = await prisma.mascota.create({
    data: { grupoId: grupoRomero.id, nombre: 'Coco', especie: 'Perro', raza: 'Caniche', fechaNacimiento: new Date('2019-12-01') }
  });
  const pancho = await prisma.mascota.create({
    data: { grupoId: grupoRomero.id, nombre: 'Pancho', especie: 'Conejo', raza: null, fechaNacimiento: new Date('2023-03-15') }
  });

  await prisma.contactoEmergencia.createMany({
    data: [
      { integranteId: elsa.id,  nombre: 'Laura Romero',  telefono: '+54 9 11 5555-1201', relacion: 'Hija' },
      { integranteId: elsa.id,  nombre: 'SAME',          telefono: '107',                relacion: 'Emergencias' },
      { integranteId: tomas.id, nombre: 'Martín Romero', telefono: '+54 9 11 5555-1202', relacion: 'Padre' },
      { integranteId: tomas.id, nombre: 'Enfermería escolar', telefono: '(011) 4555-3300', relacion: 'Escuela' },
    ]
  });

  await prisma.profesionalSalud.createMany({
    data: [
      { integranteId: elsa.id,  nombre: 'Dra. Marta Ruiz',     especialidad: 'Cardiología',   telefono: '(011) 4800-2210', direccion: 'Av. Santa Fe 2450, CABA', notas: 'Control del marcapasos cada 6 meses.' },
      { integranteId: tomas.id, nombre: 'Dr. Andrés Paz',      especialidad: 'Pediatría',     telefono: '(011) 4700-1180', direccion: 'Cabildo 1900, CABA', notas: null },
      { integranteId: lauraI.id, nombre: 'Dra. Paula Ibarra',  especialidad: 'Medicina general', telefono: '(011) 4600-5520', direccion: null, notas: null },
      { mascotaId: coco.id,     nombre: 'Veterinaria Patitas', especialidad: 'Veterinario',   telefono: '(011) 4300-7788', direccion: 'Cramer 3300, CABA', notas: 'Atiende también exóticos (Pancho).' },
    ]
  });

  const tripleViral = await prisma.vacuna.create({
    data: { integranteId: tomas.id, nombre: 'Triple viral (refuerzo)', fechaAplicacion: diaRelativo(-1100), proximaDosis: diaRelativo(20), notas: 'Refuerzo de ingreso escolar.' }
  });
  await prisma.vacuna.create({
    data: { integranteId: elsa.id, nombre: 'Antigripal', fechaAplicacion: diaRelativo(-230), proximaDosis: diaRelativo(135), notas: 'Vacunatorio del barrio.' }
  });
  await prisma.vacuna.create({
    data: { integranteId: elsa.id, nombre: 'Neumococo (VNC20)', fechaAplicacion: diaRelativo(-400), notas: 'Dosis única.' }
  });
  await prisma.vacuna.create({
    data: { integranteId: sofiaI.id, nombre: 'Hepatitis B', fechaAplicacion: diaRelativo(-60), proximaDosis: diaRelativo(120), notas: 'Segunda dosis del esquema.' }
  });
  const antirrabicaCoco = await prisma.vacuna.create({
    data: { mascotaId: coco.id, nombre: 'Antirrábica', fechaAplicacion: diaRelativo(-320), proximaDosis: diaRelativo(45) }
  });

  const losartan = await prisma.tratamiento.create({
    data: { integranteId: elsa.id, descripcion: 'Control de presión arterial', medicacion: 'Losartán 50 mg — 1 comprimido por la mañana', fechaInicio: new Date('2022-03-01') }
  });
  const amoxicilina = await prisma.tratamiento.create({
    data: { integranteId: tomas.id, descripcion: 'Otitis media', medicacion: 'Amoxicilina 500 mg — cada 8 horas', fechaInicio: diaRelativo(-3), fechaFin: diaRelativo(4) }
  });
  await prisma.tratamiento.create({
    data: { integranteId: lauraI.id, descripcion: 'Hipotiroidismo', medicacion: 'Levotiroxina 50 mcg — en ayunas', fechaInicio: new Date('2019-08-01') }
  });
  await prisma.tratamiento.create({
    data: { mascotaId: pancho.id, descripcion: 'Control de dientes', medicacion: 'Heno sin límite y revisión mensual', fechaInicio: diaRelativo(-30) }
  });

  await prisma.historial.createMany({
    data: [
      { integranteId: elsa.id,  evento: 'Control cardiológico',   fecha: diaRelativo(-60),  descripcion: 'Marcapasos funcionando bien. Presión 135/80.' },
      { integranteId: elsa.id,  evento: 'Colocación de marcapasos', fecha: new Date('2021-05-12'), descripcion: 'Hospital Fernández. Alta a los 3 días.' },
      { integranteId: elsa.id,  evento: 'Análisis de sangre',     fecha: diaRelativo(-120), descripcion: 'Colesterol levemente alto. Se indica dieta.' },
      { integranteId: tomas.id, evento: 'Consulta por otitis',    fecha: diaRelativo(-3),   descripcion: 'Dolor de oído derecho. Se indica amoxicilina 7 días.' },
      { integranteId: tomas.id, evento: 'Control pediátrico',     fecha: diaRelativo(-150), descripcion: 'Peso y talla normales. Se recuerda refuerzo de triple viral.' },
      { mascotaId: coco.id,     evento: 'Castración',             fecha: new Date('2021-02-10'), descripcion: 'Sin complicaciones.' },
    ]
  });

  await prisma.recordatorio.createMany({
    data: [
      // Puntuales
      { grupoId: grupoRomero.id, creadoPor: laura.id,  tipo: 'control', fechaHora: enDias(3, '16:30'), descripcion: 'Turno con la cardióloga — Elsa' },
      { grupoId: grupoRomero.id, creadoPor: martin.id, vacunaId: tripleViral.id, tipo: 'vacuna', fechaHora: enDias(20, '10:00'), descripcion: 'Refuerzo triple viral — Tomás' },
      { grupoId: grupoRomero.id, creadoPor: laura.id,  vacunaId: antirrabicaCoco.id, tipo: 'vacuna', fechaHora: enDias(45, '18:00'), descripcion: 'Antirrábica de Coco' },
      { grupoId: grupoRomero.id, creadoPor: martin.id, tipo: 'control', fechaHora: enDias(14, '11:00'), descripcion: 'Control pediátrico — Tomás' },
      { grupoId: grupoRomero.id, creadoPor: laura.id,  tipo: 'control', fechaHora: enDias(8, '09:30'), descripcion: 'Análisis de sangre en ayunas — Laura', activo: false },
      // Periódicos (MEJ-005)
      ...serie({ grupoId: grupoRomero.id, creadoPor: martin.id, tratamientoId: amoxicilina.id, tipo: 'medicacion',
                 descripcion: 'Amoxicilina de Tomás', desdeDias: 0, hora: '20:00', cadaDias: 1, veces: 5 }),
      ...serie({ grupoId: grupoRomero.id, creadoPor: laura.id, tratamientoId: losartan.id, tipo: 'control',
                 descripcion: 'Tomar la presión a Elsa', desdeDias: 1, hora: '09:00', cadaDias: 7, veces: 8 }),
    ]
  });

  // ============================================================
  // FAMILIA HERRERA — segunda familia con dos usuarios
  // Sirve para mostrar que una familia no ve los datos de otra.
  // ============================================================
  const pablo   = await usuario('Pablo', 'Herrera', 'pablo@domus.test');
  const valeria = await usuario('Valeria', 'Herrera', 'valeria@domus.test');

  const grupoHerrera = await prisma.grupoFamiliar.create({
    data: {
      nombre: 'Familia Herrera',
      miembros: { create: [{ usuarioId: pablo.id, rol: 'dueno' }, { usuarioId: valeria.id, rol: 'miembro' }] }
    }
  });

  await integrante(grupoHerrera.id, { nombre: 'Pablo', apellido: 'Herrera', fechaNacimiento: '1990-01-25', tipoSangre: 'B+' });
  await integrante(grupoHerrera.id, { nombre: 'Valeria', apellido: 'Herrera', fechaNacimiento: '1992-08-14', tipoSangre: 'AB-', alergias: 'Lácteos' });
  const lucas = await integrante(grupoHerrera.id, {
    nombre: 'Lucas', apellido: 'Herrera', fechaNacimiento: diaRelativo(-400).toISOString().slice(0, 10),
    observaciones: 'Calendario de vacunas al día.'
  });
  await prisma.mascota.create({
    data: { grupoId: grupoHerrera.id, nombre: 'Mora', especie: 'Gato', raza: 'Siamés', fechaNacimiento: new Date('2022-07-01') }
  });

  const pentavalente = await prisma.vacuna.create({
    data: { integranteId: lucas.id, nombre: 'Pentavalente (3ª dosis)', fechaAplicacion: diaRelativo(-210), proximaDosis: diaRelativo(10) }
  });
  await prisma.historial.create({
    data: { integranteId: lucas.id, evento: 'Control del primer año', fecha: diaRelativo(-35), descripcion: 'Peso 10 kg. Desarrollo normal.' }
  });
  await prisma.recordatorio.createMany({
    data: [
      { grupoId: grupoHerrera.id, creadoPor: valeria.id, vacunaId: pentavalente.id, tipo: 'vacuna', fechaHora: enDias(10, '09:00'), descripcion: 'Refuerzo pentavalente — Lucas' },
      { grupoId: grupoHerrera.id, creadoPor: pablo.id, tipo: 'control', fechaHora: enDias(7, '17:00'), descripcion: 'Pediatra — control de Lucas' },
    ]
  });

  console.log('Datos de prueba cargados correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
