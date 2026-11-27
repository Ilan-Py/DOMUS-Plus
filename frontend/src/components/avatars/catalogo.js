import React from 'react';
import { G, Path, Circle, Ellipse, Rect } from 'react-native-svg';

// Catálogo de avatares de recorte de papel: cada uno es un dibujo SVG liviano sobre una grilla 100×100 con
// fondo pastel de la paleta (terracota #FAECE7, salvia #E8F0EC, ocre #FDF3E1, pizarra #E6F0F3, arena #F3EAE0).
// Las piezas llevan un contorno blanco (el "corte") y se apilan en capas. El borde blanco y la sombra
// exteriores los pone EntityAvatar. Las iniciales y la huellita por defecto se resuelven aparte.
const TERRACOTA = '#C24623';
const SALVIA = '#4A6B5D';
const SALVIA_CLARO = '#6F9A86';
const OCRE = '#C88D32';
const PIZARRA = '#4F7A8C';
const PIZARRA_OSCURO = '#35596A';
const MARRON = '#4A3A32';
const PIEL = '#F1C9A8';
const TINTA = '#2A2421';

export const FONDOS = {
  terracota: '#FAECE7',
  salvia: '#E8F0EC',
  ocre: '#FDF3E1',
  pizarra: '#E6F0F3',
  arena: '#F3EAE0',
};
// Para las iniciales: fondo + color del texto, según el nombre.
export const TINTES_INICIALES = [
  { bg: FONDOS.terracota, fg: '#9A3416' },
  { bg: FONDOS.salvia, fg: '#3B5A4C' },
  { bg: FONDOS.ocre, fg: '#7A5112' },
  { bg: FONDOS.pizarra, fg: PIZARRA_OSCURO },
  { bg: FONDOS.arena, fg: '#4A3B32' },
];

// ---- piezas con contorno blanco
const CORTE = { stroke: '#FFFFFF', strokeWidth: 5, strokeLinejoin: 'round', strokeLinecap: 'round' };
const Forma = ({ d, fill }) => (
  <G>
    <Path d={d} fill="#FFFFFF" {...CORTE} />
    <Path d={d} fill={fill} />
  </G>
);
const Disco = ({ cx, cy, r, fill }) => (
  <G>
    <Circle cx={cx} cy={cy} r={r} fill="#FFFFFF" {...CORTE} />
    <Circle cx={cx} cy={cy} r={r} fill={fill} />
  </G>
);
const Ovalo = ({ cx, cy, rx, ry, fill, giro = 0 }) => (
  <G transform={giro ? `rotate(${giro} ${cx} ${cy})` : undefined}>
    <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#FFFFFF" {...CORTE} />
    <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
  </G>
);
const Ojos = ({ y = 48, sep = 9, r = 2.6 }) => (
  <>
    <Circle cx={50 - sep} cy={y} r={r} fill={TINTA} />
    <Circle cx={50 + sep} cy={y} r={r} fill={TINTA} />
  </>
);
const Sonrisa = ({ y = 58 }) => (
  <Path d={`M43 ${y} Q50 ${y + 5} 57 ${y}`} stroke="#7A3B2A" strokeWidth={2.5} strokeLinecap="round" fill="none" />
);

