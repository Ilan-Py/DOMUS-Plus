import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './PressScale';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import IconoTipo from './IconoTipo';
import { cuandoEvento } from '../utils/formato';
import { color, texto, espacio, radio, tipoEvento, estadoDosis } from '../theme/tokens';

// Un evento de salud (dosis, turno, vacuna) en una lista: tipo (ícono + color + nombre), hora, título, a quién le
// toca, ↻ si se repite y el estado de la dosis. Las acciones (Dar, Más tarde, Se dio…) van como `children`, al lado
// del texto y nunca adentro del botón que abre el detalle. Superficie plana: sin barra lateral ni hoja (un solo acento:
// el ícono del tipo).
//
//   <EventItem tipo="medicacion" titulo="Losartán 50 mg" fecha={d} persona={{ nombre: 'María Elena', … }}
//              recurrente estado="sin_marcar" onPress={abrir}>
//     <Boton … />
//   </EventItem>
//
// estado: 'pendiente' | 'sin_marcar' | 'dada' | 'no_se_dio' | 'futura'
// detalleEstado: texto que acompaña al estado («Dada 08:12 · Mónica»). Si no viene, se muestra el nombre del estado.
export default function EventItem({
  tipo = 'control',
  titulo,
  fecha,
  todoElDia = false,
  persona,
  recurrente = false,
  estado = 'pendiente',
  detalleEstado,
  onPress,
  children,
  compacto = false,
}) {
  const t = tipoEvento[tipo] || tipoEvento.control;
  const e = estadoDosis[estado] || estadoDosis.pendiente;
  const nombreTitulo = titulo || t.etiqueta;
  const cuando = fecha ? cuandoEvento(fecha, { todoElDia }) : '';
  const mostrarEstado = estado !== 'pendiente' && estado !== 'futura';
  const tachado = estado === 'no_se_dio';
  const textoEstado = detalleEstado || e.etiqueta;

  const etiquetaLectora = [
    nombreTitulo,
    t.etiqueta,
    cuando,
    persona ? `de ${persona.nombre}` : null,
    recurrente ? 'se repite' : null,
    mostrarEstado ? textoEstado : null,
  ]
    .filter(Boolean)
    .join(', ');

  const cuerpo = (
    <>
      <View style={[estilos.icono, compacto && estilos.iconoCompacto, { backgroundColor: t.fondo }]}>
        <IconoTipo tipo={tipo} size={compacto ? 18 : 20} />
      </View>
      <View style={estilos.textos}>
        <View style={estilos.linea}>
          <Text style={[texto.hora, { color: estado === 'sin_marcar' ? e.color : color.tinta }]}>{cuando}</Text>
          <View style={[estilos.tipo, { backgroundColor: t.fondo }]}>
            <Text style={[texto.meta, estilos.tipoTexto, { color: t.texto }]}>{t.etiqueta}</Text>
          </View>
          {recurrente && (
            <View style={estilos.repite} accessibilityLabel="Se repite">
              <Ionicons name="repeat" size={15} color={color.texto} />
            </View>
          )}
        </View>
        <Text style={[texto.nombre, estilos.titulo, tachado && estilos.tachado]} numberOfLines={2}>
          {nombreTitulo}
        </Text>
        {(!!persona || mostrarEstado) && (
          <View style={estilos.linea}>
            {!!persona && (
              <View style={estilos.quien}>
                {persona.clase === 'mascota' && <MaterialCommunityIcons name="paw" size={15} color="#4A6B5D" accessibilityLabel="Mascota" />}
                <Text style={[texto.meta, { color: color.texto }]}>{persona.nombre}</Text>
              </View>
            )}
            {mostrarEstado && (
              <View style={[estilos.estado, e.fondo && { backgroundColor: e.fondo }]}>
                <Ionicons name={e.icono} size={15} color={e.color} />
                <Text style={[texto.meta, estilos.estadoTexto, { color: e.color }]}>{textoEstado}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={[estilos.fila, compacto && estilos.filaCompacta]}>
      {onPress ? (
        <PressScale style={estilos.principal} contentStyle={estilos.principalContenido} onPress={onPress} accessibilityLabel={etiquetaLectora}>
          {cuerpo}
        </PressScale>
      ) : (
        <View style={[estilos.principal, estilos.principalContenido]} accessible accessibilityLabel={etiquetaLectora}>
          {cuerpo}
        </View>
      )}
      {!!children && <View style={estilos.acciones}>{children}</View>}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espacio[3],
    paddingVertical: espacio[3],
  },
  filaCompacta: { paddingVertical: espacio[2] },
  principal: { flex: 1, minWidth: 220 },
  principalContenido: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio[3], borderRadius: radio.control },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconoCompacto: { width: 36, height: 36, borderRadius: 18 },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  linea: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espacio[2] },
  tipo: { paddingHorizontal: espacio[2], paddingVertical: 1, borderRadius: radio.etiqueta },
  tipoTexto: { fontFamily: 'PlusJakartaSans_500Medium' },
  repite: { flexDirection: 'row', alignItems: 'center' },
  titulo: { color: color.tinta },
  tachado: { textDecorationLine: 'line-through', color: color.texto },
  quien: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: espacio[2], paddingVertical: 1, borderRadius: radio.etiqueta },
  estadoTexto: { fontFamily: 'PlusJakartaSans_500Medium' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2] },
});
