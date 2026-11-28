# AGENTS.md — DOMUS+

Las instrucciones para agentes de IA de este repo están en **[CLAUDE.md](./CLAUDE.md)**.
Leelo completo antes de hacer cambios: aplica igual a cualquier herramienta (Codex, Cursor,
Copilot, Gemini, etc.).

Resumen mínimo:

- Idioma: español rioplatense (código, comentarios, errores, commits).
- Backend: Express + Prisma + PostgreSQL. Toda respuesta usa `{ codigo, estado, datos }`.
- Toda consulta se filtra por el grupo familiar del usuario autenticado (ver "Seguridad" en CLAUDE.md).
- Dos roles: en la familia (`dueno|miembro`) y en el sistema (`usuario|admin`). El admin sólo ve
  estadísticas globales y el registro de actividad, nunca datos médicos.
- Un endpoint de escritura nuevo se agrega a `RUTAS` en `backend/src/utils/actividad.js` (registro de actividad).
- Frontend: Expo SDK 51. `Alert.alert` no funciona en web → usar `src/utils/confirm.js`.
- Lo que falta del front (para el revamp) está en CLAUDE.md → **"Pendientes del front"**.
- Pruebas de la API: `docs/DOMUS+ API.postman_collection.json` + `docs/CASOS_DE_PRUEBA_API.md`.
- Un push a `main` que toque `frontend/**` publica una actualización OTA: trabajar en ramas.
