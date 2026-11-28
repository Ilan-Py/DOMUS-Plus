// Textos que se repiten en 3 o más lugares (docs/ux/05-copy.md §8). El resto vive en cada pantalla.

// Cerrar sesión: mismo texto en el menú de la barra lateral, en Cuenta y en el alta del grupo (COP-05).
export const CERRAR_SESION = {
  titulo: '¿Cerrar sesión en este dispositivo?',
  mensaje: 'Tus datos quedan guardados y podés volver a entrar cuando quieras.',
  boton: 'Cerrar sesión',
};

// Rol dentro de la familia (docs/ux/05-copy.md §3, D3). En la base: `dueno | miembro`.
// «Dueño» tenía género y sonaba a propiedad; «Coordina» queda reservado para cuando exista el rol (CTA-07).
export function nombreDeRol(rol) {
  return rol === 'dueno' || rol === 'dueño' ? 'Creó el grupo' : 'Puede editar';
}
