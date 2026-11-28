import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PaperCard from '../components/PaperCard';
import PaperBanner from '../components/PaperBanner';
import BordeTijera from '../components/BordeTijera';
import StatChip from '../components/StatChip';
import EventItem from '../components/EventItem';
import EmptyState from '../components/EmptyState';
import EmptySlot from '../components/EmptySlot';
import IconoTipo from '../components/IconoTipo';
import AddMenu from '../components/AddMenu';
import MemberCard from '../components/MemberCard';
import PetCard from '../components/PetCard';
import PrimaryButton from '../components/PrimaryButton';
import PressScale from '../components/PressScale';
import Ilustracion, { NOMBRES_ILUSTRACION } from '../components/Ilustracion';
import { Toast, mostrarToast } from '../components/ToastHost';
import { paper } from '../theme/paper';
import { color, colorAltoContraste, tipoEvento, estadoDosis, texto, espacio, radio, tactil, hoja, movimiento } from '../theme/tokens';
import { plural, fechaRelativa, fechaCorta, cuandoEvento } from '../utils/formato';

// /styleguide (sólo web): todos los tokens y componentes del sistema papercut renderizados, con sus estados. Los datos
// son de muestra y viven sólo acá. Ver docs/ux/04-design-system.md.

// ---- contraste calculado en vivo (WCAG 2.1, luminancia relativa)
function luminancia(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const AHORA = new Date();
const enHoras = (h, m = 0, dias = 0) => {
  const d = new Date(AHORA);
  d.setDate(d.getDate() + dias);
  d.setHours(h, m, 0, 0);
  return d;
};
const MARIA = { nombre: 'María Elena', apellido: 'Argento', clase: 'integrante' };
const MONICA = { nombre: 'Mónica', apellido: 'Argento', clase: 'integrante' };
const FATIGA = { nombre: 'Fatiga', clase: 'mascota' };

function Seccion({ id, titulo, bajada, children }) {
  return (
    <View style={estilos.seccion} nativeID={id}>
      <Text style={[texto.seccion, { color: color.tinta }]} accessibilityRole="header" aria-level={2}>
        {titulo}
      </Text>
      {!!bajada && <Text style={[texto.cuerpo, estilos.bajada]}>{bajada}</Text>}
      <View style={{ gap: espacio[4] }}>{children}</View>
    </View>
  );
}

function Subtitulo({ children }) {
  return (
    <Text style={[texto.sobretitulo, { color: color.texto }]} accessibilityRole="header" aria-level={3}>
      {String(children).toUpperCase()}
    </Text>
  );
}

function Muestra({ nombre, valor, fondo = color.cartulina, textoEncima }) {
  const r = textoEncima ? contraste(textoEncima, valor) : null;
  return (
    <View style={estilos.muestra}>
      <View style={[estilos.muestraColor, { backgroundColor: valor }]}>
        {!!textoEncima && <Text style={[texto.etiqueta, { color: textoEncima }]}>Aa {r.toFixed(2)}</Text>}
      </View>
      <Text style={[texto.etiqueta, { color: color.tinta }]}>{nombre}</Text>
      <Text style={[texto.meta, { color: color.texto, fontVariant: ['tabular-nums'] }]}>{valor}</Text>
    </View>
  );
}

function Par({ etiqueta, frente, fondo, minimo = 4.5 }) {
  const r = contraste(frente, fondo);
  const ok = r >= minimo;
  return (
    <View style={[estilos.par, { backgroundColor: fondo }]}>
      <Text style={[texto.cuerpo, { color: frente, flex: 1 }]}>{etiqueta}</Text>
      <Text style={[texto.hora, { color: frente }]}>{r.toFixed(2)}:1</Text>
      <View style={[estilos.parSello, { backgroundColor: ok ? estadoDosis.dada.fondo : estadoDosis.sin_marcar.fondo }]}>
        <Text style={[texto.meta, { color: ok ? estadoDosis.dada.color : estadoDosis.sin_marcar.color }]}>{ok ? `AA ✓ (${minimo})` : `Falla (${minimo})`}</Text>
      </View>
    </View>
  );
}

function BotonChico({ titulo, onPress, variante = 'secundario' }) {
  const [hover, setHover] = useState(false);
  const primario = variante === 'primario';
  return (
    <PressScale
      contentStyle={[estilos.btn, primario ? estilos.btnPrimario : estilos.btnSecundario, hover && (primario ? estilos.btnPrimarioHover : estilos.btnSecundarioHover)]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      accessibilityLabel={titulo}
    >
      <Text style={[texto.etiqueta, { color: primario ? color.sobreColor : color.tinta }]}>{titulo}</Text>
    </PressScale>
  );
}

const INDICE = [
  ['principio', 'Principio'],
  ['color', 'Color'],
  ['tipografia', 'Tipografía'],
  ['espacio', 'Espaciado y radios'],
  ['papel', 'Papel'],
  ['movimiento', 'Movimiento'],
  ['ilustraciones', 'Ilustraciones'],
  ['componentes', 'Componentes'],
  ['detalles', 'Detalles de texto'],
];

export default function StyleguideScreen() {
  const { width } = useWindowDimensions();
  const ancho = width >= 1100;
  const [ultimo, setUltimo] = useState(null);

  return (
    <ScrollView style={{ backgroundColor: color.fondo }} contentContainerStyle={[estilos.pagina, ancho && estilos.paginaAncha]}>
      <PaperBanner
        titulo="Sistema visual de DOMUS+"
        bajada="Papel recortado en capas para lo decorativo; superficies planas y legibles para los datos de salud."
        ilustracion={<Ilustracion nombre="familia" size={ancho ? 104 : 72} />}
      >
        {INDICE.map(([id, t]) => (
          <PressScale
            key={id}
            contentStyle={estilos.indice}
            onPress={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            accessibilityRole="link"
            accessibilityLabel={`Ir a ${t}`}
          >
            <Text style={[texto.etiqueta, { color: color.terracotaTexto }]}>{t}</Text>
          </PressScale>
        ))}
      </PaperBanner>

      <Seccion id="principio" titulo="Principio">
        <PaperCard nivel={2} hoja="terracota" style={estilos.tarjeta}>
          <Text style={[texto.cuerpo, { color: color.tinta }]}>
            El papel va en las capas decorativas, las cabeceras, los estados vacíos y los chips. Las listas, la grilla, los
            formularios y la ficha de emergencia son planos. La estética nunca le gana a la legibilidad: si una decoración
            compite con un dato de salud, se saca la decoración.
          </Text>
          <Text style={[texto.cuerpoChico, { color: color.texto }]}>
            Una protagonista por pantalla (la única con hoja de color) · un acento por tarjeta · el punteado sólo en EmptySlot ·
            ningún color comunica algo sin ícono o palabra.
          </Text>
        </PaperCard>
      </Seccion>

      <Seccion id="color" titulo="Color" bajada="Los ratios se calculan en vivo con la fórmula de WCAG 2.1. Texto: 4.5:1. Marcas que no son texto: 3:1.">
        <Subtitulo>Superficies y texto</Subtitulo>
        <View style={estilos.fila}>
          <Muestra nombre="Fondo · crema" valor={color.fondo} textoEncima={color.tinta} />
          <Muestra nombre="Cartulina" valor={color.cartulina} textoEncima={color.tinta} />
          <Muestra nombre="Arena" valor={color.arena} textoEncima={color.texto} />
          <Muestra nombre="Tinta" valor={color.tinta} textoEncima="#FFFFFF" />
          <Muestra nombre="Texto" valor={color.texto} textoEncima="#FFFFFF" />
          <Muestra nombre="Texto suave" valor={color.textoSuave} textoEncima="#FFFFFF" />
        </View>
        <Subtitulo>Marca</Subtitulo>
        <View style={estilos.fila}>
          <Muestra nombre="Terracota · primario" valor={color.terracota} textoEncima="#FFFFFF" />
          <Muestra nombre="Terracota hover" valor={color.terracotaHover} textoEncima="#FFFFFF" />
          <Muestra nombre="Salvia · mascotas, al día" valor={color.salvia} textoEncima="#FFFFFF" />
          <Muestra nombre="Rosa · decorativo" valor={color.rosa} />
          <Muestra nombre="Mostaza · decorativo" valor={color.mostaza} />
        </View>
        <Subtitulo>Tipos de evento (siempre con ícono y nombre)</Subtitulo>
        <View style={estilos.fila}>
          {Object.entries(tipoEvento).map(([k, t]) => (
            <View key={k} style={[estilos.tipo, { backgroundColor: t.fondo }]}>
              <View style={[estilos.punto, { backgroundColor: t.marca }]} />
              <IconoTipo tipo={k} size={18} />
              <Text style={[texto.etiqueta, { color: t.texto }]}>{t.etiqueta}</Text>
              <Text style={[texto.meta, { color: t.texto }]}>{contraste(t.texto, t.fondo).toFixed(2)}:1 · marca {contraste(t.marca, color.cartulina).toFixed(2)}:1</Text>
            </View>
          ))}
        </View>
        <Subtitulo>Pares de texto</Subtitulo>
        <View style={{ gap: espacio[2] }}>
          <Par etiqueta="Tinta sobre fondo" frente={color.tinta} fondo={color.fondo} />
          <Par etiqueta="Texto sobre arena" frente={color.texto} fondo={color.arena} />
          <Par etiqueta="Texto suave sobre cartulina" frente={color.textoSuave} fondo={color.cartulina} />
          <Par etiqueta="Texto suave sobre arena (no usar)" frente={color.textoSuave} fondo={color.arena} />
          <Par etiqueta="Blanco sobre terracota (botón primario)" frente="#FFFFFF" fondo={color.terracota} />
          <Par etiqueta="Enlace terracota sobre cartulina" frente={color.terracotaTexto} fondo={color.cartulina} />
          <Par etiqueta="Error sobre su fondo" frente={color.error} fondo={color.errorFondo} />
          <Par etiqueta="Contraste alto: tinta sobre blanco" frente={colorAltoContraste.tinta} fondo={colorAltoContraste.cartulina} />
        </View>
      </Seccion>

      <Seccion id="tipografia" titulo="Tipografía" bajada="Lora para los títulos, Plus Jakarta Sans para la interfaz. Los números que se comparan van con tabular-nums.">
        <PaperCard style={estilos.tarjeta}>
          {[
            ['pantalla', 'Familia Argento', 'Lora 32/40 · título de pantalla'],
            ['seccion', 'Hoy en tu familia', 'Lora 22/30 · protagonista y secciones'],
            ['tarjeta', 'Mi ficha de emergencia', 'Lora 18/24 · título de tarjeta'],
            ['nombre', 'María Elena Argento', 'Jakarta 500 17/24 · nombres y títulos de evento'],
            ['cuerpo', 'Tiene marcapasos desde 2021. Usa audífono en el oído izquierdo.', 'Jakarta 400 16/24 · cuerpo'],
            ['cuerpoChico', '5 integrantes · 3 mascotas', 'Jakarta 400 14/20 · bajadas'],
            ['etiqueta', 'Completar ficha', 'Jakarta 500 15/20 · botones y chips'],
            ['meta', 'Ficha de emergencia · 67 %', 'Jakarta 400 13/18 · datos secundarios (mínimo)'],
            ['sobretitulo', 'HOY · VIERNES 27', 'Jakarta 600 13/18 · sobretítulos'],
            ['hora', '07:00  08:00  23:30', 'Jakarta 600 15/20 tabular · horas'],
            ['dato', 'A+   92 %', 'Jakarta 600 28/32 tabular · datos grandes'],
          ].map(([k, ej, desc]) => (
            <View key={k} style={estilos.tipoFila}>
              <Text style={[texto[k], { color: color.tinta, flex: 1 }]}>{ej}</Text>
              <Text style={[texto.meta, { color: color.texto, width: ancho ? 320 : 140 }]}>{`${k} · ${desc}`}</Text>
            </View>
          ))}
        </PaperCard>
      </Seccion>

      <Seccion id="espacio" titulo="Espaciado y radios" bajada="Múltiplos de 4. Si falta un valor, se agrega a la escala; no se inventa en la pantalla.">
        <View style={estilos.fila}>
          {Object.entries(espacio).filter(([k]) => k !== '0').map(([k, v]) => (
            <View key={k} style={estilos.espacioMuestra}>
              <View style={{ width: v, height: v, backgroundColor: hoja.colores.terracota, borderRadius: 2 }} />
              <Text style={[texto.meta, { color: color.texto }]}>{`espacio[${k}] · ${v}`}</Text>
            </View>
          ))}
        </View>
        <View style={estilos.fila}>
          {Object.entries(radio).map(([k, v]) => (
            <View key={k} style={estilos.espacioMuestra}>
              <View style={{ width: 72, height: 48, backgroundColor: color.cartulina, borderWidth: 1.5, borderColor: color.lineaFuerte, borderRadius: Math.min(v, 24) }} />
              <Text style={[texto.meta, { color: color.texto }]}>{`${k} · ${v === 999 ? 'pastilla' : v}`}</Text>
            </View>
          ))}
          <View style={estilos.espacioMuestra}>
            <View style={{ width: tactil.minimo, height: tactil.minimo, borderWidth: 1.5, borderColor: color.terracota, borderRadius: radio.control }} />
            <Text style={[texto.meta, { color: color.texto }]}>{`táctil mínimo · ${tactil.minimo}`}</Text>
          </View>
        </View>
      </Seccion>

      <Seccion id="papel" titulo="Papel" bajada="Sombras duras desplazadas (sin blur), hoja de color girada ±1°, canto de tijera y grano al 4 %.">
        <Subtitulo>Elevación (pasá el mouse: la hoja se levanta)</Subtitulo>
        <View style={estilos.fila}>
          {[1, 2, 3].map((n) => (
            <PaperCard key={n} nivel={n} style={estilos.nivel}>
              <Text style={[texto.tarjeta, { color: color.tinta }]}>{`Nivel ${n}`}</Text>
              <Text style={[texto.meta, { color: color.texto }]}>{['Tarjeta apoyada', 'Protagonista', 'Flotante: menús y avisos'][n - 1]}</Text>
            </PaperCard>
          ))}
        </View>
        <Subtitulo>Hoja de color que asoma (sólo la protagonista de cada pantalla)</Subtitulo>
        <View style={estilos.fila}>
          {Object.keys(hoja.colores).map((h, i) => (
            <PaperCard key={h} nivel={2} hoja={h} rotacion={i % 2 ? -1 : 1} style={estilos.nivel} wrapperStyle={{ marginRight: 8, marginBottom: 8 }}>
              <Text style={[texto.etiqueta, { color: color.tinta }]}>{h}</Text>
              <Text style={[texto.meta, { color: color.texto }]}>{i % 2 ? '−1°' : '+1°'}</Text>
            </PaperCard>
          ))}
        </View>
        <Subtitulo>Canto de tijera</Subtitulo>
        <View>
          <View style={{ height: 48, backgroundColor: color.arena, borderTopLeftRadius: radio.tarjeta, borderTopRightRadius: radio.tarjeta }} />
          <View style={{ height: 14 }}>
            <BordeTijera color="#E4D6C6" alto={14} semilla={7} style={{ position: 'absolute', top: 0 }} />
            <BordeTijera color={color.arena} alto={10} semilla={3} style={{ position: 'absolute', top: 0 }} />
          </View>
        </View>
        <Subtitulo>Grano</Subtitulo>
        <View style={estilos.fila}>
          <View {...paper('grano')} style={[estilos.grano, { backgroundColor: color.arena }]}>
            <Text style={[texto.meta, { color: color.texto }]}>Con grano (cabeceras, vacíos)</Text>
          </View>
          <View style={[estilos.grano, { backgroundColor: color.cartulina }]}>
            <Text style={[texto.meta, { color: color.texto }]}>Plano (datos)</Text>
          </View>
        </View>
      </Seccion>

      <Seccion id="movimiento" titulo="Movimiento" bajada={`Rápido ${movimiento.rapido} ms (toques) · base ${movimiento.base} ms (la hoja se levanta ${movimiento.elevar} px) · lento ${movimiento.lento} ms (menús y avisos). Con «reducir movimiento» no hay desplazamientos ni escalas: sólo cambia la sombra o la opacidad.`}>
        <View style={estilos.fila}>
          <PaperCard nivel={1} style={estilos.nivel}>
            <Text style={[texto.etiqueta, { color: color.tinta }]}>Pasá el mouse</Text>
          </PaperCard>
          <BotonChico titulo="Botón secundario" />
          <BotonChico titulo="Botón primario" variante="primario" />
        </View>
      </Seccion>

      <Seccion id="ilustraciones" titulo="Ilustraciones" bajada="2 a 4 capas planas, sombra de papel desplazada, canto blanco. Sin degradados. Decorativas: el texto de al lado dice lo mismo.">
        <View style={estilos.fila}>
          {NOMBRES_ILUSTRACION.map((n) => (
            <View key={n} style={estilos.ilus}>
              <Ilustracion nombre={n} size={96} />
              <Text style={[texto.meta, { color: color.texto }]}>{n}</Text>
            </View>
          ))}
        </View>
      </Seccion>

      <Seccion id="componentes" titulo="Componentes">
        <Subtitulo>PaperBanner</Subtitulo>
        <PaperBanner titulo="Familia Argento" bajada="5 integrantes · 3 mascotas" ilustracion={<Ilustracion nombre="familia" size={80} />} compacto>
          <StatChip valor={2} singular="dosis" plural="dosis" sufijo="hoy" tono="alerta" onPress={() => {}} />
          <StatChip valor={4} singular="turno" sufijo="esta semana" onPress={() => {}} />
          <StatChip valor={3} singular="ficha incompleta" plural="fichas incompletas" onPress={() => {}} />
        </PaperBanner>

        <Subtitulo>StatChip · estados</Subtitulo>
        <View style={estilos.fila}>
          <StatChip valor={1} singular="dosis" plural="dosis" sufijo="hoy" tono="alerta" />
          <StatChip valor={1} singular="turno" sufijo="esta semana" />
          <StatChip valor={null} singular="turno" sufijo="esta semana" />
          <StatChip valor={5} singular="vacuna" sufijo="al día" tono="ok" />
          <Text style={[texto.meta, { color: color.texto, alignSelf: 'center' }]}>(«0 …» no se muestra: ocultarSiCero)</Text>
        </View>

        <Subtitulo>EventItem · estados de una dosis</Subtitulo>
        <PaperCard nivel={2} hoja="terracota" style={estilos.tarjeta} wrapperStyle={{ marginRight: 8, marginBottom: 8 }}>
          <Text style={[texto.seccion, { color: color.tinta }]}>Hoy en tu familia</Text>
          <EventItem tipo="medicacion" titulo="Levotiroxina 50 mcg" fecha={enHoras(7)} persona={MONICA} recurrente estado="dada" detalleEstado="Dada 07:05 · Mónica">
            <BotonChico titulo="Deshacer" />
          </EventItem>
          <View style={estilos.divisor} />
          <EventItem tipo="medicacion" titulo="Gotas para los ojos" fecha={enHoras(23, 30)} persona={MARIA} estado="pendiente">
            <BotonChico titulo="Dar" variante="primario" />
            <BotonChico titulo="Más tarde" />
          </EventItem>
          <View style={estilos.divisor} />
          <EventItem tipo="control" titulo="Odontóloga — control" fecha={enHoras(10, 0, 1)} persona={{ nombre: 'Paola', clase: 'integrante' }} estado="futura" />
          <View style={estilos.divisor} />
          <Text style={[texto.sobretitulo, { color: estadoDosis.sin_marcar.color }]}>QUEDÓ SIN MARCAR (1)</Text>
          <EventItem tipo="medicacion" titulo="Losartán 50 mg" fecha={enHoras(8, 0, -3)} persona={MARIA} recurrente estado="sin_marcar">
            <BotonChico titulo="Se dio…" />
            <BotonChico titulo="No se dio" />
          </EventItem>
          <View style={estilos.divisor} />
          <EventItem tipo="vacuna" titulo="Antirrábica" fecha={enHoras(18, 0, -1)} persona={FATIGA} estado="no_se_dio" detalleEstado="No se dio · la llevamos el sábado" />
        </PaperCard>

        <Subtitulo>MemberCard y PetCard · mismo tratamiento</Subtitulo>
        <View style={[estilos.fila, { alignItems: 'flex-start' }]}>
          <View style={estilos.col}>
            <MemberCard
              integrante={{ nombre: 'María Elena', apellido: 'Argento', tipo: 'mayor', tipo_sangre: 'A+', alergias: 'Penicilina, AINEs' }}
              edad={79}
              proximo="Gotas para los ojos · hoy 23:30"
              completitud={100}
              onAbrir={() => setUltimo('Abrir María Elena')}
              onFicha={() => setUltimo('Ficha de María Elena')}
            />
          </View>
          <View style={estilos.col}>
            <MemberCard
              integrante={{ nombre: 'Nélida', apellido: 'Quiroga', tipo: 'mayor' }}
              edad={80}
              completitud={0}
              onAbrir={() => setUltimo('Abrir Nélida')}
              onFicha={() => setUltimo('Completar ficha de Nélida')}
            />
          </View>
          <View style={estilos.col}>
            <PetCard
              mascota={{ nombre: 'Fatiga', especie: 'Perro', raza: 'Mestizo' }}
              edad={6}
              vacunas="proxima"
              proximo="Antirrábica · en 45 días"
              onAbrir={() => setUltimo('Abrir Fatiga')}
              onFicha={() => setUltimo('Ficha de Fatiga')}
            />
          </View>
          <View style={estilos.col}>
            <EmptySlot texto="Persona sin cuenta" subtexto="Un nene, un abuelo…" icono="person-add-outline" alto={120} onPress={() => setUltimo('Agregar persona')} />
            <View style={{ height: espacio[3] }} />
            <EmptySlot texto="Mascota" icono="paw-outline" onPress={() => setUltimo('Agregar mascota')} />
          </View>
        </View>
        {!!ultimo && <Text style={[texto.meta, { color: color.texto }]} accessibilityLiveRegion="polite">{`Tocaste: ${ultimo}`}</Text>}

        <Subtitulo>AddMenu</Subtitulo>
        <View style={[estilos.fila, { alignItems: 'center' }]}>
          <AddMenu onElegir={(c) => setUltimo(`+ Agregar › ${c}`)} />
          <Text style={[texto.cuerpoChico, { color: color.texto, flex: 1 }]}>
            Desplegable en desktop. En mobile es el botón flotante (variante «fab») con una hoja inferior. Escape cierra, ↑ ↓
            recorren, el foco vuelve al botón.
          </Text>
          <View style={{ width: 120, height: 72, position: 'relative' }}>
            <AddMenu variante="fab" style={{ right: 0, bottom: 0 }} onElegir={(c) => setUltimo(`FAB › ${c}`)} />
          </View>
        </View>

        <Subtitulo>Toast</Subtitulo>
        <View style={{ gap: espacio[3], alignItems: 'flex-start' }}>
          <Toast texto="Vacuna guardada" tipo="ok" />
          <Toast texto="Dosis marcada como dada" tipo="ok" accion={{ etiqueta: 'Deshacer', onPress: () => {} }} />
          <Toast texto="No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo." tipo="error" onCerrar={() => {}} />
          <Toast texto="Estás sin conexión: ves lo último que se cargó." tipo="info" />
          <View style={estilos.fila}>
            <BotonChico titulo="Probar aviso con Deshacer" onPress={() => mostrarToast('Losartán marcado como dado', { accion: { etiqueta: 'Deshacer', onPress: () => mostrarToast('Listo, volvió a pendiente') } })} />
            <BotonChico titulo="Probar aviso de error" onPress={() => mostrarToast('No pudimos guardar. Probá de nuevo en un rato.', 'error')} />
          </View>
        </View>

        <Subtitulo>EmptyState</Subtitulo>
        <View style={[estilos.fila, { alignItems: 'stretch' }]}>
          <PaperCard style={[estilos.col, { flex: 1 }]}>
            <EmptyState ilustracion="familia" titulo="Armemos tu familia" message="Sumá a quienes cuidás: personas y mascotas." acciones={[{ label: 'Sumarme yo', onPress: () => {} }, { label: 'Agregar a alguien', onPress: () => {} }]} compacto />
          </PaperCard>
          <PaperCard style={[estilos.col, { flex: 1 }]}>
            <EmptyState ilustracion="aldia" titulo="Hoy está todo hecho" message="Lo próximo: mañana 10:00, odontóloga de Paola." compacto />
          </PaperCard>
        </View>

        <Subtitulo>Botones existentes (PrimaryButton)</Subtitulo>
        <View style={[estilos.fila, { alignItems: 'center' }]}>
          <PrimaryButton title="Guardar medicación" variant="accent" fullWidth={false} onPress={() => {}} />
          <PrimaryButton title="Cancelar" variant="secondary" fullWidth={false} onPress={() => {}} />
          <PrimaryButton title="Guardando…" variant="accent" fullWidth={false} loading onPress={() => {}} />
          <PrimaryButton title="Sin permiso" variant="accent" fullWidth={false} disabled onPress={() => {}} />
        </View>
      </Seccion>

      <Seccion id="detalles" titulo="Detalles de texto" bajada="utils/formato.js: plurales, fechas relativas y fechas sin ambigüedad.">
        <PaperCard style={estilos.tarjeta}>
          {[
            ['plural(1, «integrante»)', plural(1, 'integrante')],
            ['plural(2, «integrante»)', plural(2, 'integrante')],
            ['plural(3, «mes», «meses»)', plural(3, 'mes', 'meses')],
            ['fechaRelativa(mañana)', fechaRelativa(enHoras(10, 0, 1))],
            ['fechaRelativa(hace 3 días)', fechaRelativa(enHoras(8, 0, -3))],
            ['fechaCorta(hace 3 días)', fechaCorta(enHoras(8, 0, -3))],
            ['cuandoEvento(hoy 23:30)', cuandoEvento(enHoras(23, 30))],
            ['cuandoEvento(hace 3 días)', cuandoEvento(enHoras(8, 0, -3))],
            ['Antes («mar 24»)', 'se leía como «24 de marzo»'],
          ].map(([a, b]) => (
            <View key={a} style={estilos.tipoFila}>
              <Text style={[texto.cuerpoChico, { color: color.texto, flex: 1 }]}>{a}</Text>
              <Text style={[texto.cuerpo, { color: color.tinta, flex: 1, fontVariant: ['tabular-nums'] }]}>{b}</Text>
            </View>
          ))}
        </PaperCard>
      </Seccion>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: espacio[4], gap: espacio[10], paddingBottom: espacio[16] },
  paginaAncha: { paddingHorizontal: espacio[12], paddingTop: espacio[8], maxWidth: 1280, width: '100%', alignSelf: 'center' },
  indice: { minHeight: tactil.minimo, justifyContent: 'center', paddingHorizontal: espacio[3], borderRadius: radio.pastilla, backgroundColor: color.cartulina },
  seccion: { gap: espacio[4] },
  bajada: { color: color.texto, maxWidth: 760 },
  tarjeta: { padding: espacio[6], gap: espacio[3] },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[4] },
  muestra: { width: 168, gap: espacio[1] },
  muestraColor: { height: 72, borderRadius: radio.control, borderWidth: 1, borderColor: color.linea, alignItems: 'center', justifyContent: 'center' },
  par: { flexDirection: 'row', alignItems: 'center', gap: espacio[3], minHeight: 48, paddingHorizontal: espacio[4], borderRadius: radio.control, borderWidth: 1, borderColor: color.linea },
  parSello: { paddingHorizontal: espacio[2], paddingVertical: 2, borderRadius: radio.etiqueta },
  tipo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espacio[2], paddingHorizontal: espacio[4], paddingVertical: espacio[3], borderRadius: radio.control },
  punto: { width: 12, height: 12, borderRadius: 6 },
  tipoFila: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espacio[4], paddingVertical: espacio[2], borderBottomWidth: 1, borderBottomColor: color.linea },
  espacioMuestra: { alignItems: 'flex-start', gap: espacio[1], minWidth: 96 },
  nivel: { padding: espacio[5], width: 200, gap: espacio[1] },
  grano: { width: 240, height: 96, borderRadius: radio.tarjeta, padding: espacio[4], justifyContent: 'flex-end', borderWidth: 1, borderColor: color.linea },
  ilus: { alignItems: 'center', gap: espacio[1], width: 120 },
  divisor: { height: 1, backgroundColor: color.linea },
  col: { width: 280, minWidth: 260, flexGrow: 1, flexBasis: 260 },
  btn: { minHeight: tactil.minimo, paddingHorizontal: espacio[4], borderRadius: radio.pastilla, alignItems: 'center', justifyContent: 'center' },
  btnPrimario: { backgroundColor: color.salvia },
  btnPrimarioHover: { backgroundColor: '#3D5A4B' },
  btnSecundario: { borderWidth: 1.5, borderColor: color.lineaFuerte, backgroundColor: color.cartulina },
  btnSecundarioHover: { backgroundColor: color.arena },
});
