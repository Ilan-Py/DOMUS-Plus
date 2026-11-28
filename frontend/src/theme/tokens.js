// Tokens del sistema visual papercut de DOMUS+ (docs/ux/04-design-system.md). Punto de entrada único para lo nuevo:
// los componentes nuevos importan de acá y las pantallas se van migrando de a poco. `colors.js` y `papel.js` siguen
// existiendo (todo lo viejo los importa) y estos tokens se apoyan en sus valores para no duplicar la paleta.
//
// Reglas:
//  - El papel (sombras apiladas, hojas de color, bordes de tijera, grano) va en capas decorativas, cabeceras, estados
//    vacíos y chips. Las superficies con datos (listas, grilla, formularios, ficha) son planas.
//  - Todo par de texto pasa AA (4.5:1; 3:1 para texto grande y para marcas que no son texto). Los ratios están en
//    los comentarios y en /styleguide, donde se calculan en vivo.
//  - Nada de valores sueltos: si falta un valor en la escala, se agrega acá.
import { Platform } from 'react-native';
import { colors } from './colors';
import { SOMBRA_PAPEL, SOMBRA_NATIVA } from './papel';

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
export const color = {
  // Superficies
  fondo: colors.bgBase, // #FBF6EE crema (se mantiene el actual; el #F8F2EA pedido es casi igual y ya está validado)
  cartulina: '#FFFDF9', // tarjetas
  arena: colors.arena, // #F3EAE0 bloques destacados y cabeceras. Sobre arena: textBody, nunca textoSuave (4.49:1)
  linea: 'rgba(42, 36, 33, 0.10)', // divisores sólidos
  lineaFuerte: 'rgba(42, 36, 33, 0.22)', // borde de botones secundarios y controles

  // Texto
  tinta: colors.ink, // #2A2421 · 15.06:1 sobre cartulina
  texto: colors.textBody, // #574E49 · 7.53:1 sobre fondo · 6.81:1 sobre arena
  textoSuave: colors.textMutedLight, // #726A5D · 5.25:1 sobre cartulina (no usar sobre arena)
  sobreColor: '#FFFFFF',

  // Marca
  terracota: colors.accentStrong, // #C24623 primario · blanco encima 5.01:1
  terracotaHover: colors.accentStrongPressed, // #A63A1B · blanco encima 6.48:1
  terracotaTexto: colors.limeDeep, // #AA451D enlaces y texto de acento · 5.78:1 sobre cartulina
  terracotaPalido: colors.terracotaSoft, // #FAECE7
  salvia: colors.salvia, // #4A6B5D mascotas y «al día» · blanco encima 5.91:1
  salviaPalido: '#E3ECE6',
  salviaTexto: '#3B5A4C', // 6.32:1 sobre salviaPalido

  // Decorativos (sólo rellenos: hojas, ilustraciones, fondos de chip). Nunca como texto ni como única marca.
  rosa: '#E8A598', // rosa empolvado (2.01:1 sobre cartulina)
  mostaza: '#D9A23B', // mostaza (2.25:1 sobre cartulina)

  // Estados de la interfaz
  foco: colors.accentStrong, // anillo de foco 2 px · 4.65:1 sobre fondo
  error: '#A6291B', // 6.21:1 sobre errorFondo
  errorFondo: '#FDECE8',
  aviso: '#7A5112',
  avisoFondo: '#FDF3E1',
};

// Tipos de evento. `marca` es el color del punto/ícono (≥ 3:1 sobre cartulina, 1.4.11); `texto` va sobre `fondo`
// (≥ 4.5:1). El tipo nunca se comunica sólo por color: siempre lleva ícono y nombre.
export const tipoEvento = {
  medicacion: { etiqueta: 'Medicación', icono: 'medkit', marca: '#D27C6B', fondo: '#F8E1DB', texto: '#8E3A2A', hoja: color.rosa },
  vacuna: { etiqueta: 'Vacuna', icono: 'shield-checkmark', marca: '#B9841F', fondo: '#F8EBCB', texto: '#6E4A0E', hoja: color.mostaza },
  control: { etiqueta: 'Turno o control', icono: 'calendar', marca: '#8A7663', fondo: '#EEE4D8', texto: '#4A3B32', hoja: '#E4D6C6' },
};
// 6.02:1 · 6.70:1 · 8.52:1 (texto sobre fondo)

// Estados de una dosis (docs/ux/03-definicion.md §2). Símbolo + palabra + color: nunca sólo color.
export const estadoDosis = {
  pendiente: { etiqueta: 'Pendiente', simbolo: '●', icono: 'ellipse-outline', color: colors.textBody, fondo: null },
  sin_marcar: { etiqueta: 'Sin marcar', simbolo: '!', icono: 'alert-circle', color: '#9A3416', fondo: '#FAECE7' }, // 6.33:1
  dada: { etiqueta: 'Dada', simbolo: '✓', icono: 'checkmark-circle', color: '#3D5A4B', fondo: '#E3ECE6' }, // 7.48:1 sobre cartulina
  no_se_dio: { etiqueta: 'No se dio', simbolo: '✕', icono: 'close-circle', color: colors.textMuted, fondo: '#EFE9E2' }, // 5.83:1
  futura: { etiqueta: 'Próxima', simbolo: '○', icono: 'time-outline', color: colors.textBody, fondo: null },
};

