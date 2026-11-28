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
//     monica@domus.test (dueña) + jose@domus.test → Familia Argento
//       5 integrantes de todas las edades (Alfio y la abuela María Elena no tienen
//       cuenta: se cargan igual), 3 mascotas y datos en todas las secciones
//     pablo@domus.test (dueño) + valeria@domus.test → Familia Herrera
//     paola@domus.test → sin grupo: para mostrar la invitación con código
//
//   Administrador del sistema (rol 'admin', sin familia):
//     admin@domus.test → ve el registro de actividad y las estadísticas generales,
//       nunca los datos médicos de las familias. Panel en http://localhost:3000/admin
//   El registro de actividad trae ingresos y altas del 24 al 30/11 (y el alta de Paola
//   el 1/12) para que el panel no arranque vacío.
//
//   Familias de relleno (24, cuentas *@relleno.domus.test): sólo para que las estadísticas
//   del admin tengan volumen (usuarios, integrantes, mascotas, adjuntos y 90 días de
//   actividad). Se generan con semilla fija, así los números son siempre los mismos.
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

// ------------------------------------------------------------
// Familias de relleno para las estadísticas del admin
// ------------------------------------------------------------
// Generador pseudoaleatorio con semilla fija (mulberry32): mismos datos en cada seed
function generador(semilla) {
  return function () {
    semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = generador(20261201);
const entre = (min, max) => min + Math.floor(azar() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const sinAcentos = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const APELLIDOS = ['Gómez', 'Fernández', 'López', 'Martínez', 'Sosa', 'Romero', 'Benítez', 'Álvarez', 'Ruiz', 'Torres',
  'Medina', 'Castro', 'Suárez', 'Ríos', 'Molina', 'Ortiz', 'Silva', 'Ramos', 'Vega', 'Acosta', 'Giménez', 'Ledesma', 'Peralta', 'Ferreyra'];
const NOMBRES_ADULTO = ['Lucía', 'Martín', 'Carolina', 'Diego', 'Florencia', 'Javier', 'Natalia', 'Gonzalo', 'Valeria', 'Sebastián',
  'Romina', 'Federico', 'Laura', 'Pablo', 'Mariana', 'Hernán', 'Cecilia', 'Matías', 'Andrea', 'Nicolás'];
const NOMBRES_MENOR = ['Mateo', 'Sofía', 'Benjamín', 'Emma', 'Thiago', 'Olivia', 'Bautista', 'Martina', 'Felipe', 'Catalina', 'Joaquín', 'Isabella'];
const NOMBRES_MAYOR = ['Norma', 'Héctor', 'Elsa', 'Rubén', 'Marta', 'Osvaldo', 'Graciela', 'Alberto'];
const NOMBRES_MASCOTA = ['Luna', 'Toby', 'Lola', 'Rocky', 'Milo', 'Nina', 'Simón', 'Kira', 'Coco', 'Bruno', 'Frida', 'Pepa', 'Tom', 'Uma'];
// Especies tal como podrían haber quedado guardadas (algunas cargadas antes de MEJ-001):
// las estadísticas las agrupan igual («hamster» y «Hámster» cuentan como una).
const ESPECIES = ['Perro', 'Perro', 'Perro', 'Perro', 'Gato', 'Gato', 'Gato', 'Conejo', 'conejo', 'Hámster', 'hamster',
  'Tortuga', 'Ave', 'Pez', 'Cobayo', 'Hurón', 'huron', 'Otro'];
const VACUNAS = ['Antigripal', 'Triple viral', 'Hepatitis B', 'Antitetánica', 'Antirrábica', 'Séxtuple'];

async function sembrarFamiliasDeRelleno(hash) {
  const actividad = [];
  const registrar = (usuarioId, accion, fecha, entidad = null, entidadId = null) =>
    actividad.push({ usuarioId, accion, fecha, entidad, entidadId });
  const fechaEn = (diasAntes, minutosDelDia) =>
    new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() - diasAntes, 0, minutosDelDia);
  const nacimiento = (edadMin, edadMax) =>
    new Date(Date.UTC(HOY.getFullYear() - entre(edadMin, edadMax), entre(0, 11), entre(1, 28)));
  const usados = new Set();

  for (const [n, apellido] of APELLIDOS.entries()) {
    // Cuentas: la mayoría se registró entre agosto y noviembre; unas pocas la mañana del 1/12
    const diasRegistro = n < 3 ? 0 : entre(1, 105);
    const cuentas = [];
    const cantidadCuentas = elegir([1, 1, 2, 2, 2, 3]);
    for (let c = 0; c < cantidadCuentas; c++) {
      let nombre;
      do { nombre = elegir(NOMBRES_ADULTO); } while (usados.has(nombre + apellido));
      usados.add(nombre + apellido);
      const creadoEn = diasRegistro === 0 ? fechaEn(0, entre(30, 7 * 60)) : fechaEn(Math.max(1, diasRegistro - c * entre(0, 3)), entre(8 * 60, 23 * 60));
      cuentas.push(await prisma.usuario.create({
        data: { nombre, apellido, email: `${sinAcentos(nombre)}.${sinAcentos(apellido)}@relleno.domus.test`, passwordHash: hash, createdAt: creadoEn }
      }));
    }
    const grupo = await prisma.grupoFamiliar.create({
      data: {
        nombre: `Familia ${apellido}`,
        miembros: { create: cuentas.map((u, i) => ({ usuarioId: u.id, rol: i === 0 ? 'dueno' : 'miembro', joinedAt: u.createdAt })) }
      }
    });

    // Integrantes: los adultos de las cuentas, hijos y a veces un abuelo o abuela
    const integrantes = [];
    for (const u of cuentas) integrantes.push(await integrante(grupo.id, { nombre: u.nombre, apellido, fechaNacimiento: nacimiento(25, 55) }));
    for (let h = 0, hijos = elegir([0, 1, 1, 2, 2, 3]); h < hijos; h++) {
      integrantes.push(await integrante(grupo.id, { nombre: elegir(NOMBRES_MENOR), apellido, fechaNacimiento: nacimiento(0, 17) }));
    }
    if (azar() < 0.5) integrantes.push(await integrante(grupo.id, { nombre: elegir(NOMBRES_MAYOR), apellido, fechaNacimiento: nacimiento(66, 90) }));

    const mascotas = [];
    for (let m = 0, cant = elegir([0, 1, 1, 1, 2, 2, 3]); m < cant; m++) {
      mascotas.push(await prisma.mascota.create({ data: { grupoId: grupo.id, nombre: elegir(NOMBRES_MASCOTA), especie: elegir(ESPECIES) } }));
    }

    // Algunas vacunas y recordatorios, para que las altas del registro apunten a algo real
    const vacunas = [];
    for (const i of integrantes.slice(0, entre(1, 2))) {
      vacunas.push(await prisma.vacuna.create({
        data: { integranteId: i.id, nombre: elegir(VACUNAS), fechaAplicacion: diaRelativo(-entre(30, 300)) }
      }));
    }
    const recordatorio = await prisma.recordatorio.create({
      data: { grupoId: grupo.id, creadoPor: cuentas[0].id, tipo: elegir(['control', 'medicacion', 'vacuna']),
        fechaHora: enDias(entre(1, 40), `${entre(8, 20)}:00`), descripcion: 'Recordatorio' }
    });
    // Adjuntos de ejemplo (imagen pública de muestra de Cloudinary): sólo cuentan para el total
    if (azar() < 0.6) {
      for (let a = 0, cant = entre(1, 3); a < cant; a++) {
        await prisma.adjunto.create({
          data: { integranteId: elegir(integrantes).id, tipoArchivo: 'imagen', subidoPor: cuentas[0].id,
            url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', publicId: 'sample', nombreOriginal: 'estudio.jpg' }
        });
      }
    }

    // Actividad: el registro de cada cuenta y, desde ahí, ingresos con algunas acciones
    const entidades = [
      ...integrantes.map((i) => ['integrante', i.id]), ...mascotas.map((m) => ['mascota', m.id]),
      ...vacunas.map((v) => ['vacuna', v.id]), ['recordatorio', recordatorio.id]
    ];
    for (const u of cuentas) {
      registrar(u.id, 'alta', u.createdAt, 'usuario', u.id);
      const constancia = azar() < 0.25 ? 0.01 : 0.04 + azar() * 0.22; // qué tan seguido entra (1 de cada 4 casi nunca)
      const diasCuenta = Math.floor((HOY - u.createdAt) / 86400000);
      for (let d = Math.min(diasCuenta, 90); d >= 1; d--) {
        if (azar() > constancia) continue;
        const minuto = entre(7 * 60, 23 * 60);
        registrar(u.id, 'login', fechaEn(d, minuto));
        for (let a = 0, acciones = elegir([0, 0, 1, 1, 2, 3]); a < acciones; a++) {
          const [entidad, id] = elegir(entidades);
          const accion = elegir(['alta', 'alta', 'modificacion', 'modificacion', 'modificacion', 'eliminacion']);
          registrar(u.id, accion, fechaEn(d, minuto + 2 + a * 3), accion === 'eliminacion' ? 'recordatorio' : entidad, accion === 'eliminacion' ? null : id);
        }
      }
    }
  }
  await prisma.registroActividad.createMany({ data: actividad });
}

async function main() {
  console.log('Sembrando datos de prueba...');

  const hash = await bcrypt.hash('Admin123', 10);
  // creadoEn: fecha de alta de la cuenta, para las estadísticas del admin (nuevos usuarios del mes)
  const usuario = (nombre, apellido, email, creadoEn) =>
    prisma.usuario.create({ data: { nombre, apellido, email, passwordHash: hash, createdAt: creadoEn } });

  // ============================================================
  // FAMILIAS DEL EQUIPO (igual que antes, recordatorios con fechas de hoy en adelante)
  // ============================================================
  const ilan = await usuario('Ilan', 'Pitashny', 'ilan@domus.test', enDias(-82, '10:00'));
  const agus = await usuario('Agustina', 'Di Pasquale', 'agus@domus.test', enDias(-82, '10:20'));
  const alan = await usuario('Alan', 'Acevedo', 'alan@domus.test', enDias(-81, '18:45'));

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
  // Especies escritas a mano con "Otro", con y sin acento: en las estadísticas del
  // admin cuentan como una sola especie ("Hámster").
  await prisma.mascota.createMany({
    data: [
      { grupoId: grupoPitashny.id, nombre: 'Copito', especie: 'Hámster', raza: null, fechaNacimiento: new Date('2025-08-01') },
      { grupoId: grupoDiPasquale.id, nombre: 'Tito', especie: 'Hamster', raza: null, fechaNacimiento: new Date('2025-03-12') },
      { grupoId: grupoAcevedo.id, nombre: 'Pancha', especie: 'Tortuga', raza: 'Tortuga de tierra', fechaNacimiento: null }
    ]
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
  // FAMILIA ARGENTO — la familia de la demo
  // Dos adultos que usan la app (Mónica y José), dos hijos, la abuela y tres mascotas.
  // Integrantes y cuentas son cosas distintas: Alfio (9) y la abuela María Elena
  // no tienen cuenta, y su salud se registra igual.
  // ============================================================
  const monica = await usuario('Mónica', 'Argento', 'monica@domus.test', enDias(-28, '21:10'));
  const jose   = await usuario('José', 'Argento', 'jose@domus.test', enDias(-27, '08:05'));
  // Paola es la hija mayor: tiene cuenta pero todavía no está en ningún grupo.
  // En la demo, Mónica le pasa el código de invitación y ella se suma en vivo.
  // Creó la cuenta la mañana de la demo: es la "nueva usuaria del mes" del panel del admin.
  const paola = await usuario('Paola', 'Argento', 'paola@domus.test', enDias(0, '08:30'));

  const grupoArgento = await prisma.grupoFamiliar.create({
    data: {
      nombre: 'Familia Argento',
      miembros: { create: [{ usuarioId: monica.id, rol: 'dueno' }, { usuarioId: jose.id, rol: 'miembro' }] }
    }
  });

  const monicaI = await integrante(grupoArgento.id, {
    nombre: 'Mónica', apellido: 'Argento', fechaNacimiento: '1985-04-18',
    tipoSangre: 'A+', alergias: null, observaciones: 'Hipotiroidismo controlado.'
  });
  await integrante(grupoArgento.id, {
    nombre: 'José', apellido: 'Argento', fechaNacimiento: '1982-09-02',
    tipoSangre: 'O+', alergias: 'Polen', observaciones: null
  });
  const paolaI = await integrante(grupoArgento.id, {
    nombre: 'Paola', apellido: 'Argento', fechaNacimiento: '2007-06-10',
    tipoSangre: 'A+', alergias: null, observaciones: 'Estudia en otra ciudad.'
  });
  const alfio = await integrante(grupoArgento.id, {
    nombre: 'Alfio', apellido: 'Argento', fechaNacimiento: '2017-02-21',
    tipoSangre: 'O-', alergias: 'Maní, Picadura de abeja',
    notasEmergencia: 'Lleva un autoinyector de adrenalina en la mochila.',
    observaciones: 'Asma leve. Usa aerosol en invierno.'
  });
  const mariaElena = await integrante(grupoArgento.id, {
    nombre: 'María Elena', apellido: 'Argento', fechaNacimiento: '1947-11-05',
    tipoSangre: 'A+', alergias: 'Penicilina, AINEs',
    notasEmergencia: 'Tiene marcapasos desde 2021. Usa audífono en el oído izquierdo.',
    observaciones: 'Abuela paterna. Vive con la familia.'
  });

  const fatiga = await prisma.mascota.create({
    data: { grupoId: grupoArgento.id, nombre: 'Fatiga', especie: 'Perro', raza: 'Mestizo', fechaNacimiento: new Date('2019-12-01') }
  });
  const dardo = await prisma.mascota.create({
    data: { grupoId: grupoArgento.id, nombre: 'Dardo', especie: 'Gato', raza: null, fechaNacimiento: new Date('2023-03-15') }
  });
  // Conejo = especie fuera de la lista (Perro / Gato / Ave): se carga como «Otro» (MEJ-001)
  const pelusa = await prisma.mascota.create({
    data: { grupoId: grupoArgento.id, nombre: 'Pelusa', especie: 'Conejo', raza: 'Cabeza de león', fechaNacimiento: new Date('2024-02-10') }
  });

  await prisma.contactoEmergencia.createMany({
    data: [
      { integranteId: mariaElena.id,  nombre: 'Mónica Argento', telefono: '+54 9 11 5555-1201', relacion: 'Hija' },
      { integranteId: mariaElena.id,  nombre: 'SAME',          telefono: '107',                relacion: 'Emergencias' },
      { integranteId: alfio.id, nombre: 'José Argento',   telefono: '+54 9 11 5555-1202', relacion: 'Padre' },
      { integranteId: alfio.id, nombre: 'Enfermería escolar', telefono: '(011) 4555-3300', relacion: 'Escuela' },
      // Dato viejo a propósito: en la demo se borra (la vecina se mudó)
      { integranteId: mariaElena.id, nombre: 'Rosa Benítez', telefono: '(011) 4555-0099', relacion: 'Vecina (se mudó)' },
    ]
  });

  await prisma.profesionalSalud.createMany({
    data: [
      { integranteId: mariaElena.id,  nombre: 'Dra. Marta Ruiz',     especialidad: 'Cardiología',   telefono: '(011) 4800-2210', direccion: 'Av. Santa Fe 2450, CABA', notas: 'Control del marcapasos cada 6 meses.' },
      { integranteId: alfio.id, nombre: 'Dr. Andrés Paz',      especialidad: 'Pediatría',     telefono: '(011) 4700-1180', direccion: 'Cabildo 1900, CABA', notas: null },
      { integranteId: monicaI.id, nombre: 'Dra. Paula Ibarra',  especialidad: 'Medicina general', telefono: '(011) 4600-5520', direccion: null, notas: null },
      { mascotaId: fatiga.id,     nombre: 'Veterinaria Patitas', especialidad: 'Veterinario',   telefono: '(011) 4300-7788', direccion: 'Cramer 3300, CABA', notas: 'Atiende también a Dardo y a Pelusa (exóticos).' },
    ]
  });

  const tripleViral = await prisma.vacuna.create({
    data: { integranteId: alfio.id, nombre: 'Triple viral (refuerzo)', fechaAplicacion: diaRelativo(-1100), proximaDosis: diaRelativo(20), notas: 'Refuerzo de ingreso escolar.' }
  });
  await prisma.vacuna.create({
    data: { integranteId: mariaElena.id, nombre: 'Antigripal', fechaAplicacion: diaRelativo(-230), proximaDosis: diaRelativo(135), notas: 'Vacunatorio del barrio.' }
  });
  await prisma.vacuna.create({
    data: { integranteId: mariaElena.id, nombre: 'Neumococo (VNC20)', fechaAplicacion: diaRelativo(-400), notas: 'Dosis única.' }
  });
  await prisma.vacuna.create({
    data: { integranteId: paolaI.id, nombre: 'Hepatitis B', fechaAplicacion: diaRelativo(-60), proximaDosis: diaRelativo(120), notas: 'Segunda dosis del esquema.' }
  });
  // Error de tipeo a propósito ("felna"): en la demo se corrige editando la vacuna
  await prisma.vacuna.create({
    data: { mascotaId: dardo.id, nombre: 'Triple felna', fechaAplicacion: diaRelativo(-90), proximaDosis: diaRelativo(275) }
  });
  const antirrabicaFatiga = await prisma.vacuna.create({
    data: { mascotaId: fatiga.id, nombre: 'Antirrábica', fechaAplicacion: diaRelativo(-320), proximaDosis: diaRelativo(45) }
  });

  const losartan = await prisma.tratamiento.create({
    data: { integranteId: mariaElena.id, descripcion: 'Control de presión arterial', medicacion: 'Losartán 50 mg — 1 comprimido por la mañana', fechaInicio: new Date('2022-03-01') }
  });
  const amoxicilina = await prisma.tratamiento.create({
    data: { integranteId: alfio.id, descripcion: 'Otitis media', medicacion: 'Amoxicilina 500 mg — cada 8 horas', fechaInicio: diaRelativo(-3), fechaFin: diaRelativo(4) }
  });
  await prisma.tratamiento.create({
    data: { integranteId: monicaI.id, descripcion: 'Hipotiroidismo', medicacion: 'Levotiroxina 50 mcg — en ayunas', fechaInicio: new Date('2019-08-01') }
  });
  await prisma.tratamiento.create({
    data: { mascotaId: dardo.id, descripcion: 'Control de peso', medicacion: 'Alimento light — 60 g por día', fechaInicio: diaRelativo(-30) }
  });
  await prisma.tratamiento.create({
    data: { mascotaId: pelusa.id, descripcion: 'Control de dientes', medicacion: 'Heno sin límite y revisión mensual', fechaInicio: diaRelativo(-20) }
  });

  await prisma.historial.createMany({
    data: [
      { integranteId: mariaElena.id,  evento: 'Control cardiológico',   fecha: diaRelativo(-60),  descripcion: 'Marcapasos funcionando bien. Presión 135/80.' },
      { integranteId: mariaElena.id,  evento: 'Colocación de marcapasos', fecha: new Date('2021-05-12'), descripcion: 'Hospital Fernández. Alta a los 3 días.' },
      { integranteId: mariaElena.id,  evento: 'Análisis de sangre',     fecha: diaRelativo(-120), descripcion: 'Colesterol levemente alto. Se indica dieta.' },
      { integranteId: alfio.id, evento: 'Consulta por otitis',    fecha: diaRelativo(-3),   descripcion: 'Dolor de oído derecho. Se indica amoxicilina 7 días.' },
      { integranteId: alfio.id, evento: 'Control pediátrico',     fecha: diaRelativo(-150), descripcion: 'Peso y talla normales. Se recuerda refuerzo de triple viral.' },
      { mascotaId: fatiga.id,     evento: 'Castración',             fecha: new Date('2021-02-10'), descripcion: 'Sin complicaciones.' },
    ]
  });

  await prisma.recordatorio.createMany({
    data: [
      // Puntuales
      { grupoId: grupoArgento.id, creadoPor: monica.id,  tipo: 'control', fechaHora: enDias(3, '16:30'), descripcion: 'Turno con la cardióloga — María Elena' },
      { grupoId: grupoArgento.id, creadoPor: jose.id, vacunaId: tripleViral.id, tipo: 'vacuna', fechaHora: enDias(20, '10:00'), descripcion: 'Refuerzo triple viral — Alfio' },
      { grupoId: grupoArgento.id, creadoPor: monica.id,  vacunaId: antirrabicaFatiga.id, tipo: 'vacuna', fechaHora: enDias(45, '18:00'), descripcion: 'Antirrábica de Fatiga' },
      { grupoId: grupoArgento.id, creadoPor: jose.id, tipo: 'control', fechaHora: enDias(14, '11:00'), descripcion: 'Control pediátrico — Alfio' },
      { grupoId: grupoArgento.id, creadoPor: monica.id,  tipo: 'control', fechaHora: enDias(8, '09:30'), descripcion: 'Análisis de sangre en ayunas — Mónica', activo: false },
      // Periódicos (MEJ-005)
      ...serie({ grupoId: grupoArgento.id, creadoPor: jose.id, tratamientoId: amoxicilina.id, tipo: 'medicacion',
                 descripcion: 'Amoxicilina de Alfio', desdeDias: 0, hora: '20:00', cadaDias: 1, veces: 5 }),
      ...serie({ grupoId: grupoArgento.id, creadoPor: monica.id, tratamientoId: losartan.id, tipo: 'control',
                 descripcion: 'Tomar la presión a María Elena', desdeDias: 1, hora: '09:00', cadaDias: 7, veces: 8 }),
    ]
  });

  // ============================================================
  // FAMILIA HERRERA — segunda familia con dos usuarios
  // Sirve para mostrar que una familia no ve los datos de otra.
  // ============================================================
  const pablo   = await usuario('Pablo', 'Herrera', 'pablo@domus.test', enDias(-45, '19:30'));
  const valeria = await usuario('Valeria', 'Herrera', 'valeria@domus.test', enDias(-44, '12:15'));

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

  // ============================================================
  // ADMINISTRADOR DEL SISTEMA (sin familia; va al final para no correr los ids del resto)
  // ============================================================
  await prisma.usuario.create({
    data: { nombre: 'Admin', apellido: 'DOMUS', email: 'admin@domus.test', passwordHash: hash, rol: 'admin', createdAt: enDias(-90, '09:00') }
  });

  // ============================================================
  // ACTIVIDAD DE LA SEMANA PREVIA A LA DEMO (registro de actividad del admin)
  // Para que el panel no arranque vacío: ingresos y altas del 24 al 30 de noviembre.
  // Las altas apuntan a registros reales de este seed; nunca se guarda su contenido.
  // ============================================================
  const actividad = [];
  const registrar = (usuarioId, accion, fecha, entidad = null, entidadId = null) =>
    actividad.push({ usuarioId, accion, fecha, entidad, entidadId });

  // Ingresos: cada usuario con los días (antes de la demo) en que entró
  const ingresos = [
    [monica, [7, 6, 5, 4, 3, 2, 1]], [jose, [7, 5, 4, 2, 1]],
    [pablo, [6, 3, 1]], [valeria, [4]],
    [ilan, [5, 2]], [agus, [3]], [alan, [6]]
  ];
  ingresos.forEach(([u, dias], i) => dias.forEach((d) =>
    registrar(u.id, 'login', enDias(-d, `${8 + i}:${String((d * 7) % 60).padStart(2, '0')}`))));

  // Altas: lo que cada familia "cargó" esa semana, repartido entre sus cuentas
  async function altasDeFamilia(grupo, autores) {
    const g = grupo.id;
    const deFamilia = { OR: [{ integrante: { grupoId: g } }, { mascota: { grupoId: g } }] };
    const soloId = { select: { id: true }, orderBy: { id: 'asc' } };
    const listas = [
      ['integrante', await prisma.integrante.findMany({ where: { grupoId: g }, ...soloId })],
      ['mascota', await prisma.mascota.findMany({ where: { grupoId: g }, ...soloId })],
      ['contacto_emergencia', await prisma.contactoEmergencia.findMany({ where: { integrante: { grupoId: g } }, ...soloId })],
      ['profesional', await prisma.profesionalSalud.findMany({ where: deFamilia, ...soloId })],
      ['vacuna', await prisma.vacuna.findMany({ where: deFamilia, ...soloId })],
      ['tratamiento', await prisma.tratamiento.findMany({ where: deFamilia, ...soloId })]
    ];
    // Una serie de recordatorios se crea con un solo pedido: cuenta como una sola alta
    const recordatorios = await prisma.recordatorio.findMany({
      where: { grupoId: g }, select: { id: true, serieId: true, creadoPor: true }, orderBy: { id: 'asc' }
    });
    const series = new Set();
    const primeros = recordatorios.filter((r) => !r.serieId || (!series.has(r.serieId) && series.add(r.serieId)));

    const items = listas.flatMap(([entidad, filas]) => filas.map((f) => ({ entidad, id: f.id })));
    primeros.forEach((r) => items.push({ entidad: 'recordatorio', id: r.id, autor: r.creadoPor }));
    items.forEach((it, k) => {
      const dia = 7 - Math.floor((k * 7) / items.length); // del 7 al 1 antes de la demo
      const hora = `${10 + (k % 11)}:${String((k * 13) % 60).padStart(2, '0')}`;
      registrar(it.autor || autores[k % autores.length].id, 'alta', enDias(-dia, hora), it.entidad, it.id);
    });
  }
  await altasDeFamilia(grupoArgento, [monica, jose]);
  await altasDeFamilia(grupoHerrera, [pablo, valeria]);

  // Algunas modificaciones y bajas
  registrar(monica.id, 'modificacion', enDias(-5, '22:40'), 'perfil');
  registrar(monica.id, 'modificacion', enDias(-3, '19:05'), 'ficha_emergencia', alfio.id);
  registrar(jose.id, 'modificacion', enDias(-2, '13:20'), 'mascota', dardo.id);
  registrar(pablo.id, 'modificacion', enDias(-3, '20:10'), 'integrante', lucas.id);
  registrar(jose.id, 'eliminacion', enDias(-4, '09:35'), 'recordatorio');
  registrar(monica.id, 'eliminacion', enDias(-1, '18:50'), 'contacto_emergencia');
  registrar(paola.id, 'alta', enDias(0, '08:30'), 'usuario', paola.id);

  await prisma.registroActividad.createMany({ data: actividad });

  // ============================================================
  // FAMILIAS DE RELLENO (sólo para que las estadísticas del admin tengan volumen)
  // 24 familias con 1 a 3 cuentas, integrantes de todas las edades, mascotas y 90 días
  // de actividad. Se generan con una semilla fija: los números salen iguales cada vez.
  // No se usan en la demo de la app; las cuentas existen (pass Admin123) pero no hace
  // falta entrar con ellas.
  // ============================================================
  await sembrarFamiliasDeRelleno(hash);

  console.log('Datos de prueba cargados correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
