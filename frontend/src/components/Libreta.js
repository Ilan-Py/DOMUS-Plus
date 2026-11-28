import React, { useState } from 'react';
import { View, Text, Image, TextInput, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect, Circle, G, Polyline } from 'react-native-svg';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import PressScale from './PressScale';
import Ilustracion from './Ilustracion';
import { API_URL } from '../config/env';
import { parseApiDate } from '../utils/displayFormat';
import { color, texto, espacio, radio, tactil } from '../theme/tokens';
import { SERIF_BOLD, poppinsWeight } from '../theme/typography';

// Piezas de la «libreta sanitaria» (ficha de un integrante o una mascota, ProfileDetailScreen): escena de papel de
// la cabecera, foto tipo polaroid, pestañas de fichero, sticker de vacuna con sello de estado, gráfico de peso y
// línea de tiempo. Todo de papel: capas planas, sombras corridas sin difuminar, nada de degradados.

export const fechaNumerica = (valor) => {
  const f = valor instanceof Date ? valor : parseApiDate(valor);
  if (!f) return '';
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
};

// ---------------------------------------------------------------------------------------------------------------
// Escena de la cabecera: banda ancha con capas recortadas. Mascota: pasto salvia, loma mostaza y huellas caladas.
// Persona: lomas arena y terracota con un corazón calado. Va detrás del contenido (decorativa).
// ---------------------------------------------------------------------------------------------------------------
function Huella({ x, y, s = 1, giro = 0 }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${giro}) scale(${s})`}>
      <Circle cx={0} cy={6} r={6} fill="#FBF6EE" opacity={0.75} />
      <Circle cx={-7} cy={-3} r={2.6} fill="#FBF6EE" opacity={0.75} />
      <Circle cx={-2.5} cy={-7} r={2.6} fill="#FBF6EE" opacity={0.75} />
      <Circle cx={2.5} cy={-7} r={2.6} fill="#FBF6EE" opacity={0.75} />
      <Circle cx={7} cy={-3} r={2.6} fill="#FBF6EE" opacity={0.75} />
    </G>
  );
}

export function EscenaFicha({ mascota = false, alto = 150 }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: radio.contenedor }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 1000 220" preserveAspectRatio="xMidYMax slice">
        <Rect x={0} y={0} width={1000} height={220} fill={mascota ? '#EEF2EC' : '#F6EDE2'} />
        {/* Loma de atrás (sombra corrida + papel) */}
        <Path d="M0 150 C180 90 330 100 520 140 C700 176 840 120 1000 110 L1000 220 L0 220 Z" fill="#E4D6C6" transform="translate(4 5)" />
        <Path d="M0 150 C180 90 330 100 520 140 C700 176 840 120 1000 110 L1000 220 L0 220 Z" fill={mascota ? '#E7C77A' : '#E9C6B5'} />
        {/* Pasto / loma de adelante con canto dentado */}
        <Path d="M0 182 L20 174 L40 182 L60 172 L80 182 L100 175 L120 183 C300 160 520 196 720 172 C840 160 930 176 1000 168 L1000 220 L0 220 Z" fill="#E4D6C6" transform="translate(4 5)" />
        <Path d="M0 182 L20 174 L40 182 L60 172 L80 182 L100 175 L120 183 C300 160 520 196 720 172 C840 160 930 176 1000 168 L1000 220 L0 220 Z" fill={mascota ? '#9DB8A6' : '#D9A48E'} />
        {mascota ? (
          <>
            <Huella x={620} y={196} s={1.3} giro={-20} />
            <Huella x={680} y={186} s={1.3} giro={-10} />
            <Huella x={745} y={198} s={1.3} giro={-25} />
            <Huella x={810} y={188} s={1.3} giro={-12} />
            <Huella x={560} y={150} s={1.1} giro={10} />
          </>
        ) : (
          <Path d="M760 170 C752 158 732 160 734 176 C736 188 752 194 760 202 C768 194 784 188 786 176 C788 160 768 158 760 170 Z" fill="#FBF6EE" opacity={0.7} />
        )}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Foto en un marco polaroid con cinta, rotada 2°. Sin foto: ilustración de papel (perro o casita), no un ícono gris.
// ---------------------------------------------------------------------------------------------------------------
export function MarcoPolaroid({ fotoUrl, mascota, nombre, tam = 112 }) {
  // Las fotos vienen como ruta del backend (/fotos/fatiga.webp), igual que en Avatar.
  const [fallo, setFallo] = useState(false);
  const uri = fotoUrl && !fallo ? (fotoUrl.startsWith('/') ? `${API_URL}${fotoUrl}` : fotoUrl) : null;
  return (
    <View style={[estilos.polaroid, { transform: [{ rotate: '2deg' }] }]}>
      <View pointerEvents="none" style={estilos.polaroidCinta} />
      <View style={[estilos.polaroidFoto, { width: tam, height: tam }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: tam, height: tam }} resizeMode="cover" onError={() => setFallo(true)} accessibilityLabel={`Foto de ${nombre}`} />
        ) : (
          <Ilustracion nombre={mascota ? 'mascota' : 'familia'} size={tam - 8} />
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Pestañas de fichero: asoman de distintos colores; la activa queda al frente, unida con la tarjeta de abajo.
//   <PestanasFichero opciones={[{ valor, etiqueta, cantidad, tono }]} activa onCambiar />
// ---------------------------------------------------------------------------------------------------------------
const TONOS_PESTANA = { mostaza: '#F4E3B5', rosa: '#F3D9D1', salvia: '#DCE7E0' };

export function PestanasFichero({ opciones, activa, onCambiar, fondoActivo = color.cartulina }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.pestanas} accessibilityRole="tablist">
      {opciones.map((o, i) => {
        const on = o.valor === activa;
        return (
          <PressScale
            key={o.valor}
            style={[estilos.pestanaCaja, on && estilos.pestanaCajaOn, { marginLeft: i ? -6 : 0, zIndex: on ? 3 : 2 - i }]}
            contentStyle={[estilos.pestana, { backgroundColor: on ? fondoActivo : TONOS_PESTANA[o.tono] || '#EFE6DA' }, on && estilos.pestanaOn]}
            onPress={() => onCambiar(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.etiqueta}, ${o.cantidad}`}
          >
            <Text style={[estilos.pestanaTexto, on && estilos.pestanaTextoOn]}>{o.etiqueta}</Text>
            <View style={[estilos.contador, on && estilos.contadorOn]}>
              <Text style={[estilos.contadorTexto, on && { color: '#FFFFFF' }]}>{o.cantidad}</Text>
            </View>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Vacuna como sticker de la libreta: borde troquelado, nombre, «Aplicada · Próxima» y un sello circular de estado
