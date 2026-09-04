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
  sageDeep: '#4C6B4F',      // NUEVO valor — verde salvia profundo, el acento en sí (era #B9D8B6, tono liviano)
  sagePressed: '#3D5940',   // NUEVO token — estado presionado del acento salvia

  // Acento primario — "urgente / necesita atención". Ocupa el lugar que
  // tenía el acento decorativo gold/tan; se mantienen los nombres viejos
  // (lime/limeDeep) para no romper imports, pero ahora son terracota.
  ink: '#2B2417',           // negro cálido — texto primario, FAB (era #000000 puro)
  inkSoft: '#2B2417',       // mismo valor que ink — la migración 1 ya los usaba como alias entre sí (era #1C1C1C)
  onAccent: '#FFFFFF',      // texto/ícono sobre un fill sólido de acento (ink/blueDeep/navy/etc.) — antes literal '#FFFFFF' repetido por call-site
  lime: '#D9603A',          // terracota — CTAs/estados activos/urgente (era gold/tan #D9B779, antes eso reemplazó al neón)
  limeDeep: '#B4491F',      // estado presionado/hover del acento terracota (era gold/tan #B8935A)

  // Tintes de avatar por tipo de integrante — gold suave para "adulto"
  // (dado explícito en el brief, no se deriva matemáticamente de terracota:
  // es una familia cálida propia, no confundir con `lime`). Para "menor" no
  // se agrega token nuevo — reusar sage/sageDeep directamente, tal como
  // pide el criterio de "no inventar familias nuevas".
  avatarAdultBg: '#F0D9B5',   // NUEVO — fondo de avatar para integrantes tipo 'adulto'
  avatarAdultText: '#8A5A20', // NUEVO — texto/ícono sobre avatarAdultBg

  // Tercera familia — 'mayor' (adulto mayor) ya no comparte la de 'adulto'.
  // Taupe/arcilla cálido: mismo lenguaje tierra que el resto de la paleta,
  // pero deliberadamente apagado (no dorado, no verde) para no pisar el
  // significado semántico de terracota (urgencia) ni de sage (saludable) —
  // esto es sólo una categoría demográfica, no un estado.
  avatarSeniorBg: '#D9C7B8',   // NUEVO — fondo de avatar para integrantes tipo 'mayor'
  avatarSeniorText: '#6B5744', // NUEVO — texto/ícono sobre avatarSeniorBg

  // Superficies de card — de vidrio translúcido a blanco sólido plano.
  // Los 4 nombres se mantienen (los importan Login/Register/FamilyListScreen
  // y los inputs de FormField/DatePickerField) pero ya no llevan alpha.
  glassFill: '#FFFFFF',        // era 'rgba(255,255,255,0.6)' — blanco sólido, no más translúcido
  glassFillStrong: '#FFFFFF',  // era 'rgba(255,255,255,0.78)'
  glassBorderSoft: '#EFE6D5',  // hairline cálido sólido (era 'rgba(255,255,255,0.35)', invisible sobre blanco sólido)
  sageTranslucent: 'rgba(214,226,214,0.55)', // track de SegmentedControl — mismo rgb que el nuevo `sage`, alpha sin cambios
  // Fix post-migración 2: el repunte anterior había igualado este valor a
  // textMuted (#8A8171), perdiendo el contraste subtítulo-vs-nombre que ya
  // usan ProfileDetailScreen/FamilyListScreen. ~15% más claro que textMuted
  // hacia blanco (mismo tono cálido, no un gris distinto) — sigue siendo
  // legible sobre el crema/blanco de card, pero se lee claramente más tenue
  // que textMuted al lado de un nombre en bold.
  textMutedLight: '#9C9486',

  // --- tokens semánticos existentes, re-apuntados (NO renombrar — todas las pantallas los importan) ---
  navy: '#2B2417',          // alias de ink/inkSoft (texto de cuerpo) — era #1C1C1C
  navySoft: '#2E2E2E',      // sin uso confirmado por grep — no se re-apuntó, no estaba en el brief
  blue: '#3B82F6',          // sin uso actual confirmado por grep; se mantiene por compat
  blueDeep: '#2B2417',      // FAB/spinners "negro" — re-apuntado junto con ink para que sigan siendo el mismo negro visual (era #000000 puro)
  blueLight: '#9CC9FF',     // sin consumidores — GroupSetupScreen.js migró su brandMark a colors.lime; se deja el token, no se borra
  green: '#4C6B4F',         // "éxito" ahora es el mismo verde salvia profundo que el acento secundario (era #10B981) — ver resumen, es una inferencia
  greenDeep: '#3D5940',     // idem, estado presionado (era #059669)
  amber: '#F59E0B',         // sin consumidores tras repuntar reminderBadge.medicacion a terracota — se deja el valor viejo, no se borra el token
  bg: '#FBF6EE',            // alias de bgBase (era #F4F5F4)
  glass: '#FFFFFF',         // era 'rgba(255,255,255,0.6)'
  glassStrong: '#FFFFFF',   // era 'rgba(255,255,255,0.92)'
  glassBorder: '#E3D6BE',   // borde de inputs, cálido (era #E3E8EF, frío)
  textMuted: '#8A8171',     // gris cálido (reemplaza el viejo #5A5F58) — más oscuro que textMutedLight, ver ese token
  line: '#E8DFCE',          // hairline cálido para el fondo crema (era #DDE3DC, frío)
  error: '#DC2626',         // semántico, no se toca
  errorBg: '#FEF2F2',

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
// el texto. CalendarScreen sólo busca esto por `tipo` (reminderBadge[item.tipo],
// con tipo ∈ {vacuna, control, medicacion}) — NO hay hoy un campo de estado
// "vencido/atrasado" en ningún lado del modelo ni del componente. La clave
// `vencido` de abajo es únicamente scaffolding de token para cuando se
// agregue esa lógica (comparar fecha_hora contra "ahora" en CalendarScreen);
// hasta que eso se escriba, esta clave no la lee nadie.
export const reminderBadge = {
  vacuna: { bg: colors.avatarAdultBg, text: colors.avatarAdultText }, // era azul frío — reusa la familia gold de avatar en vez de inventar una tercera
  control: { bg: colors.sage, text: colors.sageDeep },                // ya usaba sage; texto actualizado de un verde hardcodeado a colors.sageDeep
  medicacion: { bg: '#F7DED2', text: colors.limeDeep },               // era ámbar — ahora familia terracota ("necesita atención")
  vencido: { bg: '#F7DED2', text: colors.limeDeep },                  // NUEVO — no consumido todavía, ver nota arriba
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

// Bundle de estilo reutilizable para el panel de vidrio (tarjetas
// glassmorphism). Con la migración 2, `glass`/`glassBorderSoft` ya apuntan a
// blanco sólido + hairline cálido, así que esto sigue funcionando para los
// 3 consumidores que quedan (LoginScreen, RegisterScreen, FamilyListScreen —
// confirmado por grep) pero ya no tiene sentido conceptual como "panel de
// vidrio". Se mantiene exportado a propósito — esta pasada no toca screens,
// así que borrarlo rompería esos 3 imports. Candidato a eliminarse en el
// pase de wiring, cuando esas pantallas migren a card plana blanca.
export const glassPanel = {
  backgroundColor: colors.glass,
  borderRadius: radii.card,
  borderWidth: 1,
  borderColor: colors.glassBorderSoft,
  ...glassShadow,
};
