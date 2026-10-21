// ============================================================
// DOMUS+ | prisma/seed.js
// Datos de prueba — equivalente a Scripts/postgres/02_inserts.sql
// SOLO para desarrollo/testing. NO ejecutar en producción.
// Correr con: npx prisma db seed
// ============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando datos de prueba...');

  // ------------------------------------------------------------
  // USUARIOS — password real: "Admin123"
  // ------------------------------------------------------------
  const hash = await bcrypt.hash('Admin123', 10);

  const ilan = await prisma.usuario.create({
    data: { nombre: 'Ilan', apellido: 'Pitashny', email: 'ilan@domus.test', passwordHash: hash }
  });
  const agus = await prisma.usuario.create({
    data: { nombre: 'Agustina', apellido: 'Di Pasquale', email: 'agus@domus.test', passwordHash: hash }
  });
  const alan = await prisma.usuario.create({
    data: { nombre: 'Alan', apellido: 'Acevedo', email: 'alan@domus.test', passwordHash: hash }
  });

  // ------------------------------------------------------------
  // GRUPOS FAMILIARES + MEMBRESÍA
  // ------------------------------------------------------------
  const grupoPitashny = await prisma.grupoFamiliar.create({
    data: {
      nombre: 'Familia Pitashny',
      miembros: { create: { usuarioId: ilan.id, rol: 'dueno' } }
    }
  });
  const grupoDiPasquale = await prisma.grupoFamiliar.create({
    data: {
      nombre: 'Familia Di Pasquale',
      miembros: { create: { usuarioId: agus.id, rol: 'dueno' } }
    }
  });
  const grupoAcevedo = await prisma.grupoFamiliar.create({
    data: {
      nombre: 'Familia Acevedo',
      miembros: { create: { usuarioId: alan.id, rol: 'dueno' } }
    }
  });

  // ------------------------------------------------------------
  // INTEGRANTES
  // ------------------------------------------------------------
  const gotenks = await prisma.integrante.create({
    data: {
      grupoId: grupoPitashny.id,
      nombre: 'Gotenks', apellido: 'Pitashny',
      fechaNacimiento: new Date('1975-03-12'),
      tipo: 'adulto',
      observaciones: 'Hipertenso. Medicación diaria.'
    }
  });
  const alduin = await prisma.integrante.create({
    data: {
      grupoId: grupoPitashny.id,
      nombre: 'Alduin', apellido: 'Pitashny',
      fechaNacimiento: new Date('2010-07-04'),
      tipo: 'menor',
      observaciones: 'Esquema de vacunación completo hasta 2022.'
    }
  });
  const maxi = await prisma.integrante.create({
    data: {
      grupoId: grupoDiPasquale.id,
      nombre: 'Maximiliano', apellido: 'Di Pasquale',
      fechaNacimiento: new Date('1948-11-28'),
      tipo: 'mayor',
      observaciones: 'Diabetes tipo 2. Control mensual.'
    }
  });

  // ------------------------------------------------------------
  // MASCOTAS
  // ------------------------------------------------------------
  const rufus = await prisma.mascota.create({
    data: { grupoId: grupoPitashny.id, nombre: 'Rufus', especie: 'Perro', raza: 'Labrador', fechaNacimiento: new Date('2020-05-15') }
  });
  const mishi = await prisma.mascota.create({
    data: { grupoId: grupoPitashny.id, nombre: 'Mishi', especie: 'Gato', raza: null, fechaNacimiento: new Date('2019-09-01') }
  });
  await prisma.mascota.create({
    data: { grupoId: grupoAcevedo.id, nombre: 'Bruno', especie: 'Perro', raza: 'Border Collie', fechaNacimiento: new Date('2021-02-20') }
  });

  // ------------------------------------------------------------
  // VACUNAS
  // ------------------------------------------------------------
  await prisma.vacuna.create({
    data: { integranteId: gotenks.id, nombre: 'Antigripal', fechaAplicacion: new Date('2025-04-10'), notas: 'Aplicada en centro de salud.' }
  });
  const dobleViral = await prisma.vacuna.create({
    data: { integranteId: alduin.id, nombre: 'Doble viral', fechaAplicacion: new Date('2024-09-01'), proximaDosis: new Date('2025-09-01'), notas: 'Refuerzo anual.' }
  });
  const antirrabica = await prisma.vacuna.create({
    data: { mascotaId: rufus.id, nombre: 'Antirrábica', fechaAplicacion: new Date('2024-11-15'), proximaDosis: new Date('2025-11-15'), notas: 'Vet: Dr. Gómez.' }
  });
  await prisma.vacuna.create({
    data: { mascotaId: rufus.id, nombre: 'Séxtuple', fechaAplicacion: new Date('2024-05-20'), proximaDosis: new Date('2025-05-20') }
  });

  // ------------------------------------------------------------
  // TRATAMIENTOS
  // ------------------------------------------------------------
  const enalapril = await prisma.tratamiento.create({
    data: { integranteId: gotenks.id, descripcion: 'Control de hipertensión', medicacion: 'Enalapril 10mg — 1 comprimido diario', fechaInicio: new Date('2023-01-15') }
  });
  const insulina = await prisma.tratamiento.create({
    data: { integranteId: maxi.id, descripcion: 'Control de glucemia', medicacion: 'Insulina Glargina 10UI — noche', fechaInicio: new Date('2020-06-01') }
  });
  await prisma.tratamiento.create({
    data: { mascotaId: mishi.id, descripcion: 'Infección respiratoria', medicacion: 'Amoxicilina 50mg/ml — 7 días', fechaInicio: new Date('2025-05-01'), fechaFin: new Date('2025-05-08') }
  });

  // ------------------------------------------------------------
  // HISTORIAL
  // ------------------------------------------------------------
  await prisma.historial.createMany({
    data: [
      { integranteId: gotenks.id, evento: 'Control cardiológico', fecha: new Date('2025-03-10'), descripcion: 'Presión: 130/85. Sin novedades.' },
      { integranteId: alduin.id,  evento: 'Control pediátrico',   fecha: new Date('2025-01-20'), descripcion: 'Peso y talla normales para la edad.' },
      { integranteId: maxi.id,    evento: 'Control glucemia',      fecha: new Date('2025-04-05'), descripcion: 'Glucosa: 118 mg/dL. Se ajusta dosis.' },
      { mascotaId: rufus.id,      evento: 'Control veterinario',   fecha: new Date('2025-02-14'), descripcion: 'Desparasitación interna y externa.' },
    ]
  });

  // ------------------------------------------------------------
  // RECORDATORIOS
  // ------------------------------------------------------------
  await prisma.recordatorio.createMany({
    data: [
      { grupoId: grupoPitashny.id,   creadoPor: ilan.id, vacunaId: dobleViral.id,  tipo: 'vacuna',     fechaHora: new Date('2025-09-01T09:00:00'), descripcion: 'Refuerzo doble viral de Alduin',    activo: true },
      { grupoId: grupoPitashny.id,   creadoPor: ilan.id, tratamientoId: enalapril.id, tipo: 'medicacion', fechaHora: new Date('2025-06-15T08:00:00'), descripcion: 'Control mensual Enalapril Gotenks', activo: true },
      { grupoId: grupoDiPasquale.id, creadoPor: agus.id, tratamientoId: insulina.id,  tipo: 'medicacion', fechaHora: new Date('2025-06-20T22:00:00'), descripcion: 'Insulina nocturna Maximiliano',      activo: true },
      { grupoId: grupoPitashny.id,   creadoPor: ilan.id, vacunaId: antirrabica.id, tipo: 'vacuna',     fechaHora: new Date('2025-11-15T10:00:00'), descripcion: 'Antirrábica anual Rufus',           activo: true },
      { grupoId: grupoAcevedo.id,    creadoPor: alan.id, tipo: 'control',    fechaHora: new Date('2025-07-01T11:00:00'), descripcion: 'Turno veterinario Bruno — revisión', activo: true },
    ]
  });

  console.log('Datos de prueba cargados correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