// ligeramente rotado («AL DÍA» salvia, «VENCE PRONTO» mostaza, «VENCIDA» terracota, «SIN REFUERZO» gris).
// ---------------------------------------------------------------------------------------------------------------
export function estadoVacuna(v, ahora = new Date()) {
  const prox = v.proxima_dosis ? parseApiDate(v.proxima_dosis) : null;
  if (!prox) return 'sin_refuerzo';
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  if (prox < hoy) return 'vencida';
  const en30 = new Date(hoy.getTime() + 30 * 86400000);
  return prox <= en30 ? 'pronto' : 'al_dia';
}

const SELLOS = {
  al_dia: { texto: 'AL DÍA', tinta: '#3D5A4B' },
  pronto: { texto: 'VENCE PRONTO', tinta: '#8A5A0E' },
  vencida: { texto: 'VENCIDA', tinta: '#A6291B' },
  sin_refuerzo: { texto: 'SIN REFUERZO', tinta: '#6B6357' },
};

export function SelloEstado({ estado, giro = -9, tam = 92 }) {
  const s = SELLOS[estado] || SELLOS.sin_refuerzo;
  return (
    <View style={[estilos.sello, { width: tam, height: tam, borderRadius: tam / 2, borderColor: s.tinta, transform: [{ rotate: `${giro}deg` }] }]} accessibilityLabel={`Estado: ${s.texto.toLowerCase()}`}>
      <View style={[estilos.selloInterior, { borderRadius: tam / 2, borderColor: s.tinta }]}>
        <Text style={[estilos.selloTexto, { color: s.tinta }, tam < 80 && { fontSize: 10, lineHeight: 12 }]}>{s.texto}</Text>
      </View>
    </View>
  );
}

