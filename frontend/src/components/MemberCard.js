import React from 'react';
import TarjetaIntegrante from './TarjetaIntegrante';
import { plural } from '../utils/formato';

// Tarjeta de una persona de la familia. Recibe el integrante tal como viene de la API (snake_case).
//   <MemberCard integrante={i} edad={9} proximo="Amoxicilina · mañana 20:00" completitud={67}
//               onAbrir={…} onFicha={…} />
const TIPO = { menor: 'Menor', adulto: 'Adulto', mayor: 'Mayor' };

export default function MemberCard({ integrante, edad, proximo, completitud, onAbrir, onFicha }) {
  const chips = [];
  if (integrante.tipo_sangre) chips.push({ texto: integrante.tipo_sangre, tono: 'sangre', icono: 'water' });
  if (integrante.alergias) chips.push({ texto: `Alergias: ${integrante.alergias}`, tono: 'alergia' });
  const detalle = [TIPO[integrante.tipo], Number.isFinite(edad) ? plural(edad, 'año') : null].filter(Boolean).join(' · ');
  return (
    <TarjetaIntegrante
      tipoAvatar="person"
      avatarId={integrante.avatar_id}
      fotoUrl={integrante.foto_url}
      nombre={integrante.nombre}
      apellido={integrante.apellido}
      tipoEdad={integrante.tipo}
      detalle={detalle}
      chips={chips}
      proximo={proximo}
      completitud={completitud}
      onAbrir={onAbrir}
      onFicha={onFicha}
    />
  );
}
