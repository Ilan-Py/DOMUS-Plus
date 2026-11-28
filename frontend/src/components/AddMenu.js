import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './PressScale';
import { paper } from '../theme/paper';
import { color, texto, espacio, radio, tactil, tipoEvento } from '../theme/tokens';

// «+ Agregar»: el mismo menú en toda la app (docs/ux/03-definicion.md §1.4). Primero lo de cuidar (lo más frecuente),
// después la familia. Invitar está acá y en ningún otro lado del cuerpo de las pantallas.
//
//   <AddMenu onElegir={(clave) => …} />                     botón con menú desplegable (desktop, cabeceras)
//   <AddMenu variante="fab" onElegir={(clave) => …} />      botón flotante con hoja inferior (mobile)
//
// claves: 'medicacion' | 'control' | 'vacuna' | 'persona' | 'mascota' | 'invitar'
// Teclado (web): Enter/Espacio abre, el foco va al primer ítem, ↑ ↓ recorren, Escape cierra y devuelve el foco al botón.
export const GRUPOS_AGREGAR = [
  {
    titulo: 'Cuidar',
    items: [
      { clave: 'medicacion', etiqueta: 'Medicación', detalle: 'Una dosis o un tratamiento', icono: tipoEvento.medicacion.icono, tono: tipoEvento.medicacion },
      { clave: 'control', etiqueta: 'Turno o control', detalle: 'Médico, análisis, veterinario', icono: tipoEvento.control.icono, tono: tipoEvento.control },
      { clave: 'vacuna', etiqueta: 'Vacuna', detalle: 'Aplicada o por aplicar', icono: tipoEvento.vacuna.icono, tono: tipoEvento.vacuna },
    ],
  },
  {
    titulo: 'La familia',
    items: [
      { clave: 'persona', etiqueta: 'Persona sin cuenta', detalle: 'Un nene, un abuelo…', icono: 'person-add-outline' },
      { clave: 'mascota', etiqueta: 'Mascota', icono: 'paw-outline' },
      { clave: 'invitar', etiqueta: 'Invitar a alguien', detalle: 'Con su propia cuenta', icono: 'mail-outline' },
    ],
  },
];