// Preferencia «Contraste alto» (Cuenta › Preferencias): tinta más oscura, superficies blancas, sin decoración.
export const colorAltoContraste = {
  ...color,
  fondo: '#FFFFFF',
  cartulina: '#FFFFFF',
  arena: '#F2F0ED',
  tinta: '#1A1411', // 18.23:1
  texto: '#3F3631', // 11.78:1
  textoSuave: '#3F3631',
  linea: 'rgba(26, 20, 17, 0.45)',
  lineaFuerte: '#1A1411',
};

// ---------------------------------------------------------------------------
// Tipografía: serif (Lora 700) para títulos, Plus Jakarta Sans para la interfaz. El peso lo da la familia, nunca
// `fontWeight` (ver typography.js). Los números que se comparan (horas, dosis, contadores) van con tabular-nums.
// ---------------------------------------------------------------------------
const SERIF = 'Lora_700Bold';
const SANS = 'PlusJakartaSans_400Regular';
const SANS_MEDIA = 'PlusJakartaSans_500Medium';
const SANS_FUERTE = 'PlusJakartaSans_600SemiBold';

export const fuente = { serif: SERIF, sans: SANS, sansMedia: SANS_MEDIA, sansFuerte: SANS_FUERTE };

export const texto = {
  pantalla: { fontFamily: SERIF, fontSize: 32, lineHeight: 40 }, // título de pantalla (h1)
  seccion: { fontFamily: SERIF, fontSize: 22, lineHeight: 30 }, // título de tarjeta protagonista / sección (h2)
  tarjeta: { fontFamily: SERIF, fontSize: 18, lineHeight: 24 }, // título de tarjeta (h3)
  nombre: { fontFamily: SANS_MEDIA, fontSize: 17, lineHeight: 24 }, // nombre de integrante, título de evento
  cuerpo: { fontFamily: SANS, fontSize: 16, lineHeight: 24 },
  cuerpoChico: { fontFamily: SANS, fontSize: 14, lineHeight: 20 },
  etiqueta: { fontFamily: SANS_MEDIA, fontSize: 15, lineHeight: 20 }, // botones, chips, pestañas
  meta: { fontFamily: SANS, fontSize: 13, lineHeight: 18 }, // datos secundarios (mínimo de la app)
  sobretitulo: { fontFamily: SANS_FUERTE, fontSize: 13, lineHeight: 18, letterSpacing: 0.4 }, // «HOY · VIERNES 27»
  dato: { fontFamily: SANS_FUERTE, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }, // sangre, contadores grandes
  hora: { fontFamily: SANS_FUERTE, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
};

// ---------------------------------------------------------------------------
// Espaciado (múltiplos de 4) y radios
// ---------------------------------------------------------------------------
export const espacio = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 };

export const radio = {
  etiqueta: 8, // toasts, chips cuadrados
  control: 10, // inputs, botones
  tarjeta: 16, // tarjetas de papel
  contenedor: 24, // paneles, modales, hojas inferiores
  pastilla: 999,
};

// Objetivos táctiles: 44 mínimo (WCAG 2.5.5 / pedido del proyecto), 48 para acciones frecuentes (Dar, Llamar).
export const tactil = { minimo: 44, comodo: 48, fab: 56 };

// ---------------------------------------------------------------------------
// Papel: elevación, hojas y bordes
// ---------------------------------------------------------------------------
// Sombras de papel apilado: capas duras desplazadas, sin blur. Nivel 1 = tarjeta apoyada, 2 = protagonista,
// 3 = flotante (menús, toasts). En web se aplican por CSS (theme/paper.js); en nativo, una sombra dura.
export const elevacion = {
  web: SOMBRA_PAPEL,
  nativa: SOMBRA_NATIVA,
  // En web la sombra la pone el CSS: usar `paper('papel', 'p1')` de theme/paper.js (o PaperCard). Esto cubre nativo.
  estilo(nivel = 1) {
    return Platform.OS === 'web' ? null : SOMBRA_NATIVA[nivel];
  },
};

// La hoja de color que asoma detrás de las tarjetas destacadas: ±1° y 6 px de desplazamiento.
export const hoja = {
  giro: 1,
  desplazamiento: 6,
  colores: { terracota: '#E3A28C', salvia: '#A7C2B3', mostaza: '#E8C078', rosa: color.rosa, arena: '#E4D6C6' },
};

// ---------------------------------------------------------------------------
// Movimiento: corto y sin rebotes sobre datos. Con «reducir movimiento» no hay desplazamientos ni escalas.
// ---------------------------------------------------------------------------
export const movimiento = {
  rapido: 120, // respuesta a un toque
  base: 170, // la hoja se levanta al pasar el mouse (150–200 ms)
  lento: 240, // entrada de menús y toasts
  curva: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
  elevar: 2, // px que sube la hoja
};
