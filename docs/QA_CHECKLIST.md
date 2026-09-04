# DOMUS+ — Checklist de revisión completa (pendiente)

Hasta ahora los bugs y desvíos de diseño se fueron encontrando pantalla
por pantalla, a partir de capturas puntuales. Este archivo junta esos
hallazgos y agrega categorías que todavía no se revisaron de forma
sistemática — pensado para una futura sesión (o varias) que haga un
barrido completo en vez de reaccionar a una captura a la vez.

## Formateo de datos (alta prioridad — ya se encontró 1 caso real)

- [ ] Grepear todos los lugares donde se renderiza un campo de fecha
  (`fecha_aplicacion`, `proxima_dosis`, `fecha_inicio`, `fecha_fin`,
  `fecha_nacimiento`, `fecha_hora`) y confirmar que TODOS pasan por un
  formateador legible, no por el string crudo del backend. Ya se
  encontró un caso así en `VaccineRow`/`TreatmentRow`.
- [ ] Confirmar que los mismos campos no muestran hora cuando el dato
  es date-only (evitar el patrón `2026-09-02T03:00:00.000Z` en
  cualquier pantalla, no solo las dos ya corregidas).
- [ ] Revisar capitalización de texto libre ingresado por el usuario
  (nombres de vacunas, descripciones de tratamientos, nombres de
  integrantes/mascotas) — decidir una política consistente (sentence
  case al mostrar, o normalizar al guardar) en vez de mostrar
  exactamente lo que se tipeó.

## Consistencia del sistema de diseño (glassmorphism/gold)

- [ ] Recorrer las pantallas que todavía NO pasaron por una revisión
  visual real: `GroupSetupScreen`, `AddMemberScreen`, `CalendarScreen`,
  `AddVaccineScreen`, `AddTreatmentScreen`, `AddReminderScreen`,
  `AccountScreen` — la mayoría del trabajo de restyle se concentró en
  `Login`/`Register`/`ProfileDetailScreen`/`FamilyListScreen`.
- [ ] Confirmar que ninguna pantalla tiene un fondo sólido "de
  fábrica" (blanco u otro) por detrás del contenedor de navegación —
  el bug del seam en `ProfileDetailScreen` (causado por
  `contentStyle`/`sceneContainerStyle` de React Navigation) puede
  repetirse en cualquier pantalla que no se revisó todavía.
- [ ] Revisar si el patrón `BackgroundBlobs` (extraído tras el tercer
  uso) debería aplicarse también a las pantallas de navegación con
  tabs, y evaluar si conviene promoverlo a un layer verdaderamente
  global (quedó señalado como pendiente, no resuelto).
- [ ] Confirmar consistencia de `colors.textMutedLight` vs
  `colors.textMuted` en cualquier otro subtítulo de la app que no sea
  `ProfileDetailScreen`/`FamilyListScreen`.
- [ ] Revisar los 3 FABs (`ProfileDetail`, `Calendar`, `FamilyList`) en
  un dispositivo real — su posición (`bottom: 90`) fue una estimación
  razonada, no medida, especialmente en iOS por el safe-area del home
  indicator.

## Accesibilidad

- [ ] El foco de teclado/lector de pantalla en `FormField` (arreglado
  el outline azul del navegador, agregado un estado de foco propio) —
  confirmar que se ve bien y es suficientemente visible en los 7+
  lugares donde se usa.
- [ ] Contraste de texto en las nuevas superficies de vidrio
  (`glassFillStrong`, `glassPanel`) contra fondos con blur real, no
  solo el valor calculado en abstracto.
- [ ] Tamaños de touch target de los FABs e íconos de la tab bar
  (mínimo recomendado ~44x44).

## Plataformas sin probar

- [ ] iOS real (simulador o dispositivo) — toda la validación hasta
  ahora fue en web y Android físico.
- [ ] Comportamiento del picker de fecha/hora nativo en iOS
  (`display="spinner"`, botón "Listo") — verificado por lectura de
  código, no por ejecución real.

## Deuda técnica ya identificada (no visual)

- [ ] IDOR en `saludController` — cualquier usuario autenticado puede
  leer/escribir historial de otra familia cambiando un id (ver
  `API_NOTES.md`). Requiere cambio de backend.
- [ ] No hay validación server-side que ate `tipo` a
  `fecha_nacimiento` en integrantes — nada impide crear un "adulto" de
  5 años.
- [ ] Falta variant "danger"/destructivo en `PrimaryButton` — el botón
  de logout usa `secondary` como aproximación.
- [ ] Falta confirmación antes de cerrar sesión (fuera de alcance del
  MVP original, sigue pendiente).
- [ ] Migración a TypeScript — diferida a propósito, no reevaluar sin
  pedido explícito.

## Ilustración de mascotas (creativo, no bug)

- [ ] Instalar `react-native-svg` y convertir el concepto aprobado
  (gato negro + perro dorado sobre blob salvia) en un componente real
  cerca del header de `ProfileDetailScreen`.

---

Este archivo se actualiza a medida que se van tachando ítems o
apareciendo hallazgos nuevos — no es un documento estático de una sola
vez.