export default function AddMenu({ onElegir, variante = 'boton', etiqueta = 'Agregar', excluir = [], style }) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState(null);
  const boton = useRef(null);
  const items = useRef([]);
  const { width, height } = useWindowDimensions();
  const esFab = variante === 'fab';

  const grupos = GRUPOS_AGREGAR.map((g) => ({ ...g, items: g.items.filter((i) => !excluir.includes(i.clave)) })).filter((g) => g.items.length);

  function abrir() {
    if (esFab || !boton.current?.measureInWindow) {
      setPos(null);
      setAbierto(true);
      return;
    }
    boton.current.measureInWindow((x, y, w, h) => {
      setPos({ x, y, w, h });
      setAbierto(true);
    });
  }

  function cerrar() {
    setAbierto(false);
    if (Platform.OS === 'web') setTimeout(() => boton.current?.focus?.(), 0);
  }

  function elegir(clave) {
    setAbierto(false);
    onElegir?.(clave);
  }

  // Foco al primer ítem al abrir; ↑ ↓ para recorrer (web).
  useEffect(() => {
    if (!abierto || Platform.OS !== 'web') return undefined;
    const t = setTimeout(() => items.current[0]?.focus?.(), 30);
    function teclas(ev) {
      if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
      ev.preventDefault();
      const lista = items.current.filter(Boolean);
      const i = lista.indexOf(document.activeElement);
      const sig = ev.key === 'ArrowDown' ? (i + 1) % lista.length : (i - 1 + lista.length) % lista.length;
      lista[sig]?.focus?.();
    }
    window.addEventListener('keydown', teclas);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', teclas);
    };
  }, [abierto]);

  // Posición del menú desplegable: debajo del botón, sin salirse de la pantalla.
  const ANCHO = 320;
  const estiloPos = pos
    ? {
        position: 'absolute',
        top: Math.min(pos.y + pos.h + espacio[2], height - 420),
        left: Math.max(espacio[4], Math.min(pos.x, width - ANCHO - espacio[4])),
        width: ANCHO,
      }
    : null;

  let n = 0;
  const lista = grupos.map((g, gi) => (
    <View key={g.titulo} style={[estilos.grupo, gi > 0 && estilos.grupoSeparado]} accessibilityRole="none">
      <Text style={[texto.sobretitulo, estilos.grupoTitulo]}>{g.titulo.toUpperCase()}</Text>
      {g.items.map((it) => {
        const indice = n++;
        return (
          <PressScale
            key={it.clave}
            ref={(r) => { items.current[indice] = r; }}
            contentStyle={estilos.item}
            onPress={() => elegir(it.clave)}
            accessibilityRole="menuitem"
            accessibilityLabel={it.detalle ? `${it.etiqueta}. ${it.detalle}` : it.etiqueta}
          >
            <View style={[estilos.itemIcono, it.tono && { backgroundColor: it.tono.fondo }]}>
              <Ionicons name={it.icono} size={20} color={it.tono ? it.tono.texto : color.terracotaTexto} />
            </View>
            <View style={estilos.itemTextos}>
              <Text style={[texto.etiqueta, { color: color.tinta }]}>{it.etiqueta}</Text>
              {!!it.detalle && <Text style={[texto.meta, { color: color.texto }]}>{it.detalle}</Text>}
            </View>
          </PressScale>
        );
      })}
    </View>
  ));

  return (
    <>
      <PressScale
        ref={boton}
        style={[esFab ? estilos.fabPos : null, style]}
        contentStyle={esFab ? estilos.fab : estilos.boton}
        onPress={abrir}
        accessibilityLabel={`${etiqueta}: abre un menú`}
        accessibilityState={{ expanded: abierto }}
        {...(Platform.OS === 'web' ? { 'aria-haspopup': 'menu' } : null)}
      >
        <Ionicons name="add" size={esFab ? 28 : 20} color={color.sobreColor} />
        {!esFab && <Text style={[texto.etiqueta, estilos.botonTexto]}>{etiqueta}</Text>}
      </PressScale>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={cerrar}>
        <Pressable style={[estilos.fondo, esFab && estilos.fondoHoja]} onPress={cerrar} accessibilityLabel="Cerrar el menú" accessibilityRole="button">
          <Pressable
            {...paper('papel', 'p3')}
            style={[estilos.menu, esFab || !pos ? estilos.hoja : estiloPos]}
            accessibilityRole="menu"
            accessibilityLabel={etiqueta}
            onPress={() => {}}
          >
            {lista}
            {(esFab || !pos) && (
              <PressScale contentStyle={estilos.cancelar} onPress={cerrar} accessibilityLabel="Cancelar">
                <Text style={[texto.etiqueta, { color: color.tinta }]}>Cancelar</Text>
              </PressScale>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
    minHeight: tactil.comodo,
    paddingHorizontal: espacio[5],
    borderRadius: radio.control,
    backgroundColor: color.terracota,
  },
  botonTexto: { color: color.sobreColor },
  fabPos: { position: 'absolute', right: espacio[5], bottom: 88, zIndex: 20 },
  fab: {
    width: tactil.fab,
    height: tactil.fab,
    borderRadius: tactil.fab / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.terracota,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2B211C',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 6,
  },
  fondo: { flex: 1, backgroundColor: 'rgba(42, 36, 33, 0.12)' },
  fondoHoja: { justifyContent: 'flex-end', backgroundColor: 'rgba(42, 36, 33, 0.3)' },
  menu: { backgroundColor: color.cartulina, borderRadius: radio.tarjeta, paddingVertical: espacio[2] },
  hoja: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: radio.contenedor, borderTopRightRadius: radio.contenedor, paddingBottom: espacio[6], width: '100%', maxWidth: 560, alignSelf: 'center' },
  grupo: { paddingHorizontal: espacio[2] },
  grupoSeparado: { marginTop: espacio[2], paddingTop: espacio[2], borderTopWidth: 1, borderTopColor: color.linea },
  grupoTitulo: { color: color.texto, paddingHorizontal: espacio[3], paddingVertical: espacio[1] },
  item: { flexDirection: 'row', alignItems: 'center', gap: espacio[3], minHeight: tactil.comodo, paddingHorizontal: espacio[3], paddingVertical: espacio[1], borderRadius: radio.control },
  itemIcono: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.terracotaPalido },
  itemTextos: { flex: 1 },
  cancelar: { marginTop: espacio[2], marginHorizontal: espacio[4], minHeight: tactil.comodo, alignItems: 'center', justifyContent: 'center', borderRadius: radio.control, borderWidth: 1, borderColor: color.lineaFuerte },
});
