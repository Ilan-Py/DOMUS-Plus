import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PaperCard from './PaperCard';
import PressScale from './PressScale';
import EntityAvatar from './EntityAvatar';
import { color, texto, espacio, radio, tactil } from '../theme/tokens';

// Base compartida de MemberCard y PetCard: personas y mascotas tienen el mismo tratamiento (avatar, nombre, detalle,
// chips, lo próximo y la ficha). Un solo acento por tarjeta (el avatar y los chips): sin barra lateral ni hoja.
//
// La acción principal es la ficha: «Ficha» si está completa, «Completar ficha» (con la barra de progreso) si no.
// Tocar el nombre abre el detalle.
export function Chip({ children, tono = 'neutro', icono }) {
  const t = TONOS_CHIP[tono] || TONOS_CHIP.neutro;
  return (
    <View style={[estilos.chip, { backgroundColor: t.fondo }]}>
      {!!icono && <Ionicons name={icono} size={14} color={t.texto} />}
      <Text style={[texto.meta, estilos.chipTexto, { color: t.texto }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const TONOS_CHIP = {
  neutro: { fondo: '#F2EAE1', texto: '#4A3B32' },
  sangre: { fondo: '#FDF2F0', texto: '#A6291B' },
  alergia: { fondo: '#FDF3E1', texto: '#7A5112' },
  ok: { fondo: color.salviaPalido, texto: color.salviaTexto },
  alerta: { fondo: color.terracotaPalido, texto: '#9A3416' },
};

export default function TarjetaIntegrante({
  tipoAvatar = 'person',
  avatarId,
  fotoUrl,
  nombre,
  apellido,
  tipoEdad,
  detalle,
  chips = [],
  proximo,
  completitud = 100,
  onAbrir,
  onFicha,
}) {
  const completa = completitud >= 100;
  const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ');
  return (
    <PaperCard nivel={1} style={estilos.card}>
      <PressScale contentStyle={estilos.cabecera} onPress={onAbrir} accessibilityLabel={`${nombreCompleto}, ${detalle}. Ver detalle`}>
        <EntityAvatar avatarId={avatarId} fotoUrl={fotoUrl} type={tipoAvatar} name={nombre} apellido={apellido} tipo={tipoEdad} size={48} />
        <View style={estilos.nombres}>
          <Text style={[texto.nombre, { color: color.tinta }]} numberOfLines={1}>{nombreCompleto}</Text>
          <Text style={[texto.cuerpoChico, { color: color.texto }]} numberOfLines={1}>{detalle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color.texto} />
      </PressScale>

      {chips.length > 0 && (
        <View style={estilos.chips}>
          {chips.map((c) => (
            <Chip key={c.texto} tono={c.tono} icono={c.icono}>{c.texto}</Chip>
          ))}
        </View>
      )}

      {!!proximo && (
        <View style={estilos.proximo}>
          <Ionicons name="time-outline" size={16} color={color.texto} />
          <Text style={[texto.cuerpoChico, { color: color.texto, flex: 1 }]} numberOfLines={1}>{proximo}</Text>
        </View>
      )}

      {!completa && (
        <View style={estilos.progreso} accessibilityRole="progressbar" accessibilityLabel={`Ficha al ${completitud} %`} accessibilityValue={{ min: 0, max: 100, now: completitud }}>
          <View style={estilos.progresoCab}>
            <Text style={[texto.meta, { color: color.texto }]}>Ficha de emergencia</Text>
            <Text style={[texto.meta, estilos.porcentaje]}>{completitud} %</Text>
          </View>
          <View style={estilos.pista}>
            <View style={[estilos.relleno, { width: `${completitud}%` }]} />
          </View>
        </View>
      )}

      <PressScale
        contentStyle={[estilos.ficha, !completa && estilos.fichaCompletar]}
        onPress={onFicha}
        accessibilityLabel={completa ? `Ficha de emergencia de ${nombreCompleto}` : `Completar la ficha de emergencia de ${nombreCompleto}`}
      >
        <Ionicons name={completa ? 'medkit-outline' : 'create-outline'} size={18} color={completa ? color.terracotaTexto : color.sobreColor} />
        <Text style={[texto.etiqueta, { color: completa ? color.terracotaTexto : color.sobreColor }]}>{completa ? 'Ficha' : 'Completar ficha'}</Text>
      </PressScale>
    </PaperCard>
  );
}

const estilos = StyleSheet.create({
  card: { padding: espacio[4], gap: espacio[3] },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio[3], minHeight: tactil.minimo, borderRadius: radio.control },
  nombres: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%', paddingHorizontal: espacio[2], paddingVertical: 2, borderRadius: radio.etiqueta },
  chipTexto: { fontFamily: 'PlusJakartaSans_500Medium', flexShrink: 1 },
  proximo: { flexDirection: 'row', alignItems: 'center', gap: espacio[2] },
  progreso: { gap: espacio[1] },
  progresoCab: { flexDirection: 'row', justifyContent: 'space-between' },
  porcentaje: { color: color.tinta, fontVariant: ['tabular-nums'] },
  pista: { height: 6, borderRadius: 3, backgroundColor: '#EFE6DA', overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 3, backgroundColor: color.salvia },
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio[2],
    minHeight: tactil.minimo,
    borderRadius: radio.control,
    borderWidth: 1,
    borderColor: 'rgba(194, 70, 35, 0.35)',
    backgroundColor: color.cartulina,
  },
  fichaCompletar: { backgroundColor: color.terracota, borderColor: color.terracota },
});