// ---- dibujos: cada uno devuelve { bg, el }
const ARTES = {
  'person-glasses': () => ({
    bg: FONDOS.terracota,
    el: (
      <>
        <Forma d="M14 104 Q14 72 50 72 Q86 72 86 104 Z" fill={TERRACOTA} />
        <Disco cx={50} cy={48} r={20} fill={PIEL} />
        <Forma d="M30 46 Q30 24 50 24 Q70 24 70 46 Q62 36 50 36 Q38 36 30 46 Z" fill={MARRON} />
        <G stroke={TINTA} strokeWidth={3} fill="none">
          <Circle cx={42} cy={51} r={7} />
          <Circle cx={58} cy={51} r={7} />
          <Path d="M49 50.5 H51" />
        </G>
        <Sonrisa y={61} />
      </>
    ),
  }),
  'senior-glasses': () => ({
    bg: FONDOS.arena,
    el: (
      <>
        <Forma d="M14 104 Q14 72 50 72 Q86 72 86 104 Z" fill={SALVIA} />
        <Forma d="M28 52 Q24 24 50 24 Q76 24 72 52 Q68 38 50 38 Q32 38 28 52 Z" fill="#CFC8C0" />
        <Disco cx={50} cy={50} r={20} fill={PIEL} />
        <Forma d="M31 48 Q32 32 50 31 Q68 32 69 48 Q60 38 50 38 Q40 38 31 48 Z" fill="#CFC8C0" />
        <G stroke={TINTA} strokeWidth={3} fill="none">
          <Circle cx={41.5} cy={51} r={8} />
          <Circle cx={58.5} cy={51} r={8} />
          <Path d="M49.5 50 Q50 48.5 50.5 50" />
        </G>
        <Sonrisa y={63} />
      </>
    ),
  }),
  'person-minimal': () => ({
    bg: FONDOS.salvia,
    el: (
      <>
        <Forma d="M20 104 A30 30 0 0 1 80 104 Z" fill={SALVIA} />
        <Disco cx={50} cy={46} r={18} fill={OCRE} />
      </>
    ),
  }),
  'person-beard': () => ({
    bg: FONDOS.ocre,
    el: (
      <>
        <Forma d="M14 104 Q14 72 50 72 Q86 72 86 104 Z" fill={PIZARRA} />
        <Disco cx={50} cy={48} r={20} fill={PIEL} />
        <Forma d="M30 54 Q30 77 50 77 Q70 77 70 54 Q62 64 50 64 Q38 64 30 54 Z" fill={MARRON} />
        <Forma d="M30 44 Q29 23 50 23 Q71 23 70 44 Q62 33 50 33 Q38 33 30 44 Z" fill={MARRON} />
        <Ojos y={48} />
      </>
    ),
  }),
  'paw-default': () => ({
    bg: FONDOS.salvia,
    el: (
      <G transform="translate(18 18) scale(0.64)">
        <Path d="M50 50 C36 50 23 63 26 76 C28 87 40 87 50 82 C60 87 72 87 74 76 C77 63 64 50 50 50 Z" fill={SALVIA} />
        <Ellipse cx={21} cy={45} rx={9} ry={12} fill={SALVIA} />
        <Ellipse cx={39} cy={25} rx={9} ry={13} fill={SALVIA} />
        <Ellipse cx={61} cy={25} rx={9} ry={13} fill={SALVIA} />
        <Ellipse cx={79} cy={45} rx={9} ry={12} fill={SALVIA} />
      </G>
    ),
  }),
  'dog-floppy': () => ({
    bg: FONDOS.ocre,
    el: (
      <>
        <Ovalo cx={27} cy={54} rx={10} ry={21} fill="#8A5A2B" giro={14} />
        <Ovalo cx={73} cy={54} rx={10} ry={21} fill="#8A5A2B" giro={-14} />
        <Ovalo cx={50} cy={50} rx={23} ry={25} fill="#C98A4B" />
        <Ovalo cx={50} cy={63} rx={13} ry={10} fill="#F3DDBF" />
        <Ovalo cx={50} cy={58} rx={5.5} ry={3.8} fill={TINTA} />
        <Ojos y={45} sep={10} r={3} />
      </>
    ),
  }),
  'dog-ears': () => ({
    bg: FONDOS.terracota,
    el: (
      <>
        <Forma d="M27 46 L29 14 L46 30 Z" fill="#B5651D" />
        <Forma d="M73 46 L71 14 L54 30 Z" fill="#B5651D" />
        <Ovalo cx={50} cy={52} rx={24} ry={23} fill="#D9803A" />
        <Ovalo cx={50} cy={64} rx={13} ry={9.5} fill="#FFF1DF" />
        <Ovalo cx={50} cy={59} rx={5.5} ry={3.8} fill={TINTA} />
        <Path d="M46 69 Q50 76 54 69 Z" fill="#E58B8B" />
        <Ojos y={46} sep={10} r={3} />
      </>
    ),
  }),
  'cat-sage': () => ({
    bg: FONDOS.salvia,
    el: (
      <>
        <Forma d="M27 48 L29 17 L46 33 Z" fill={SALVIA} />
        <Forma d="M73 48 L71 17 L54 33 Z" fill={SALVIA} />
        <Ovalo cx={50} cy={55} rx={25} ry={21} fill={SALVIA_CLARO} />
        <Path d="M32 40 L33 28 L41 35 Z M68 40 L67 28 L59 35 Z" fill="#F4C7B8" />
        <Ovalo cx={40} cy={52} rx={5} ry={4} fill="#F6E7C1" />
        <Ovalo cx={60} cy={52} rx={5} ry={4} fill="#F6E7C1" />
        <Ellipse cx={40} cy={52} rx={1.6} ry={3.4} fill={TINTA} />
        <Ellipse cx={60} cy={52} rx={1.6} ry={3.4} fill={TINTA} />
        <Path d="M47 61 L53 61 L50 65 Z" fill={TERRACOTA} />
        <Path d="M30 62 L16 60 M30 66 L17 70 M70 62 L84 60 M70 66 L83 70" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  }),
  'bird-slate': () => ({
    bg: FONDOS.pizarra,
    el: (
      <>
        <Forma d="M28 62 L9 52 L12 70 Z" fill={PIZARRA_OSCURO} />
        <Ovalo cx={48} cy={60} rx={27} ry={22} fill={PIZARRA} />
        <Ovalo cx={44} cy={62} rx={15} ry={9} fill={PIZARRA_OSCURO} giro={-10} />
        <Disco cx={66} cy={40} r={15} fill={PIZARRA} />
        <Forma d="M78 37 L94 42 L78 47 Z" fill={OCRE} />
        <Circle cx={69} cy={37} r={2.8} fill={TINTA} />
      </>
    ),
  }),
  'fox-ochre': () => ({
    bg: FONDOS.ocre,
    el: (
      <>
        <Forma d="M23 46 L25 13 L45 30 Z" fill={TERRACOTA} />
        <Forma d="M77 46 L75 13 L55 30 Z" fill={TERRACOTA} />
        <Forma d="M19 44 Q50 26 81 44 Q79 70 50 86 Q21 70 19 44 Z" fill="#D9803A" />
        <Path d="M19 50 Q33 72 50 86 Q28 80 19 50 Z M81 50 Q67 72 50 86 Q72 80 81 50 Z" fill="#FFF6EA" />
        <Circle cx={50} cy={80} r={4.5} fill={TINTA} />
        <Ojos y={50} sep={11} r={3} />
      </>
    ),
  }),
  'bunny-cream': () => ({
    bg: FONDOS.arena,
    el: (
      <>
        <Ovalo cx={37} cy={27} rx={8.5} ry={22} fill="#F6EBDD" giro={-6} />
        <Ovalo cx={63} cy={27} rx={8.5} ry={22} fill="#F6EBDD" giro={6} />
        <Ellipse cx={37} cy={28} rx={3.8} ry={15} fill="#F4C7B8" transform="rotate(-6 37 28)" />
        <Ellipse cx={63} cy={28} rx={3.8} ry={15} fill="#F4C7B8" transform="rotate(6 63 28)" />
        <Ovalo cx={50} cy={64} rx={25} ry={22} fill="#F6EBDD" />
        <Ojos y={60} sep={10} r={3} />
        <Ellipse cx={36} cy={69} rx={4.5} ry={3} fill="#F4C7B8" />
        <Ellipse cx={64} cy={69} rx={4.5} ry={3} fill="#F4C7B8" />
        <Path d="M47 66 L53 66 L50 70 Z" fill={TERRACOTA} />
      </>
    ),
  }),
  'turtle-sage': () => ({
    bg: FONDOS.salvia,
    el: (
      <>
        <Ovalo cx={31} cy={72} rx={8} ry={6} fill={SALVIA_CLARO} />
        <Ovalo cx={64} cy={72} rx={8} ry={6} fill={SALVIA_CLARO} />
        <Disco cx={84} cy={58} r={10} fill={SALVIA_CLARO} />
        <Forma d="M16 70 Q16 32 50 32 Q84 32 84 70 Z" fill={SALVIA} />
        <Path d="M50 32 V70 M33 40 L40 70 M67 40 L60 70 M18 60 H82" stroke={FONDOS.salvia} strokeWidth={2.5} strokeLinecap="round" fill="none" />
        <Circle cx={87} cy={56} r={2.2} fill={TINTA} />
      </>
    ),
  }),
  'glasses-minimal': () => ({
    bg: FONDOS.pizarra,
    el: (
      <G fill="#FFFFFF" fillOpacity={0.65} stroke={TINTA} strokeWidth={5} strokeLinecap="round">
        <Circle cx={33} cy={52} r={17} />
        <Circle cx={67} cy={52} r={17} />
        <Path d="M50 50 Q50 46 50 50" fill="none" />
        <Path d="M16 46 L8 40 M84 46 L92 40" fill="none" />
      </G>
    ),
  }),
  'plant-minimal': () => ({
    bg: FONDOS.salvia,
    el: (
      <>
        <Path d="M50 92 Q54 62 48 30" stroke={SALVIA} strokeWidth={4} strokeLinecap="round" fill="none" />
        <G transform="translate(52 76) rotate(58)"><Forma d="M0 0 C-9 -5 -9 -22 0 -32 C9 -22 9 -5 0 0Z" fill={SALVIA_CLARO} /></G>
        <G transform="translate(50 58) rotate(-56)"><Forma d="M0 0 C-9 -5 -9 -22 0 -32 C9 -22 9 -5 0 0Z" fill={SALVIA} /></G>
        <G transform="translate(49 42) rotate(52)"><Forma d="M0 0 C-8 -4 -8 -19 0 -28 C8 -19 8 -4 0 0Z" fill={SALVIA_CLARO} /></G>
        <G transform="translate(48 30) rotate(4)"><Forma d="M0 0 C-7 -4 -7 -16 0 -24 C7 -16 7 -4 0 0Z" fill={SALVIA} /></G>
      </>
    ),
  }),
  'sun-paper': () => {
    const rayos = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const p = (r) => `${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`;
      return `M${p(27)} L${p(38)}`;
    });
    return {
      bg: FONDOS.ocre,
      el: (
        <>
          {rayos.map((r, i) => (
            <Path key={`b${i}`} d={r} stroke="#FFFFFF" strokeWidth={13} strokeLinecap="round" />
          ))}
          {rayos.map((r, i) => (
            <Path key={`r${i}`} d={r} stroke={OCRE} strokeWidth={6} strokeLinecap="round" />
          ))}
          <Disco cx={50} cy={50} r={20} fill={OCRE} />
          <Circle cx={43} cy={47} r={2.6} fill="#FDF3E1" />
          <Circle cx={57} cy={47} r={2.6} fill="#FDF3E1" />
          <Path d="M42 55 Q50 62 58 55" stroke="#FDF3E1" strokeWidth={3} strokeLinecap="round" fill="none" />
        </>
      ),
    };
  },
};

