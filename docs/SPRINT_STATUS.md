# DOMUS+ — Estado del backlog

## Completado

| Track | Tareas | Qué se hizo |
|---|---|---|
| Project Setup | SET-1 a SET-4 | axios, expo-secure-store, async-storage instalados; `env.js` (resolución de API_URL por plataforma), `session.js` (persistencia de sesión), `client.js` (instancia Axios con interceptors) |
| State | STA-1 a STA-3 | `AuthContext` (login/register/logout, boot con rehydrate), `FamilyContext` (integrantes/mascotas), wireado de `setUnauthorizedHandler` a `logout()` |
| Navigation | NAV-1 a NAV-3 | `App.js` con ramas condicionales por estado de auth (splash/auth-stack/onboarding/MainTabs); stacks de Familia y Calendario con las pantallas de alta |
| API Integration | API-1 a API-5 | Login, Register, GroupSetup (con manejo de 409), FamilyList (datos reales), AddMember (incluye el fix de nombre/apellido separados) |
| UI Components | UI-1 a UI-6 | Componentes compartidos extraídos (FormField, PrimaryButton, SegmentedControl, ErrorBanner, EmptyState); ProfileDetail reescrito como hub de salud; AddVaccine/AddTreatment reales; Calendar + AddReminder reales; Account con logout |
| Bugfixes | — | SecureStore no soportado en web (fallback a AsyncStorage); `API_URL` resolvía mal en web (siempre caía a la IP LAN, ahora localhost tiene prioridad) |
| UX post-MVP | — | `DatePickerField.js` compartido reemplaza los inputs de texto enmascarados; picker nativo en mobile, `<input type="date"/"time">` como fallback en web |

## Pendiente / conocido

- **Confirmación antes de logout**: no se implementó (fuera de
  alcance del MVP), marcado como mejora futura.
- **Variant "danger" en `PrimaryButton`**: no existe todavía; el botón
  de logout usa `secondary` como aproximación.
- **IDOR en `saludController`** (ver `API_NOTES.md`, item 6) — pendiente
  del lado del backend, no resuelto.
- **iOS**: la app se probó en web y Android físico. No se validó
  todavía en simulador/dispositivo iOS.
- **TypeScript**: migración diferida a propósito, no reevaluar sin que
  se pida explícitamente.

## Convención de numeración

Los IDs de tareas (`SET-n`, `STA-n`, `NAV-n`, `API-n`, `UI-n`) vienen
del plan de arquitectura original y se mantienen para que cualquier
sesión nueva pueda ubicar de qué parte del trabajo se está hablando
sin tener que releer todo el historial de chat.
