// Paleta extraída de :root en docs/DOMUS+ Mockup.html
//
// Migración 2 — "hogareño" (2026-09, ver docs/DESIGN_SYSTEM.md): segunda
// pasada de paleta completa, sobre la migración 1 (glassmorphism/soft-UI,
// comentario debajo). Base cálida crema en vez de gris frío, dos acentos
// con rol propio (terracota = urgente/necesita atención, verde salvia
// profundo = saludable/al día) en lugar de un solo acento decorativo, y
// cards de vidrio translúcido → blanco sólido plano. Mismo criterio que la
// migración 1: los nombres de token existentes NO cambian, sólo sus
// valores — todas las pantallas ya importan por nombre.
//
// Esta pasada es SOLO tokens (este archivo) — todavía no se tocó ningún
// screen ni componente, así que visualmente la app sigue mostrando el
// look glassmorphism (paneles translúcidos, blur) hasta que se haga un
// pase de wiring aparte. Ver docs/QA_CHECKLIST.md y docs/DESIGN_SYSTEM.md
// para el detalle de qué quedó pendiente de esa segunda pasada.
//
// Migración 1 — glassmorphism/soft-UI (2026-09): tokens nuevos agregados, los
// semánticos existentes (bg, glass*, blueDeep, line, textMuted) se
// re-apuntan a la nueva paleta para que todas las pantallas hereden el
// look sin tocar cada call-site.
export const colors = {
  // --- paleta nueva (fuente de la verdad) ---
  bgBase: '#FBF6EE',        // fondo crema cálido (era #F4F5F4, gris frío) — dirección "hogareño"

  // Acento secundario — "saludable / al día" (reemplaza el rol decorativo
  // único de antes). `sage` = tinte claro de fondo, `sageDeep` = el verde
  // salvia profundo en sí (texto/íconos sobre el tinte), `sagePressed` =
  // estado presionado, más oscuro todavía.
  sage: '#D6E2D6',          // tinte claro — relleno de paneles/badges secundarios (era #D5E8D4)
  // #4C6B4F daba 4.46:1 sobre `sage` — falla AA normal-text (4.5:1) usado como
  // texto del badge "Control" (11.5px/700). Oscurecido lo mínimo (misma
  // familia, mismo hue/sat) para despejar 4.5:1 — ver auditoría WCAG.
  sageDeep: '#4B694E',      // NUEVO valor — verde salvia profundo, el acento en sí (era #B9D8B6, tono liviano)
  // sagePressed (estado presionado del acento salvia) existió acá sin
  // ningún consumidor — auditoría de tokens (ver git history si hace falta
  // el valor #3D5940) — eliminado. limeDeep es el patrón equivalente que sí
  // se wireó; si se necesita un estado pressed para sage, replicar eso.

  // Acento primario — "urgente / necesita atención". Ocupa el lugar que
  // tenía el acento decorativo gold/tan; se mantienen los nombres viejos
  // (lime/limeDeep) para no romper imports, pero ahora son terracota.
  ink: '#2B2417',           // negro cálido — texto primario, FAB (era #000000 puro)
  // inkSoft (alias de ink de la migración 1) existió acá sin ningún
  // consumidor — auditoría de tokens, eliminado (ver git history si hace
  // falta el valor).
  onAccent: '#FFFFFF',      // texto/ícono sobre un fill sólido de acento (ink/blueDeep/navy/etc.) — antes literal '#FFFFFF' repetido por call-site
  lime: '#D9603A',          // terracota — CTAs/estados activos/urgente (era gold/tan #D9B779, antes eso reemplazó al neón)
  // #B4491F daba 4.17:1 sobre el bg de reminderBadge.medicacion/vencido
  // (#F7DED2) — falla AA normal-text (4.5:1) a 11.5px/700. Oscurecido lo
  // mínimo para despejar 4.5:1 — ver auditoría WCAG.
  limeDeep: '#AA451D',      // estado presionado/hover del acento terracota (era gold/tan #B8935A)

  // Tintes de avatar por tipo de integrante — gold suave para "adulto"
  // (dado explícito en el brief, no se deriva matemáticamente de terracota:
  // es una familia cálida propia, no confundir con `lime`). Para "menor" no
  // se agrega token nuevo — reusar sage/sageDeep directamente, tal como
  // pide el criterio de "no inventar familias nuevas".
  avatarAdultBg: '#F0D9B5',   // NUEVO — fondo de avatar para integrantes tipo 'adulto'
  // #8A5A20 daba 4.29:1 sobre avatarAdultBg — falla AA normal-text (4.5:1)
  // usado como texto del badge "Vacuna" (11.5px/700). Oscurecido lo mínimo
  // para despejar 4.5:1 — ver auditoría WCAG.
  avatarAdultText: '#85561F', // NUEVO — texto/ícono sobre avatarAdultBg

  // Tercera familia — 'mayor' (adulto mayor) ya no comparte la de 'adulto'.
  // Taupe/arcilla cálido: mismo lenguaje tierra que el resto de la paleta,
  // pero deliberadamente apagado (no dorado, no verde) para no pisar el
  // significado semántico de terracota (urgencia) ni de sage (saludable) —
  // esto es sólo una categoría demográfica, no un estado.
  avatarSeniorBg: '#D9C7B8',   // NUEVO — fondo de avatar para integrantes tipo 'mayor'
  avatarSeniorText: '#6B5744', // NUEVO — texto/ícono sobre avatarSeniorBg

  // Superficies de card — de vidrio translúcido a blanco sólido plano.
  // Estos 3 nombres se mantienen (los importan Login/Register/
  // FamilyListScreen y los inputs de FormField/DatePickerField) pero ya no
  // llevan alpha. (Auditoría de tokens: el 4to de este grupo, `glassFill`,
  // no tenía ningún consumidor real pese al comentario original — eliminado.)
  glassFillStrong: '#FFFFFF',  // era 'rgba(255,255,255,0.78)'
  glassBorderSoft: '#EFE6D5',  // hairline cálido sólido (era 'rgba(255,255,255,0.35)', invisible sobre blanco sólido)
  sageTranslucent: 'rgba(214,226,214,0.55)', // track de SegmentedControl — mismo rgb que el nuevo `sage`, alpha sin cambios
  // Auditoría WCAG (contraste real, fórmula de luminancia relativa):
  // el valor "más claro" original (#9C9486) daba sólo 2.79:1 sobre bgBase —
  // falla incluso el umbral de texto grande (3:1), y sus dos usos reales
  // (memberSubt en FamilyListScreen, topbarSubt en ProfileDetailScreen) son
  // texto normal 12.5px/400, que necesita 4.5:1. "Más claro" empeora el
  // contraste sobre un fondo claro, no lo mejora — así que la única
  // dirección válida es oscurecer, igual que textMuted. Con el mismo target
  // de contraste, este valor y el de textMuted convergen casi al mismo tono;
  // se deja levemente MÁS oscuro que textMuted (no más claro, invierte el
  // nombre) para mantener dos tokens distinguibles en vez de duplicar uno.
  // La jerarquía subtítulo-vs-nombre que este token existía para proteger ya
  // la da el tamaño/peso de fuente (14.5/600 nombre vs 12.5/400 subtítulo),
  // no necesita cargarla también el color.
  textMutedLight: '#726A5D',

  // --- tokens semánticos existentes, re-apuntados (NO renombrar — todas las pantallas los importan) ---
  navy: '#2B2417',          // alias de ink (texto de cuerpo) — era #1C1C1C
  // navySoft (sin uso, sin re-apuntar durante la migración) y green ("éxito"
  // = mismo verde salvia que el acento secundario) existían acá sin ningún
  // consumidor real y sin un comentario que pidiera conservarlos — auditoría
  // de tokens, eliminados. greenDeep sigue (lo consume buttonColors.success,
  // que sí tiene consumidor real: PrimaryButton).
  blue: '#3B82F6',          // sin uso actual confirmado por grep; se mantiene por compat
  blueDeep: '#2B2417',      // FAB/spinners "negro" — re-apuntado junto con ink para que sigan siendo el mismo negro visual (era #000000 puro)
  blueLight: '#9CC9FF',     // sin consumidores — GroupSetupScreen.js migró su brandMark a colors.lime; se deja el token, no se borra
  greenDeep: '#3D5940',     // idem, estado presionado (era #059669)
  amber: '#F59E0B',         // sin consumidores tras repuntar reminderBadge.medicacion a terracota — se deja el valor viejo, no se borra el token
  bg: '#FBF6EE',            // alias de bgBase (era #F4F5F4)
  glass: '#FFFFFF',         // era 'rgba(255,255,255,0.6)'
  glassStrong: '#FFFFFF',   // era 'rgba(255,255,255,0.92)'
  glassBorder: '#E3D6BE',   // borde de inputs, cálido (era #E3E8EF, frío)
  // Auditoría WCAG: #8A8171 daba 3.58:1 sobre bgBase — falla AA normal-text
  // (4.5:1) en sus ~15 usos reales (subtítulos, labels, meta-texto, todos
  // <16px). Oscurecido lo mínimo necesario para despejar 4.5:1, mismo hue/
  // saturación cálida (no gris frío) — ver textMutedLight para el mismo
  // ajuste en su token hermano.
  textMuted: '#776F62',     // gris cálido (reemplaza el viejo #5A5F58) — más oscuro que textMutedLight, ver ese token
  line: '#E8DFCE',          // hairline cálido para el fondo crema (era #DDE3DC, frío)
  // Auditoría WCAG: #DC2626 daba 4.41:1 sobre errorBg (y 4.49:1 sobre bgBase)
  // — falla AA normal-text (4.5:1) por muy poco en ErrorBanner/fieldErrorText
  // (12.5-13px/400-600). Oscurecido lo mínimo posible (mismo hue/saturación,
  // sigue siendo EL rojo semántico de error de la app, no se corrió hacia
  // naranja/rosa) para despejar 4.5:1 — ver auditoría WCAG. Sigue siendo
  // semántico: cualquier cambio futuro debe mantener el hue y volver a
  // verificar el contraste real contra errorBg, no ajustarse a ojo.
  error: '#D92323',
  errorBg: '#FEF2F2',

  // Ícono de acción destructiva (ej. tacho de eliminar en ProfileDetailScreen)
  // — reddish-orange, deliberadamente distinto de `error` (rojo de
  // validación de formularios) y de `lime`/`limeDeep` (terracota semántico
  // de "urgente/atención" en badges y botones) para no mezclar esos tres
  // significados bajo un mismo tono.
  danger: '#E85D04',

  // preserva el azul original de blueDeep bajo su propio nombre, independiente
  // de que blueDeep ahora signifique negro/negro-cálido — sin consumidores
  // tras repuntar reminderBadge.vacuna a la familia gold, se deja el valor
  // igual, no se borra el token
  badgeBlue: '#2563EB',
};

