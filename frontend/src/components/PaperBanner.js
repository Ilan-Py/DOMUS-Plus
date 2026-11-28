import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BordeTijera from './BordeTijera';
import { color, texto, espacio, radio } from '../theme/tokens';

// Cabecera de papel recortado: título serif, bajada, contenido (stats, acciones) y una ilustración chica a la
// derecha. El canto de abajo está cortado a tijera y debajo asoma una segunda capa, un poco más oscura y corrida: dos
// papeles superpuestos. Es la única pieza «decorativa grande» de cada pantalla; adentro no van datos de salud.
//
//   <PaperBanner titulo="Familia Argento" bajada="5 integrantes · 3 mascotas" ilustracion={<Ilustracion nombre="familia" />}>
//     <StatChip … />
//   </PaperBanner>
const TONOS = {
  arena: { papel: color.arena, capa: '#E4D6C6' },
  terracota: { papel: '#F6E1D8', capa: '#E3A28C' },
  salvia: { papel: '#E3ECE6', capa: '#A7C2B3' },
};

export default function PaperBanner({ titulo, bajada, ilustracion, tono = 'arena', compacto = false, children, style }) {
  const t = TONOS[tono] || TONOS.arena;
  return (
    <View style={[estilos.raiz, style]}>
      <View style={[estilos.papel, { backgroundColor: t.papel }, compacto && estilos.papelCompacto]}>
        <View style={estilos.cabecera}>
          <View style={estilos.textos}>
            <Text style={[texto.pantalla, estilos.titulo]} accessibilityRole="header" aria-level={1}>
              {titulo}
            </Text>
            {!!bajada && <Text style={[texto.cuerpoChico, estilos.bajada]}>{bajada}</Text>}
          </View>
          {!!ilustracion && (
            <View style={estilos.ilustracion} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {ilustracion}
            </View>
          )}
        </View>
        {!!children && <View style={estilos.contenido}>{children}</View>}
      </View>
      {/* Dos cantos: la capa de atrás (más oscura, 4 px más abajo) y el papel de adelante. */}
      <View style={estilos.cantos}>
        <BordeTijera color={t.capa} alto={14} semilla={7} style={estilos.cantoCapa} />
        <BordeTijera color={t.papel} alto={10} semilla={3} style={estilos.cantoPapel} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { position: 'relative', marginBottom: espacio[2] },
  papel: {
    borderTopLeftRadius: radio.tarjeta,
    borderTopRightRadius: radio.tarjeta,
    paddingHorizontal: espacio[6],
    paddingTop: espacio[6],
    paddingBottom: espacio[4],
    gap: espacio[4],
  },
  papelCompacto: { paddingTop: espacio[4], paddingBottom: espacio[3], gap: espacio[3] },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio[4] },
  textos: { flex: 1, minWidth: 0, gap: espacio[1] },
  titulo: { color: color.tinta },
  bajada: { color: color.texto },
  ilustracion: { marginTop: -espacio[2] },
  contenido: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espacio[2] },
  cantos: { position: 'relative', height: 14 },
  cantoCapa: { position: 'absolute', top: 0, left: 0, right: 0 },
  cantoPapel: { position: 'absolute', top: 0, left: 0, right: 0 },
});
