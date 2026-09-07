import { colors } from './colors';

// Tinte de avatar por tipo de integrante — tres familias distintas, una por
// tipo. Vivía como const local de FamilyListScreen (único consumidor hasta
// que AccountScreen sumó su propio avatar de usuario); se sube acá para que
// los dos lean el mismo mapa en vez de duplicarlo. Las mascotas (y cualquier
// entidad sin `tipo`) caen en DEFAULT_AVATAR_TINT (mismo tono que 'menor',
// sage) — ver comentario original en FamilyListScreen.
export const AVATAR_TINTS = {
  adulto: { bg: colors.avatarAdultBg, text: colors.avatarAdultText },
  mayor: { bg: colors.avatarSeniorBg, text: colors.avatarSeniorText },
  menor: { bg: colors.sage, text: colors.sageDeep },
};

export const DEFAULT_AVATAR_TINT = { bg: colors.sage, text: colors.sageDeep };

export function avatarTint(tipo) {
  return AVATAR_TINTS[tipo] || DEFAULT_AVATAR_TINT;
}