export const radii = {
  card: 32,      // sin cambios en esta pasada — es migración de color, no de forma
  input: 16,
  button: 24,
  pill: 999,
  avatar: 999,
};

export const buttonColors = {
  primary: colors.ink,        // ahora negro cálido #2B2417 (era negro puro)
  success: colors.greenDeep,  // ahora verde salvia pressed #3D5940 (era #059669)
  accent: colors.lime,        // ahora terracota #D9603A (era gold/tan)
};

// Insignias de tipo de recordatorio (CalendarScreen) — mismo patrón que
// error/errorBg: tono suave de fondo + el color fuerte correspondiente para
// el texto. CalendarScreen busca esto por `tipo` (reminderBadge[item.tipo],
// con tipo ∈ {vacuna, control, medicacion}) para el estado normal, y por la
// clave `vencido` cuando el recordatorio está activo y su fecha_hora ya
// pasó (ver TipoBadge y el cálculo `vencido` en el renderItem de
// CalendarScreen.js) — ya wireado, no es scaffolding.
export const reminderBadge = {
  vacuna: { bg: colors.avatarAdultBg, text: colors.avatarAdultText }, // era azul frío — reusa la familia gold de avatar en vez de inventar una tercera
  control: { bg: colors.sage, text: colors.sageDeep },                // ya usaba sage; texto actualizado de un verde hardcodeado a colors.sageDeep
  medicacion: { bg: '#F7DED2', text: colors.limeDeep },               // era ámbar — ahora familia terracota ("necesita atención")
  vencido: { bg: '#F7DED2', text: colors.limeDeep },                  // consumido por TipoBadge en CalendarScreen.js
};

