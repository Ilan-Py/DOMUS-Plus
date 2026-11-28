import { colors } from './colors';

// Tinte de avatar por tipo de integrante — tres familias distintas, una por
// tipo. Vivía como const local de FamilyListScreen (único consumidor hasta
// que AccountScreen sumó su propio avatar de usuario); se sube acá para que
// los dos lean el mismo mapa en vez de duplicarlo. Las mascotas (y cualquier
// entidad sin `tipo`) caen en DEFAULT_AVATAR_TINT (mismo tono que 'menor',
// sage) — ver comentario original en FamilyListScreen.
export const AVATAR_TINTS = {
  adulto: { bg: '#FBE5D8', text: '#A64B2A' }, // durazno suave
  menor: { bg: '#FDF1D6', text: '#85561F' }, // amarillo miel suave · texto 5,59:1 (FAM-06; antes #9A6B16, 4,17:1)
  mayor: { bg: '#EFE8F2', text: '#5E4B66' }, // lavanda cálida
  mascota: { bg: colors.salviaSoft, text: colors.salvia }, // verde salvia (paleta de mascotas)
};

export const DEFAULT_AVATAR_TINT = AVATAR_TINTS.mascota;

export function avatarTint(tipo) {
  return AVATAR_TINTS[tipo] || DEFAULT_AVATAR_TINT;
}
