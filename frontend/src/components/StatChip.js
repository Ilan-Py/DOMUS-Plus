import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PressScale from './PressScale';
import { plural } from '../utils/formato';
import { color, texto, espacio, radio, tactil } from '../theme/tokens';

// Chip de dato con número: «2 dosis hoy», «4 turnos esta semana». El número va en tabular-nums y el plural sale
// solo. Mientras carga (`valor` null o undefined) muestra «…», nunca «0». Con `ocultarSiCero` desaparece cuando no
// hay nada que contar (la Familia vacía no muestra «0 dosis hoy»).
//
//   <StatChip valor={2} singular="dosis" plural="dosis" sufijo="hoy" tono="alerta" onPress={…} />
const TONOS = {
  neutro: { fondo: color.cartulina, texto: color.tinta, borde: color.linea },
  alerta: { fondo: color.terracotaPalido, texto: '#9A3416', borde: 'rgba(194, 70, 35, 0.25)' }, // 6.33:1
  ok: { fondo: color.salviaPalido, texto: color.salviaTexto, borde: 'rgba(74, 107, 93, 0.25)' }, // 6.32:1
};

export default function StatChip({ valor, singular, plural: pluralForma, sufijo, tono = 'neutro', onPress, ocultarSiCero = false, accessibilityHint }) {
  if (ocultarSiCero && valor === 0) return null;
  const cargando = valor === null || valor === undefined;
  const t = TONOS[tono] || TONOS.neutro;
  const palabras = [valor === 1 ? singular : pluralForma || `${singular}s`, sufijo].filter(Boolean).join(' ');
  const frase = cargando ? palabras : `${plural(valor, singular, pluralForma)}${sufijo ? ` ${sufijo}` : ''}`;
  const contenido = (
    <>
      <Text style={[texto.etiqueta, estilos.numero, { color: t.texto }]}>{cargando ? '…' : valor}</Text>
      <Text style={[texto.etiqueta, { color: t.texto }]}>{palabras}</Text>
    </>
  );
  const caja = [estilos.chip, { backgroundColor: t.fondo, borderColor: t.borde }];
  if (!onPress) {
    return (
      <View style={caja} accessibilityLabel={cargando ? `Cargando ${frase}` : frase}>
        {contenido}
      </View>
    );
  }
  return (
    <PressScale contentStyle={caja} onPress={onPress} accessibilityLabel={cargando ? `Cargando ${frase}` : frase} accessibilityHint={accessibilityHint}>
      {contenido}
    </PressScale>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[1],
    minHeight: tactil.minimo,
    paddingHorizontal: espacio[4],
    borderRadius: radio.pastilla,
    borderWidth: 1,
  },
  numero: { fontFamily: 'PlusJakartaSans_600SemiBold', fontVariant: ['tabular-nums'] },
});
