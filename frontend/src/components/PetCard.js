import React from 'react';
import TarjetaIntegrante from './TarjetaIntegrante';
import { plural } from '../utils/formato';

// Tarjeta de una mascota: mismo tratamiento que MemberCard (mismo tamaño, mismas acciones), con especie, raza y el
// estado de las vacunas.
//   vacunas: 'al_dia' | 'proxima' | 'vencida' | null
//   <PetCard mascota={m} edad={6} vacunas="proxima" proximo="Antirrábica · en 45 días" onAbrir={…} onFicha={…} />
const VACUNAS = {
  al_dia: { texto: 'Vacunas al día', tono: 'ok', icono: 'shield-checkmark' },
  proxima: { texto: 'Vacuna próxima', tono: 'alergia', icono: 'shield-outline' },
  vencida: { texto: 'Vacuna vencida', tono: 'alerta', icono: 'alert-circle' },
};

export default function PetCard({ mascota, edad, vacunas, proximo, completitud = 100, onAbrir, onFicha }) {
  const chips = [];
  if (vacunas && VACUNAS[vacunas]) chips.push(VACUNAS[vacunas]);
  const especie = mascota.especie && mascota.especie.toLowerCase() !== 'otro' ? mascota.especie : 'Mascota';
  const detalle = [especie, mascota.raza, Number.isFinite(edad) ? plural(edad, 'año') : null].filter(Boolean).join(' · ');
  return (
    <TarjetaIntegrante
      tipoAvatar="pet"
      avatarId={mascota.avatar_id}
      fotoUrl={mascota.foto_url}
      nombre={mascota.nombre}
      detalle={detalle}
      chips={chips}
      proximo={proximo}
      completitud={completitud}
      onAbrir={onAbrir}
      onFicha={onFicha}
    />
  );
}
