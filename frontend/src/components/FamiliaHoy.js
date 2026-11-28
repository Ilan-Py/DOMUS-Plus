import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { poppinsWeight, SERIF_BOLD } from '../theme/typography';
import PaperCard from './PaperCard';
import api from '../api/client';
import PressScale from './PressScale';
import { mostrarToast } from './ToastHost';
import EventItem from './EventItem';
import Ilustracion from './Ilustracion';
import InlineError from './InlineError';
import ErrorBanner from './ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { color, texto, espacio, radio, tactil } from '../theme/tokens';
import { hora, fechaLarga } from '../utils/formato';
import { marcar, pasar, horaParaPasar, separarHoy, estadoParaMostrar, palabras, detalleDeMarca } from '../data/dosis';
import { dayKey, TONO_CATEGORIA, FondoCategorias } from './MiniCalendar';
import {
  colorDeMiembro,
  duenoDeAviso,
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

// Color por tipo de aviso, igual que en el Calendario (medicación, vacuna, turno o control).
function categoriaDe(a) {
  return a.tipo;
}

// ---------------------------------------------------------------------------
// Hoy (docs/ux/03-definicion.md §2 y §3, docs/ux/05-copy.md §4.1):
//  - «Quedó sin marcar»: pendientes de días anteriores. No se pasan de hora: se pregunta si se dio (DOS-03).
//  - «Hoy»: lo de hoy, con «Dada» y «Pasar a las …» (sin cruzar la medianoche ni pisar la próxima dosis, DOS-01).
//  - Lo marcado hoy queda a la vista con su estado y «Deshacer» (DOS-02). El toast también ofrece «Deshacer».
// ---------------------------------------------------------------------------
function Boton({ titulo, onPress, variante = 'secundario', icono, disabled, etiqueta }) {
  const principal = variante === 'principal';
  const soloTexto = variante === 'texto';
  return (
    <PressScale
      contentStyle={[estilos.boton, principal && estilos.botonPrincipal, soloTexto && estilos.botonTexto, disabled && estilos.botonApagado]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={etiqueta || titulo}
    >
      {!!icono && <Ionicons name={icono} size={18} color={principal ? color.sobreColor : color.tinta} />}
      <Text style={[estilos.botonEtiqueta, principal && { color: color.sobreColor }, soloTexto && estilos.botonEtiquetaTexto]}>{titulo}</Text>
    </PressScale>
  );
}

export function HoyPanel({ todos, error, actualizar, recargar, integrantes, mascotas, onVerCalendario, onProgramar }) {
  const { usuario } = useAuth();
  const [ocupado, setOcupado] = useState(null);
  // Fila de un día anterior en la que se tocó «Sí, se la dieron»: se pregunta a qué hora.
  const [preguntaHora, setPreguntaHora] = useState(null);
  const ahora = new Date();
  const { hoy, atrasados, marcadosHoy } = separarHoy(todos, ahora);

  function persona(a) {
    const d = duenoDeAviso(a);
    if (!d) return null;
    const m = (d.clase === 'integrante' ? integrantes : mascotas).find((x) => x.id === d.id);
    return m ? { clase: d.clase, nombre: m.nombre, apellido: m.apellido, avatarId: m.avatar_id, fotoUrl: m.foto_url } : null;
  }

  async function hacer(id, fn) {
    if (ocupado) return;
    setOcupado(id);
    try {
      await fn();
    } finally {
      setOcupado(null);
    }
  }

  const opciones = (a) => ({ persona: persona(a), alCambiar: actualizar, recargar, usuario });

  async function deshacer(a) {
    actualizar(a.id, { estado: 'pendiente', activo: true, hecho_a: null, marcado_por: null });
    try {
      await api.patch(`/api/recordatorios/${a.id}/reactivar`);
      mostrarToast('Listo, quedó sin marcar');
    } catch (err) {
      actualizar(a.id, null);
      mostrarToast(err?.status ? err.mensaje : 'No pudimos deshacer la marca. Revisá la conexión y probá de nuevo.', 'error');
    }
    recargar();
  }

  function fila(a, seccion) {
    const p = palabras(a.tipo);
    const estado = estadoParaMostrar(a, ahora);
    const pers = persona(a);
    const nombre = a.descripcion || p.hecho;
    const deQuien = pers ? `, ${pers.nombre}` : '';
    let acciones = null;

    if (seccion === 'marcado') {
      acciones = (
        <Boton
          variante="texto"
          titulo="Deshacer"
          etiqueta={`Deshacer la marca: ${nombre}${deQuien}`}
          disabled={!!ocupado}
          onPress={() => hacer(a.id, () => deshacer(a))}
        />
      );
    } else if (seccion === 'atrasado' && preguntaHora === a.id) {
      acciones = (
        <View style={estilos.pregunta}>
          <Text style={[texto.meta, { color: color.texto }]}>¿A qué hora, más o menos?</Text>
          <View style={estilos.botones}>
            <Boton
              variante="principal"
              titulo={`A horario (${hora(a.fecha)})`}
              etiqueta={`${p.hecho} a horario, a las ${hora(a.fecha)}: ${nombre}${deQuien}`}
              disabled={!!ocupado}
              onPress={() => hacer(a.id, async () => { setPreguntaHora(null); await marcar(a, 'hecho', { ...opciones(a), hechoA: a.fecha }); })}
            />
            <Boton
              titulo="No sé la hora"
              etiqueta={`${p.hecho}, no sé a qué hora: ${nombre}${deQuien}`}
              disabled={!!ocupado}
              onPress={() => hacer(a.id, async () => { setPreguntaHora(null); await marcar(a, 'hecho', opciones(a)); })}
            />
            <Boton variante="texto" titulo="Cancelar" onPress={() => setPreguntaHora(null)} />
          </View>
        </View>
      );
    } else if (seccion === 'atrasado') {
      acciones = (
        <>
          <Boton
            variante="principal"
            icono="checkmark"
            titulo={p.si}
            etiqueta={`${p.si}: ${nombre}${deQuien}`}
            disabled={!!ocupado}
            onPress={() => setPreguntaHora(a.id)}
          />
          <Boton
            titulo={p.omitido}
            etiqueta={`${p.omitido}: ${nombre}${deQuien}`}
            disabled={!!ocupado}
            onPress={() => hacer(a.id, () => marcar(a, 'omitido', opciones(a)))}
          />
        </>
      );
    } else {
      const nueva = horaParaPasar(a, todos, ahora);
      acciones = (
        <>
          <Boton
            variante="principal"
            icono="checkmark"
            titulo={p.hecho}
            etiqueta={`${p.accion}: ${nombre}${deQuien}`}
            disabled={!!ocupado}
            onPress={() => hacer(a.id, () => marcar(a, 'hecho', opciones(a)))}
          />
          {nueva ? (
            <Boton
              titulo={`Pasar a las ${hora(nueva)}`}
              etiqueta={`Pasar a las ${hora(nueva)}: ${nombre}${deQuien}`}
              disabled={!!ocupado}
              onPress={() => hacer(a.id, () => pasar(a, nueva, { recargar }))}
            />
          ) : estado === 'sin_marcar' ? (
            <Boton
              titulo={p.omitido}
              etiqueta={`${p.omitido}: ${nombre}${deQuien}`}
              disabled={!!ocupado}
              onPress={() => hacer(a.id, () => marcar(a, 'omitido', opciones(a)))}
            />
          ) : null}
        </>
      );
    }

    let detalle;
    if (seccion === 'marcado') detalle = detalleDeMarca(a);
    else if (estado === 'sin_marcar' && seccion === 'hoy') detalle = `Sin marcar · era a las ${hora(a.fecha)}`;

    return (
      <EventItem
        tipo={a.tipo}
        titulo={a.descripcion}
        fecha={a.fecha}
        persona={pers}
        recurrente={!!a.serie_id}
        estado={estado}
        detalleEstado={detalle}
      >
        {acciones}
      </EventItem>
    );
  }

  const nadaPendiente = hoy.length === 0 && atrasados.length === 0;

  return (
    <PaperCard nivel={1} hoja="terracota" style={estilos.card} wrapperStyle={estilos.hojaMargen}>
      <View style={estilos.cab}>
        <View style={estilos.flex}>
          <Text style={estilos.titulo} accessibilityRole="header">Hoy</Text>
          <Text style={[texto.meta, { color: color.texto }]}>{fechaLarga(ahora)}</Text>
        </View>
        <PressScale contentStyle={estilos.enlace} onPress={onVerCalendario} accessibilityLabel="Ver calendario">
          <Text style={estilos.enlaceTexto}>Ver calendario</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.limeDeep} />
        </PressScale>
      </View>

      {todos === null ? (
        <Text style={estilos.ayuda} accessibilityLabel="Cargando lo de hoy">Cargando lo de hoy…</Text>
      ) : error && todos.length === 0 ? (
        <InlineError message="No pudimos cargar lo de hoy." onRetry={recargar} />
      ) : (
        <>
          {atrasados.length > 0 && (
            <View>
              <Text style={[texto.sobretitulo, estilos.sobretitulo]} accessibilityRole="header">QUEDÓ SIN MARCAR</Text>
              {atrasados.map((a, i) => (
                <View key={a.id} style={i > 0 && estilos.filaBorde}>{fila(a, 'atrasado')}</View>
              ))}
            </View>
          )}

          {hoy.length > 0 && (
            <View>
              {atrasados.length > 0 && <Text style={[texto.sobretitulo, estilos.sobretitulo]} accessibilityRole="header">HOY</Text>}
              {hoy.map((a, i) => (
                <View key={a.id} style={i > 0 && estilos.filaBorde}>{fila(a, 'hoy')}</View>
              ))}
            </View>
          )}

          {nadaPendiente && (
            <View style={estilos.vacio}>
              <Ilustracion nombre="aldia" size={72} />
              <View style={estilos.flex}>
                <Text style={estilos.vacioTitulo}>{marcadosHoy.length ? 'Todo marcado por hoy' : 'Nada pendiente para hoy'}</Text>
                <Text style={estilos.ayuda}>
                  {marcadosHoy.length ? 'Lo que se marcó queda abajo, por si hay que corregir algo.' : 'Cuando programes una dosis o un turno, aparece acá.'}
                </Text>
                {!marcadosHoy.length && <BotonSuave title="Agregar" onPress={onProgramar} />}
              </View>
            </View>
          )}

          {marcadosHoy.length > 0 && (
            <View style={estilos.marcados}>
              <Text style={[texto.sobretitulo, estilos.sobretitulo]} accessibilityRole="header">YA MARCADO HOY</Text>
              {marcadosHoy.map((a, i) => (
                <View key={a.id} style={i > 0 && estilos.filaBorde}>{fila(a, 'marcado')}</View>
              ))}
            </View>
          )}

          {error && <ErrorBanner variant="aviso" message="No pudimos actualizar lo de hoy. Puede que falte algo." onRetry={recargar} />}
        </>
      )}
    </PaperCard>
  );
}

// ---------------------------------------------------------------------------
// Alertas proactivas: vacunas próximas o vencidas. Lo que quedó sin marcar ya está en «Hoy» (con sus acciones):
// repetirlo acá era un segundo aviso rojo sin nada que hacer.
// ---------------------------------------------------------------------------
export function calcularAlertas({ vacunas }) {
  const ahora = new Date();
  const alertas = [];
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
    <PaperCard nivel={1} style={estilos.card}>
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
    </PaperCard>
  );
}