// Lista ordenada por categoría (la usan el selector y la accesibilidad).
export const CATALOGO = {
  'initials': { label: 'Mis iniciales', categoria: 'persona' },
  'person-glasses': { label: 'Persona con lentes', categoria: 'persona' },
  'senior-glasses': { label: 'Adulto mayor con anteojos', categoria: 'persona' },
  'person-minimal': { label: 'Retrato minimalista', categoria: 'persona' },
  'person-beard': { label: 'Persona con barba', categoria: 'persona' },
  'paw-default': { label: 'Huellita', categoria: 'mascota' },
  'dog-floppy': { label: 'Perro de orejas caídas', categoria: 'mascota' },
  'dog-ears': { label: 'Perro de orejas paradas', categoria: 'mascota' },
  'cat-sage': { label: 'Gato verde', categoria: 'mascota' },
  'bird-slate': { label: 'Pájaro azul pizarra', categoria: 'mascota' },
  'fox-ochre': { label: 'Zorro', categoria: 'mascota' },
  'bunny-cream': { label: 'Conejo', categoria: 'mascota' },
  'turtle-sage': { label: 'Tortuga', categoria: 'mascota' },
  'glasses-minimal': { label: 'Lentes', categoria: 'objeto' },
  'plant-minimal': { label: 'Plantita', categoria: 'objeto' },
  'sun-paper': { label: 'Sol', categoria: 'objeto' },
};

// Opciones que muestra cada selector.
export const OPCIONES = {
  person: ['initials', 'person-glasses', 'senior-glasses', 'person-minimal', 'person-beard', 'glasses-minimal', 'plant-minimal', 'sun-paper'],
  pet: ['paw-default', 'dog-floppy', 'dog-ears', 'cat-sage', 'bird-slate', 'fox-ochre', 'bunny-cream', 'turtle-sage'],
  all: ['initials', 'person-glasses', 'senior-glasses', 'person-minimal', 'person-beard', 'dog-floppy', 'cat-sage', 'bird-slate', 'fox-ochre', 'glasses-minimal', 'plant-minimal', 'sun-paper'],
};

// Dibujo de un avatar del catálogo (sin "initials" ni null). Devuelve { bg, el } o null.
export function arteDe(id) {
  const f = ARTES[id];
  return f ? f() : null;
}

export { Rect };
