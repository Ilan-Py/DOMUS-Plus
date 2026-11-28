import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import PressScale from './PressScale';
import Evento from './Evento';
import { dayKey, TONO_CATEGORIA } from './MiniCalendar';
import { mismoDia, TIPO_AVISO } from '../utils/avisos';
import { hora } from '../utils/formato';
import IconoTipo from './IconoTipo';

// Vista Semana (franjas horarias × 7 días) y vista Lista (agenda corrida agrupada por día) del Calendario.
// `eventos`: [{ item, fecha, hecho, vencido, dueno }] ya filtrados y ordenados por fecha.

const NOMBRE_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const FRANJAS = [
  { id: 'madrugada', label: 'Madrugada', rango: '0–6', desde: 0, hasta: 6 },
  { id: 'manana', label: 'Mañana', rango: '6–12', desde: 6, hasta: 12 },
  { id: 'tarde', label: 'Tarde', rango: '12–19', desde: 12, hasta: 19 },
  { id: 'noche', label: 'Noche', rango: '19–24', desde: 19, hasta: 24 },
];

export function lunesDe(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function VistaSemana({ base, eventos, seleccionado, onElegirDia, onAbrir }) {
  // El ancho de la semana es el del contenedor (mínimo 600 px; si no entra, se desplaza de costado). Sin esto, los
  // títulos largos ensanchaban cada día y se veían tres.
  const [ancho, setAncho] = useState(0);
  const lunes = lunesDe(base);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
  const hoy = new Date();
  const delDia = (d, f) =>
    eventos.filter((e) => mismoDia(e.fecha, d) && e.fecha.getHours() >= f.desde && e.fecha.getHours() < f.hasta);
  // La madrugada sólo aparece si hay algo en la semana.
  const franjas = FRANJAS.filter((f) => f.id !== 'madrugada' || dias.some((d) => delDia(d, f).length > 0));

  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[estilos.semana, { width: Math.max(600, ancho) }]}>
        <View style={estilos.filaSemana}>
          <View style={estilos.etiqueta} />
          {dias.map((d) => {
            const k = dayKey(d);
            const esHoy = mismoDia(d, hoy);
            return (
              <PressScale
                key={k}
                style={estilos.colDia}
                contentStyle={[estilos.cabDia, esHoy && estilos.cabHoy, seleccionado === k && !esHoy && estilos.cabSel]}
                onPress={() => onElegirDia(k, d)}
                accessibilityLabel={`${NOMBRE_DIA[d.getDay()]} ${d.getDate()}`}
              >
                <Text style={[estilos.diaNombre, esHoy && estilos.blanco]}>{NOMBRE_DIA[d.getDay()]}</Text>
                <Text style={[estilos.diaNumero, esHoy && estilos.blanco]}>{d.getDate()}</Text>
              </PressScale>
            );
          })}
        </View>
        {franjas.map((f) => (
          <View key={f.id} style={estilos.filaSemana}>
            <View style={estilos.etiqueta}>
              <Text style={estilos.franjaTitulo}>{f.label}</Text>
              <Text style={estilos.franjaRango}>{f.rango} h</Text>
            </View>
            {dias.map((d) => {
              const evs = delDia(d, f);
              return (
                <View key={dayKey(d)} style={[estilos.colDia, estilos.celda]}>
                  {evs.map((e) => {
                    const t = TONO_CATEGORIA[e.item.tipo] || TONO_CATEGORIA.control;
                    return (
                      <PressScale
                        key={e.item.id}
                        contentStyle={[
                          estilos.evento,
                          { backgroundColor: t.bg, borderLeftColor: t.fg },
                          (e.hecho || e.omitido) && estilos.eventoMarcado,
                          e.vencido && estilos.eventoSinMarcar,
                        ]}
                        onPress={() => onAbrir(e.item)}
                        accessibilityLabel={`${e.item.descripcion || TIPO_AVISO[e.item.tipo]?.label || 'Aviso'}, ${TIPO_AVISO[e.item.tipo]?.label || ''}, ${hora(e.fecha)}${e.hecho ? ', hecho' : e.omitido ? ', no se dio' : e.vencido ? ', sin marcar' : ''}`}
                      >
                        <View style={estilos.eventoCab}>
                          <IconoTipo tipo={e.item.tipo} size={14} />
                          <Text style={[estilos.eventoHora, { color: t.texto }]}>{hora(e.fecha)}</Text>
                        </View>
                        <Text style={[estilos.eventoTitulo, e.omitido && { textDecorationLine: 'line-through' }]} numberOfLines={2}>
                          {e.item.descripcion || TIPO_AVISO[e.item.tipo]?.label}
                        </Text>
                      </PressScale>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

function etiquetaDia(fecha) {
  const hoy = new Date();
  const man = new Date();
  man.setDate(hoy.getDate() + 1);
  const larga = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const cap = larga.charAt(0).toUpperCase() + larga.slice(1);
  if (mismoDia(fecha, hoy)) return `Hoy · ${cap}`;
  if (mismoDia(fecha, man)) return `Mañana · ${cap}`;
  return cap;
}

export function VistaLista({ eventos, onAbrir, renderAcciones, vacio }) {
  const grupos = [];
  eventos.forEach((e) => {
    const k = dayKey(e.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.k === k) ultimo.items.push(e);
    else grupos.push({ k, fecha: e.fecha, items: [e] });
  });
  if (grupos.length === 0) {
    return vacio || <Text style={estilos.vacio}>Nada programado en estas semanas.</Text>;
  }
  return (
    <View style={estilos.lista}>
      {grupos.map((g) => (
        <View key={g.k} style={estilos.grupo}>
          <Text style={estilos.grupoTitulo} accessibilityRole="header">{etiquetaDia(g.fecha)}</Text>
          {g.items.map((e) => (
            <Evento key={e.item.id} item={e.item} fecha={e.fecha} dueno={e.dueno} hecho={e.hecho || e.omitido} vencido={e.vencido} onPress={() => onAbrir(e.item)}>
              {renderAcciones ? renderAcciones(e) : null}
            </Evento>
          ))}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  semana: { gap: 4 },
  filaSemana: { flexDirection: 'row', gap: 4 },
  etiqueta: { width: 76, justifyContent: 'center', paddingRight: 6 },
  franjaTitulo: { fontSize: 13, lineHeight: 18, fontFamily: poppinsWeight('600'), color: colors.ink },
  franjaRango: { fontSize: 12, lineHeight: 16, color: colors.textBody },
  colDia: { flex: 1, minWidth: 0 },
  cabDia: { alignItems: 'center', minHeight: 64, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.1)' },
  cabHoy: { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong },
  cabSel: { borderWidth: 2, borderColor: '#2A2421' },
  diaNombre: { fontSize: 13, lineHeight: 18, color: colors.textBody, textTransform: 'uppercase' },
  diaNumero: { fontSize: 20, lineHeight: 26, fontFamily: SERIF_BOLD, color: colors.ink },
  blanco: { color: '#FFFFFF' },
  celda: { minHeight: 72, gap: 4, padding: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.08)' },
  evento: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderLeftWidth: 3, minHeight: 40, justifyContent: 'center' },
  eventoCab: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventoMarcado: { opacity: 0.6 },
  eventoSinMarcar: { borderWidth: 1, borderColor: '#B5391C', borderLeftColor: '#B5391C' },
  eventoHora: { fontSize: 13, lineHeight: 17, fontFamily: poppinsWeight('700'), fontVariant: ['tabular-nums'] },
  eventoTitulo: { fontSize: 13, lineHeight: 17, color: colors.ink },
  lista: { gap: 20 },
  grupo: { gap: 8 },
  grupoTitulo: { fontSize: 17, lineHeight: 24, fontFamily: SERIF_BOLD, color: colors.ink },
  vacio: { fontSize: 15, lineHeight: 22, color: colors.textBody, paddingVertical: 24 },
});
