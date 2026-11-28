import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import { paper } from '../theme/paper';
import api from '../api/client';
import PressScale from './PressScale';
import EntityAvatar from './EntityAvatar';
import { mostrarToast } from './ToastHost';
import { dayKey, TONO_CATEGORIA, FondoCategorias } from './MiniCalendar';
import {
  tipoDeAviso,
  colorDeMiembro,
  duenoDeAviso,
  cuando,
  inicioDeDia,
  finDeDia,
  mismoDia,
} from '../utils/avisos';

const NOMBRE_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Botón secundario cálido: borde suave y, al pasar el mouse, fondo arena.
function BotonSuave({ title, onPress }) {
  const [hover, setHover] = useState(false);
  return (
    <PressScale
      style={estilos.suaveWrap}
      contentStyle={[estilos.suave, hover && estilos.suaveHover]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityLabel={title}
    >
      <Text style={estilos.suaveTexto}>{title}</Text>
    </PressScale>
  );
}

// Categoría de color igual que en el Calendario: medicación; si no, mascota; si no, turno o control.
function categoriaDe(a) {
  if (a.tipo === 'medicacion') return 'medicacion';
  return a.mascota_id && !a.integrante_id ? 'mascota' : 'turno';
}

// ---------------------------------------------------------------------------
// Hoy: pendientes de hoy (y vencidos) con acciones directas. "Hecho" desactiva el recordatorio y "Más tarde" lo
// corre una hora; los dos actualizan la lista en el acto y vuelven atrás si el servidor falla.
// ---------------------------------------------------------------------------
export function HoyPanel({ avisos, setAvisos, recargar, integrantes, mascotas, onVerCalendario, onProgramar }) {
  const [ocupado, setOcupado] = useState(null);
  const limite = finDeDia(new Date());
  const lista = (avisos || []).filter((a) => a.fecha <= limite);
  const ahora = new Date();

  function dueno(a) {
    const d = duenoDeAviso(a);
    if (!d) return null;
    const m = (d.clase === 'integrante' ? integrantes : mascotas).find((x) => x.id === d.id);
    return m ? { ...d, nombre: m.nombre, apellido: m.apellido, avatarId: m.avatar_id } : null;
  }

  async function marcarHecho(a) {
    if (ocupado) return;
    setOcupado(a.id);
    const previos = avisos;
    setAvisos(avisos.filter((x) => x.id !== a.id));
    try {
      await api.patch(`/api/recordatorios/${a.id}/desactivar`);
      mostrarToast('Listo, lo marcaste como hecho');
    } catch (err) {
      setAvisos(previos);
      mostrarToast(err.mensaje || 'No pudimos marcarlo. Probá de nuevo.');
    } finally {
      setOcupado(null);
    }
  }

  async function masTarde(a) {
    if (ocupado) return;
    setOcupado(a.id);
    try {
      const nueva = new Date(Math.max(Date.now(), a.fecha.getTime()) + 60 * 60 * 1000);
      await api.patch(`/api/recordatorios/${a.id}`, {
        tipo: a.tipo,
        fecha_hora: nueva.toISOString(),
        descripcion: a.descripcion || undefined,
      });
      mostrarToast('Lo pasamos para dentro de una hora');
      await recargar();
    } catch (err) {
      mostrarToast(err.mensaje || 'No pudimos posponerlo. Probá de nuevo.');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <View {...paper('cartulina')} style={estilos.card}>
      <View style={estilos.cab}>
        <Text style={estilos.titulo} accessibilityRole="header">Hoy en tu familia</Text>
        <PressScale contentStyle={estilos.enlace} onPress={onVerCalendario} accessibilityLabel="Ver calendario">
          <Text style={estilos.enlaceTexto}>Ver calendario</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.limeDeep} />
        </PressScale>
      </View>

      {avisos === null ? (
        <Text style={estilos.ayuda}>Cargando lo de hoy…</Text>
      ) : lista.length === 0 ? (
        <View style={estilos.vacio}>
          {/* Sticker de papel: check salvia con borde blanco y sombra cálida suave */}
          <View style={estilos.sticker}>
            <Ionicons name="checkmark" size={26} color="#FFFFFF" />
          </View>
          <Text style={estilos.vacioTitulo}>Hoy no hay nada pendiente</Text>
          <Text style={estilos.ayuda}>Podés programar un turno, una vacuna o una dosis.</Text>
          <BotonSuave title="Programar un recordatorio" onPress={onProgramar} />
        </View>
      ) : (
        lista.map((a, i) => {
          const t = tipoDeAviso(a.tipo);
          const d = dueno(a);
          const vencido = a.fecha < ahora;
          return (
            <View key={a.id} style={[estilos.fila, i > 0 && estilos.filaBorde]}>
              <View style={[estilos.icono, { backgroundColor: t.bg }]}>
                <Ionicons name={t.icon} size={22} color={t.fg} />
              </View>
              <View style={estilos.filaTexto}>
                <Text style={estilos.filaTitulo} numberOfLines={2}>
                  {a.descripcion || t.label}
                </Text>
                <View style={estilos.meta}>
                  <Text style={[estilos.hora, vencido && estilos.horaVencida]}>
                    {vencido ? `Venció ${cuando(a.fecha)}` : cuando(a.fecha)}
                  </Text>
                  {d && (
                    <View style={estilos.quien}>
                      <EntityAvatar avatarId={d.avatarId} type={d.clase === 'mascota' ? 'pet' : 'person'} name={d.nombre} apellido={d.apellido} size={20} />
                      <Text style={estilos.quienTexto}>{d.nombre}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={estilos.acciones}>
                <PressScale
                  contentStyle={estilos.btnHecho}
                  onPress={() => marcarHecho(a)}
                  disabled={!!ocupado}
                  accessibilityLabel={`Marcar como hecho: ${a.descripcion || t.label}`}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={estilos.btnHechoTexto}>Hecho</Text>
                </PressScale>
                <PressScale
                  contentStyle={estilos.btnTarde}
                  onPress={() => masTarde(a)}
                  disabled={!!ocupado}
                  accessibilityLabel={`Posponer una hora: ${a.descripcion || t.label}`}
                >
                  <Text style={estilos.btnTardeTexto}>Más tarde</Text>
                </PressScale>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Alertas proactivas: sólo con datos que existen (recordatorios vencidos, vacunas próximas o vencidas).
// ---------------------------------------------------------------------------
export function calcularAlertas({ avisos, vacunas }) {
  const ahora = new Date();
  const alertas = [];
  const vencidos = (avisos || []).filter((a) => a.fecha < ahora);
  if (vencidos.length) {
    alertas.push({
      id: 'vencidos',
      tono: 'danger',
      icon: 'alert-circle',
      texto: `${vencidos.length} recordatorio${vencidos.length === 1 ? '' : 's'} vencido${vencidos.length === 1 ? '' : 's'} sin marcar`,
    });
  }
  const en30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  vacunas
    .filter((v) => v.proxima)
    .forEach((v) => {
      if (v.proxima < inicioDeDia(ahora)) {
        alertas.push({ id: `v${v.id}`, tono: 'danger', icon: 'shield-outline', texto: `${v.duenoNombre}: la vacuna ${v.nombre} está vencida` });
      } else if (v.proxima <= en30) {
        const dias = Math.round((inicioDeDia(v.proxima) - inicioDeDia(ahora)) / 86400000);
        alertas.push({
          id: `v${v.id}`,
          tono: 'aviso',
          icon: 'shield-outline',
          texto: `${v.duenoNombre}: ${v.nombre} ${dias === 0 ? 'es hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`}`,
        });
      }
    });
  return alertas.slice(0, 4);
}

export function AlertasFamilia({ alertas }) {
  if (!alertas.length) return null;
  return (
    <View style={estilos.alertas} accessibilityRole="alert">
      {alertas.map((al) => (
        <View key={al.id} style={[estilos.alerta, al.tono === 'danger' ? estilos.alertaDanger : estilos.alertaAviso]}>
          <Ionicons name={al.icon} size={18} color={al.tono === 'danger' ? '#9A3416' : '#7A5112'} />
          <Text style={[estilos.alertaTexto, { color: al.tono === 'danger' ? '#9A3416' : '#7A5112' }]}>{al.texto}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tira semanal: los próximos 7 días con la cantidad de pendientes; tocar un día abre el Calendario en ese día.
// ---------------------------------------------------------------------------
export function SemanaTira({ avisos, onElegirDia }) {
  const hoy = new Date();
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    return d;
  });
  return (
    <View {...paper('cartulina')} style={estilos.card}>
      <Text style={estilos.titulo} accessibilityRole="header">Esta semana</Text>
      <View style={estilos.semana}>
        {dias.map((d, i) => {
          const delDia = (avisos || []).filter((a) => (i === 0 ? a.fecha <= finDeDia(d) : mismoDia(a.fecha, d)));
          const esHoy = i === 0;
          const categorias = esHoy ? [] : [...new Set(delDia.map(categoriaDe))];
          const tono = TONO_CATEGORIA[categorias[0]];
          return (
            <PressScale
              key={i}
              style={estilos.diaCelda}
              contentStyle={[estilos.dia, esHoy ? estilos.diaHoy : tono && { backgroundColor: tono.bg, borderWidth: 1, borderColor: tono.borde }]}
              onPress={() => onElegirDia(dayKey(d))}
              accessibilityLabel={`${NOMBRE_DIA[d.getDay()]} ${d.getDate()}: ${delDia.length === 0 ? 'sin pendientes' : `${delDia.length} pendiente${delDia.length === 1 ? '' : 's'}`}`}
            >
              <FondoCategorias categorias={categorias} />
              <Text style={[estilos.diaNombre, esHoy && estilos.diaNombreHoy]}>{esHoy ? 'hoy' : NOMBRE_DIA[d.getDay()]}</Text>
              <Text style={[estilos.diaNumero, esHoy && estilos.diaNombreHoy]}>{d.getDate()}</Text>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

export { colorDeMiembro };

const estilos = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.08)', padding: 24, gap: 12 },
  cab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titulo: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 48 },
  enlaceTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  ayuda: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  vacio: { alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  vacioTitulo: { fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('600'), color: colors.ink },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, flexWrap: 'wrap' },
  filaBorde: { borderTopWidth: 1, borderTopColor: 'rgba(42, 36, 33, 0.08)' },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  filaTexto: { flex: 1, minWidth: 180, gap: 4 },
  filaTitulo: { fontSize: 16, lineHeight: 22, fontFamily: poppinsWeight('600'), color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  hora: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  horaVencida: { color: '#9A3416', fontFamily: poppinsWeight('600') },
  quien: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quienTexto: { fontSize: 14, color: colors.textBody },
  acciones: { flexDirection: 'row', gap: 8 },
  btnHecho: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.salvia },
  btnHechoTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: '#FFFFFF' },
  btnTarde: { minHeight: 48, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(42, 36, 33, 0.25)' },
  btnTardeTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  alertas: { gap: 8 },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  alertaDanger: { backgroundColor: '#FAECE7', borderColor: 'rgba(194, 70, 35, 0.35)' },
  alertaAviso: { backgroundColor: '#FDF3E1', borderColor: 'rgba(200, 141, 50, 0.45)' },
  alertaTexto: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: poppinsWeight('600') },
  semana: { flexDirection: 'row', gap: 8 },
  diaCelda: { flex: 1, minWidth: 0 },
  dia: { alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 88, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FBF8F3', borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.08)', overflow: 'hidden' },
  diaHoy: { backgroundColor: '#C24623', borderColor: '#C24623' },
  diaNombre: { fontSize: 13, lineHeight: 18, color: colors.textBody, textTransform: 'uppercase' },
  diaNombreHoy: { color: '#FFFFFF' },
  diaNumero: { fontSize: 22, lineHeight: 28, fontFamily: SERIF_BOLD, color: colors.ink },
  suaveWrap: { alignSelf: 'flex-start' },
  suave: { minHeight: 48, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(42, 36, 33, 0.22)', backgroundColor: 'transparent' },
  suaveHover: { backgroundColor: '#F3EAE0' },
  suaveTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.ink },
  sticker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.salvia,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
