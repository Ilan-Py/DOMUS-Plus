import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../context/FamilyContext';
import useColumnInset from '../hooks/useColumnInset';
import PaperBanner from '../components/PaperBanner';
import Ilustracion from '../components/Ilustracion';
import EntityAvatar from '../components/EntityAvatar';
import PressScale from '../components/PressScale';
import EmptyState from '../components/EmptyState';
import ErrorBanner from '../components/ErrorBanner';
import { SkeletonFilas } from '../components/Skeleton';
import { paper } from '../theme/paper';
import { color, texto, espacio, radio, tactil } from '../theme/tokens';
import { edadDe, plural } from '../utils/formato';
import { textoGuardadoEn } from '../utils/cacheLocal';

// Emergencia, 4.º destino de la navegación (docs/ux/03-definicion.md §1.2, decisión D4; EME-02).
// Objetivo: la ficha de cualquiera a 2 toques desde cualquier pantalla → Emergencia → su cara.
// Cada tarjeta adelanta lo que se pregunta primero (tipo de sangre y alergias) para que se pueda leer sin entrar.
function resumenFicha(i) {
  const partes = [];
  partes.push(i.tipo_sangre ? `Sangre ${i.tipo_sangre}` : 'Sangre sin cargar');
  const alergias = (i.alergias || '').split(',').map((a) => a.trim()).filter(Boolean);
  partes.push(alergias.length ? `Alergia a ${alergias.join(', ')}` : 'Alergias sin cargar');
  return partes;
}

export default function EmergenciaInicioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const inset = useColumnInset();
  const { width } = useWindowDimensions();
  const { integrantes, loading, error, refresh, desdeCache } = useFamily();
  const columnas = width >= 1100 ? 3 : width >= 700 ? 2 : 1;

  const abrir = (i) => navigation.navigate('Emergency', { id: i.id, nombre: `${i.nombre} ${i.apellido}` });

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={[estilos.contenido, { paddingTop: insets.top + espacio[5], paddingHorizontal: espacio[5] + inset, paddingBottom: 120 }]}
    >
      <PaperBanner
        titulo="Emergencia"
        bajada="¿De quién es la ficha? Tipo de sangre, alergias, lo que toma y a quién llamar."
        tono="terracota"
        compacto
        ilustracion={<Ilustracion nombre="ficha" size={88} />}
      />

      {!!desdeCache && (
        <ErrorBanner
          variant="aviso"
          message={`Sin conexión. Estás viendo las fichas guardadas ${textoGuardadoEn(desdeCache)}.`}
          onRetry={refresh}
        />
      )}
      {!!error && <ErrorBanner message={error} onRetry={refresh} />}

      {loading ? (
        <SkeletonFilas filas={3} />
      ) : integrantes.length === 0 ? (
        <EmptyState
          ilustracion="ficha"
          titulo="Todavía no hay fichas"
          message="Cuando sumes a una persona de tu familia, acá vas a tener su ficha de emergencia a mano."
          acciones={[{ label: 'Agregar persona', onPress: () => navigation.navigate('Familia', { screen: 'AddMember', params: { tipoMiembro: 'integrante' } }) }]}
        />
      ) : (
        <View style={estilos.grilla} accessibilityRole="list">
          {integrantes.map((i) => {
            const [sangre, alergias] = resumenFicha(i);
            const edad = edadDe(i.fecha_nacimiento);
            const nombre = `${i.nombre} ${i.apellido}`;
            return (
              <View key={i.id} style={[estilos.celda, { width: columnas === 1 ? '100%' : `${100 / columnas - 2}%` }]}>
                <PressScale
                  {...paper('papel', 'p1')}
                  contentStyle={estilos.tarjeta}
                  onPress={() => abrir(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ficha de emergencia de ${nombre}${edad !== null ? `, ${plural(edad, 'año')}` : ''}. ${sangre}. ${alergias}.`}
                >
                  <EntityAvatar avatarId={i.avatar_id} type="person" name={i.nombre} apellido={i.apellido} tipo={i.tipo} fotoUrl={i.foto_url} size={56} />
                  <View style={estilos.textos}>
                    <Text style={[texto.tarjeta, { color: color.tinta }]} numberOfLines={2}>{nombre}</Text>
                    {edad !== null && <Text style={[texto.meta, { color: color.texto }]}>{plural(edad, 'año')}</Text>}
                    <Text style={[texto.cuerpoChico, estilos.dato, !i.tipo_sangre && estilos.sinCargar]} numberOfLines={1}>{sangre}</Text>
                    <Text style={[texto.cuerpoChico, estilos.dato, !i.alergias && estilos.sinCargar]} numberOfLines={2}>{alergias}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={color.terracotaTexto} />
                </PressScale>
              </View>
            );
          })}
        </View>
      )}

      {integrantes.length > 0 && (
        <Text style={[texto.meta, estilos.pie]}>
          Las fichas quedan guardadas en este dispositivo para abrirlas aunque no haya conexión.
        </Text>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  contenido: { gap: espacio[5] },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[4] },
  celda: { flexGrow: 1 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[4],
    minHeight: tactil.comodo * 2,
    padding: espacio[4],
    borderRadius: radio.tarjeta,
    backgroundColor: color.cartulina,
    borderWidth: 1,
    borderColor: color.linea,
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  dato: { color: color.tinta, fontVariant: ['tabular-nums'] },
  sinCargar: { color: color.textoSuave },
  pie: { color: color.texto, textAlign: 'center' },
});