export { colorDeMiembro };

const estilos = StyleSheet.create({
  card: { padding: 24, gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  marcados: { marginTop: espacio[2], paddingTop: espacio[2], borderTopWidth: 1, borderTopColor: color.linea },
  sobretitulo: { color: color.texto, marginTop: espacio[2] },
  pregunta: { gap: espacio[2] },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2] },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: tactil.comodo, paddingHorizontal: espacio[4], borderRadius: radio.pastilla, borderWidth: 1.5, borderColor: color.lineaFuerte, backgroundColor: color.cartulina },
  botonPrincipal: { backgroundColor: color.salvia, borderColor: color.salvia },
  botonTexto: { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: espacio[3] },
  botonApagado: { opacity: 0.55 },
  botonEtiqueta: { fontSize: 15, fontFamily: poppinsWeight('600'), color: color.tinta },
  botonEtiquetaTexto: { color: color.terracotaTexto, textDecorationLine: 'underline' },
  hojaMargen: { marginRight: 7, marginBottom: 8 }, // lugar para la hoja de color que asoma detrás
  cab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titulo: { fontSize: 22, lineHeight: 30, fontFamily: SERIF_BOLD, color: colors.ink },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 48 },
  enlaceTexto: { fontSize: 15, fontFamily: poppinsWeight('600'), color: colors.limeDeep },
  ayuda: { fontSize: 14, lineHeight: 20, color: colors.textBody },
  vacio: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  vacioTitulo: { fontSize: 17, lineHeight: 24, fontFamily: poppinsWeight('600'), color: colors.ink },
  filaBorde: { borderTopWidth: 1, borderTopColor: 'rgba(42, 36, 33, 0.08)' },
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
});