export function StickerVacuna({ vacuna, onEditar, children, giro = 0 }) {
  const estado = estadoVacuna(vacuna);
  const angosto = useWindowDimensions().width < 600;
  return (
    <View style={[estilos.sticker, { transform: [{ rotate: `${giro}deg` }] }]}>
      <View style={[estilos.stickerTroquel, angosto && { paddingRight: 84 }]}>
        <View style={estilos.stickerCab}>
          <MaterialCommunityIcons name="needle" size={20} color="#6E4A0E" />
          <Text style={estilos.stickerNombre} numberOfLines={2}>{vacuna.nombre}</Text>
          <PressScale contentStyle={estilos.iconoBtn} onPress={onEditar} accessibilityLabel={`Editar vacuna ${vacuna.nombre}`}>
            <Ionicons name="pencil-outline" size={18} color={color.texto} />
          </PressScale>
        </View>
        <Text style={estilos.stickerFechas}>
          Aplicada <Text style={estilos.stickerDato}>{fechaNumerica(vacuna.fecha_aplicacion)}</Text>
          {vacuna.proxima_dosis ? (
            <>
              {'  ·  '}Próxima <Text style={estilos.stickerDato}>{fechaNumerica(vacuna.proxima_dosis)}</Text>
            </>
          ) : (
            '  ·  sin próxima dosis cargada'
          )}
        </Text>
        {children}
      </View>
      <View style={[estilos.stickerSello, angosto && { right: 12 }]}>
        <SelloEstado estado={estado} tam={angosto ? 70 : 92} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Peso: mini gráfico de evolución + último valor + registrar uno nuevo en el momento.
// ---------------------------------------------------------------------------------------------------------------
export function GraficoPeso({ pesos, onRegistrar, nombre }) {
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const ancho = 240;
  const alto = 64;
  const ultimo = pesos[pesos.length - 1];
  const anterior = pesos[pesos.length - 2];
  const kgs = pesos.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const rango = max - min || 1;
  const puntos = pesos.map((p, i) => {
    const x = pesos.length === 1 ? ancho / 2 : 8 + (i * (ancho - 16)) / (pesos.length - 1);
    const y = alto - 10 - ((p.kg - min) / rango) * (alto - 20);
    return [x, y];
  });
  const diferencia = ultimo && anterior ? Math.round((ultimo.kg - anterior.kg) * 10) / 10 : null;
  const kg = (n) => `${String(n).replace('.', ',')} kg`;

  async function registrar() {
    if (!valor.trim()) return;
    setGuardando(true);
    const ok = await onRegistrar(valor);
    setGuardando(false);
    if (ok) setValor('');
  }

  return (
    <View style={{ gap: espacio[2] }}>
      {pesos.length === 0 ? (
        <Text style={estilos.ayuda}>Todavía no hay pesos de {nombre}. Anotá el de hoy y vas a ver cómo cambia.</Text>
      ) : (
        <>
          <Text style={estilos.pesoActual}>
            {String(ultimo.kg).replace('.', ',')}
            <Text style={estilos.pesoUnidad}> kg</Text>
            <Text style={estilos.ayuda}>
              {'  '}el {fechaNumerica(ultimo.fecha)}
              {diferencia !== null && diferencia !== 0 ? ` · ${diferencia > 0 ? '+' : '−'}${String(Math.abs(diferencia)).replace('.', ',')} kg` : ''}
            </Text>
          </Text>
          {pesos.length > 1 && (
            <View accessibilityLabel={`Evolución del peso: ${pesos.map((p) => `${kg(p.kg)} el ${fechaNumerica(p.fecha)}`).join(', ')}`}>
              <Svg width={ancho} height={alto}>
                <Polyline points={puntos.map((p) => p.join(',')).join(' ')} fill="none" stroke="#4A6B5D" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                {puntos.map(([x, y], i) => (
                  <Circle key={i} cx={x} cy={y} r={i === puntos.length - 1 ? 5 : 3.5} fill={i === puntos.length - 1 ? '#C24623' : '#4A6B5D'} stroke="#FFFDF9" strokeWidth={2} />
                ))}
              </Svg>
            </View>
          )}
        </>
      )}
      <View style={estilos.pesoForm}>
        <TextInput
          value={valor}
          onChangeText={setValor}
          placeholder="Peso de hoy (kg)"
          placeholderTextColor={color.textoSuave}
          keyboardType="decimal-pad"
          style={estilos.pesoInput}
          accessibilityLabel={`Peso de hoy de ${nombre}, en kilos`}
          onSubmitEditing={registrar}
        />
        <PressScale contentStyle={estilos.pesoBtn} onPress={registrar} disabled={guardando || !valor.trim()} accessibilityLabel="Anotar el peso">
          <Text style={estilos.pesoBtnTexto}>{guardando ? 'Anotando…' : 'Anotar'}</Text>
        </PressScale>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Línea de tiempo: historial + vacunas aplicadas + pesos + inicio de tratamientos, del más nuevo al más viejo,
// con un ícono por tipo (vacuna, desparasitación, consulta, peso, cirugía, tratamiento).
// ---------------------------------------------------------------------------------------------------------------
function iconoDeEvento(texto) {
  const t = (texto || '').toLowerCase();
  if (/desparasit|pipeta|antiparasit/.test(t)) return { icono: 'bug-outline', fondo: '#EDE4F3', tinta: '#5B4374' };
  if (/castr|cirug|operaci/.test(t)) return { icono: 'content-cut', fondo: '#F3D9D1', tinta: '#8E3A2A' };
  if (/estudio|análisis|analisis|laborat|radiograf|ecograf/.test(t)) return { icono: 'flask-outline', fondo: '#E2EAF1', tinta: '#2F4A60' };
  return { icono: 'stethoscope', fondo: '#E2EAF1', tinta: '#2F4A60' };
}

export function armarLineaDeTiempo({ historial = [], vacunas = [], pesos = [], tratamientos = [] }) {
  const items = [
    ...historial.map((h) => ({ clave: `h${h.id}`, fecha: parseApiDate(h.fecha), titulo: h.evento, detalle: h.descripcion, ...iconoDeEvento(h.evento) })),
    ...vacunas.map((v) => ({ clave: `v${v.id}`, fecha: parseApiDate(v.fecha_aplicacion), titulo: `Vacuna ${v.nombre}`, detalle: v.proxima_dosis ? `Próxima: ${fechaNumerica(v.proxima_dosis)}` : null, icono: 'needle', fondo: '#F8EBCB', tinta: '#6E4A0E' })),
    ...pesos.map((p) => ({ clave: `p${p.id}`, fecha: parseApiDate(p.fecha) || new Date(p.fecha), titulo: `Peso: ${String(p.kg).replace('.', ',')} kg`, icono: 'weight-kilogram', fondo: '#DCE7E0', tinta: '#3B5A4C' })),
    ...tratamientos.map((t) => ({ clave: `t${t.id}`, fecha: parseApiDate(t.fecha_inicio), titulo: `Empezó ${t.medicacion}`, detalle: t.descripcion, icono: 'pill', fondo: '#F8E1DB', tinta: '#8E3A2A' })),
  ];
  return items.filter((i) => i.fecha).sort((a, b) => b.fecha - a.fecha);
}

export function LineaDeTiempo({ items }) {
  return (
    <View style={estilos.linea}>
      {items.map((it, i) => (
        <View key={it.clave} style={estilos.lineaFila}>
          <View style={estilos.lineaRiel}>
            <View style={[estilos.lineaIcono, { backgroundColor: it.fondo }]}>
              <MaterialCommunityIcons name={it.icono} size={18} color={it.tinta} />
            </View>
            {i < items.length - 1 && <View style={estilos.lineaTrazo} />}
          </View>
          <View style={estilos.lineaTexto}>
            <Text style={estilos.lineaFecha}>{fechaNumerica(it.fecha)}</Text>
            <Text style={estilos.lineaTitulo}>{it.titulo}</Text>
            {!!it.detalle && <Text style={estilos.ayuda}>{it.detalle}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  ayuda: { fontSize: 14, lineHeight: 20, color: color.texto, fontFamily: 'PlusJakartaSans_400Regular' },
  // polaroid
  polaroid: {
    padding: 8,
    paddingBottom: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    shadowColor: '#2A2421',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 3,
    ...Platform.select({ web: { boxShadow: '3px 4px 0 rgba(42,36,33,0.16)' }, default: {} }),
  },
  polaroidCinta: { position: 'absolute', top: -10, left: '30%', width: 56, height: 18, backgroundColor: 'rgba(233, 198, 181, 0.9)', transform: [{ rotate: '-6deg' }], zIndex: 2, borderRadius: 2 },
  polaroidFoto: { backgroundColor: '#F3EEE6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // pestañas
  pestanas: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: espacio[3], paddingRight: espacio[3] },
  pestanaCaja: { marginBottom: -1 },
  pestanaCajaOn: {},
  pestana: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
    minHeight: tactil.comodo,
    paddingHorizontal: espacio[4],
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(42, 36, 33, 0.12)',
    marginTop: 6,
  },
  pestanaOn: { marginTop: 0, minHeight: tactil.comodo + 6, borderColor: 'rgba(42, 36, 33, 0.16)' },
  pestanaTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: color.texto },
  pestanaTextoOn: { color: color.tinta, fontFamily: SERIF_BOLD, fontSize: 17 },
  contador: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: 'rgba(42,36,33,0.08)', alignItems: 'center', justifyContent: 'center' },
  contadorOn: { backgroundColor: color.terracota },
  contadorTexto: { fontSize: 13, fontFamily: poppinsWeight('700'), color: color.tinta, fontVariant: ['tabular-nums'] },
  // sticker de vacuna
  sticker: { position: 'relative', paddingTop: 6, paddingRight: 6 },
  stickerTroquel: {
    gap: espacio[2],
    padding: espacio[4],
    paddingRight: 120,
    borderRadius: 10,
    backgroundColor: '#FFFBF0',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E3CE9B', // borde troquelado de etiqueta de lote
    shadowColor: '#2A2421',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 1,
    ...Platform.select({ web: { boxShadow: '2px 3px 0 rgba(42,36,33,0.10)' }, default: {} }),
  },
  stickerCab: { flexDirection: 'row', alignItems: 'center', gap: espacio[2] },
  stickerNombre: { flex: 1, fontSize: 19, lineHeight: 25, fontFamily: SERIF_BOLD, color: color.tinta },
  stickerFechas: { fontSize: 14, lineHeight: 21, color: color.texto },
  stickerDato: { fontFamily: poppinsWeight('700'), color: color.tinta, fontVariant: ['tabular-nums'] },
  stickerSello: { position: 'absolute', top: 14, right: 18 },
  iconoBtn: { width: tactil.minimo, height: tactil.minimo, alignItems: 'center', justifyContent: 'center' },
  sello: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, padding: 4, opacity: 0.9, alignItems: 'center', justifyContent: 'center' },
  selloInterior: { width: '100%', height: '100%', borderRadius: 40, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  selloTexto: { fontSize: 12, lineHeight: 14, letterSpacing: 0.6, textAlign: 'center', fontFamily: poppinsWeight('700') },
  // peso
  pesoUnidad: { fontSize: 18, fontFamily: poppinsWeight('600'), color: color.tinta },
  pesoActual: { fontSize: 26, lineHeight: 32, fontFamily: SERIF_BOLD, color: color.tinta, fontVariant: ['tabular-nums'] },
  pesoForm: { flexDirection: 'row', gap: espacio[2], alignItems: 'center' },
  pesoInput: { flex: 1, minHeight: tactil.minimo, paddingHorizontal: espacio[3], borderRadius: radio.control, borderWidth: 1, borderColor: color.lineaFuerte, backgroundColor: '#FFFFFF', fontSize: 16, color: color.tinta },
  pesoBtn: { minHeight: tactil.minimo, paddingHorizontal: espacio[4], borderRadius: radio.control, backgroundColor: color.salvia, justifyContent: 'center' },
  pesoBtnTexto: { color: '#FFFFFF', fontSize: 15, fontFamily: poppinsWeight('600') },
  // línea de tiempo
  linea: { gap: 0 },
  lineaFila: { flexDirection: 'row', gap: espacio[3] },
  lineaRiel: { alignItems: 'center', width: 36 },
  lineaIcono: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lineaTrazo: { flex: 1, width: 2, minHeight: 16, backgroundColor: '#E4D6C6', marginVertical: 2 },
  lineaTexto: { flex: 1, paddingBottom: espacio[4], gap: 2 },
  lineaFecha: { fontSize: 13, lineHeight: 18, color: color.texto, fontVariant: ['tabular-nums'], fontFamily: poppinsWeight('600') },
  lineaTitulo: { fontSize: 16, lineHeight: 22, color: color.tinta, fontFamily: poppinsWeight('600') },
});