// "Muy sutil" per spec — el shadow anterior (opacity .1, radius 28, elevation 6)
// resultaba pesado para el look glass.
export const shadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
};

// los paneles de vidrio necesitan una sombra más liviana que las
// tarjetas sólidas (flotan, no están "apoyadas").
export const glassShadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 2,
};

// Bundle de estilo reutilizable para el panel de vidrio de pantalla completa
// (LoginScreen/RegisterScreen — el form flotando sobre authWrap). Con la
// migración 2, `glass`/`glassBorderSoft` ya apuntan a blanco sólido + hairline
// cálido, así que ya no tiene sentido conceptual como "panel de vidrio", pero
// sigue teniendo un rol propio: un panel único de pantalla completa, no una
// fila repetida en una lista (ver `cardBase` para eso). FamilyListScreen
// migró a `cardBase` en la auditoría de consolidación de cards — ya no es
// consumidor.
export const glassPanel = {
  backgroundColor: colors.glass,
  borderRadius: radii.card,
  borderWidth: 1,
  borderColor: colors.glassBorderSoft,
  ...glassShadow,
};

// Bundle compartido para una fila/card dentro de una lista (no un panel de
// pantalla completa, ver `glassPanel` arriba). Antes de esta pasada,
// `MemberCard` (FamilyListScreen), `recordCard` (ProfileDetailScreen) y `row`
// (CalendarScreen) repetían exactamente el mismo
// backgroundColor/borderWidth/borderColor/borderRadius/glassShadow a mano —
// consolidado acá. Cada consumidor sigue agregando su propio layout
// (flexDirection, padding, minHeight, marginHorizontal) encima, porque esa
// parte sí varía legítimamente según el contenido de la fila.
export const cardBase = {
  backgroundColor: colors.glassStrong,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radii.card,
  ...glassShadow,
};
