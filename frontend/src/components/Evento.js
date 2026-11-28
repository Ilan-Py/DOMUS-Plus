import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import PressScale from './PressScale';
import EntityAvatar from './EntityAvatar';
import { tipoDeAviso } from '../utils/avisos';

// Evento reutilizable (agenda, pendientes, lista): ícono y color por tipo, hora, título, ↻ si es recurrente,
// avatar de quién es y, a la derecha, las acciones (`children`). Tocar el texto abre el detalle (`onPress`);
// las acciones son controles hermanos, nunca anidados dentro del botón.
//   item: recordatorio de la API · fecha: Date · dueno: { nombre, apellido, avatarId, clase } | null
export default function Evento({ item, fecha, dueno, hecho, vencido, mostrarDia, onPress, children }) {
  const t = tipoDeAviso(item.tipo);
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dia = mostrarDia ? `${fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} · ` : '';
  const titulo = item.descripcion || t.label;
  return (
    <View style={[estilos.fila, hecho && estilos.hecho]}>
      <View pointerEvents="none" style={[estilos.barra, { backgroundColor: t.fg }]} />
      <PressScale
        style={estilos.press}
        contentStyle={estilos.pressContenido}
        onPress={onPress}
        accessibilityLabel={`${titulo}, ${dia}${hora}${item.serie_id ? ', se repite' : ''}${dueno ? `, de ${dueno.nombre}` : ''}`}
      >
        <View style={[estilos.icono, { backgroundColor: t.bg }]}>
          <Ionicons name={t.icon} size={20} color={t.fg} />
        </View>
        <View style={estilos.texto}>
          <View style={estilos.cab}>
            <Text style={estilos.hora}>{dia}{hora}</Text>
            <View style={[estilos.tipo, { backgroundColor: t.bg }]}>
              <Text style={[estilos.tipoTexto, { color: t.texto }]}>{t.label}</Text>
            </View>
            {!!item.serie_id && <Ionicons name="repeat" size={16} color={colors.textBody} accessibilityLabel="Se repite" />}
            {vencido && <Text style={estilos.vencido}>Sin marcar</Text>}
          </View>
          <Text style={[estilos.titulo, hecho && estilos.tituloHecho]} numberOfLines={2}>{titulo}</Text>
          {!!dueno && (
            <View style={estilos.quien}>
              <EntityAvatar avatarId={dueno.avatarId} type={dueno.clase === 'mascota' ? 'pet' : 'person'} name={dueno.nombre} apellido={dueno.apellido} size={22} />
              <Text style={estilos.quienTexto}>{dueno.nombre}</Text>
            </View>
          )}
        </View>
      </PressScale>
      {!!children && <View style={estilos.acciones}>{children}</View>}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(42, 36, 33, 0.08)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  hecho: { opacity: 0.7 },
  barra: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4 },
  press: { flex: 1, minWidth: 200 },
  pressContenido: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, minHeight: 64 },
  icono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, minWidth: 0, gap: 3 },
  cab: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  hora: { fontSize: 15, fontFamily: poppinsWeight('700'), color: colors.ink, fontVariant: ['tabular-nums'] },
  tipo: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tipoTexto: { fontSize: 12, lineHeight: 16, fontFamily: poppinsWeight('600') },
  vencido: { fontSize: 13, fontFamily: poppinsWeight('600'), color: '#9A3416' },
  titulo: { fontSize: 15, lineHeight: 21, color: colors.ink },
  tituloHecho: { textDecorationLine: 'line-through', color: colors.textBody },
  quien: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quienTexto: { fontSize: 13, lineHeight: 18, color: colors.textBody },
  acciones: { flexDirection: 'row', gap: 8, paddingBottom: 8, paddingLeft: 16 },
});
