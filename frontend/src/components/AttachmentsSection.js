import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, cardBase } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';
import api, { getList } from '../api/client';
import PressScale from './PressScale';
import ErrorBanner from './ErrorBanner';
import FadeSlideIn from './FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from './FadeOutRow';
import { confirmarDestructivo, elegirOpcion } from '../utils/confirm';

const THUMB_SIZE = 72;

// `parentType` es una de las 5 llaves que el backend acepta como padre único
// de un adjunto (ver chk_adjunto_un_padre en Scripts/04_adjuntos.sql y
// CAMPOS_PADRE en adjuntoController.js) — el componente arma
// `${parentType}_id` para hablar con /api/adjuntos, mismo contrato en los 3
// verbos (POST/GET/DELETE).
export default function AttachmentsSection({ parentType, parentId, label = 'Adjuntos' }) {
  const [adjuntos, setAdjuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [exitingId, setExitingId] = useState(null);
  const [visorUrl, setVisorUrl] = useState(null);

  const fetchAdjuntos = useCallback(async () => {
    setError('');
    try {
      const datos = await getList('/api/adjuntos', { params: { [`${parentType}_id`]: parentId } });
      setAdjuntos(datos);
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setLoading(false);
    }
  }, [parentType, parentId]);

  useEffect(() => {
    fetchAdjuntos();
  }, [fetchAdjuntos]);

  // Adivina el mime type de una foto de cámara/galería a partir de la
  // extensión de su uri — ImagePickerAsset no expone mimeType directo (a
  // diferencia de DocumentPickerAsset, que sí lo trae). El backend igual
  // valida el mimetype real del archivo (fileFilter en config/upload.js),
  // así que esto sólo tiene que ser una etiqueta razonable, no una fuente de
  // verdad.
  function adivinarMimeFoto(uri) {
    const ext = uri.split('.').pop()?.toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  async function subir(uri, nombre, mimeType) {
    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append(`${parentType}_id`, String(parentId));
    // NO se fuerza el header Content-Type acá — en React Native (y en
    // browser) axios necesita generar el boundary del multipart él mismo;
    // si se fija el header a mano sin el boundary, el request llega
    // corrupto del lado del servidor (documentado explícitamente en la
    // propia doc de axios: "leave Content-Type unset").
    formData.append('archivo', { uri, name: nombre, type: mimeType });
    try {
      await api.post('/api/adjuntos', formData);
      await fetchAdjuntos();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setUploading(false);
    }
  }

  async function handleTomarFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setError('Necesitamos permiso de cámara para tomar una foto.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    await subir(asset.uri, asset.fileName || 'foto.jpg', adivinarMimeFoto(asset.uri));
  }

  async function handleElegirGaleria() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError('Necesitamos permiso para acceder a la galería.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    await subir(asset.uri, asset.fileName || 'foto.jpg', adivinarMimeFoto(asset.uri));
  }

  async function handleElegirPdf() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    await subir(asset.uri, asset.name || 'documento.pdf', asset.mimeType || 'application/pdf');
  }

  function handleAgregar() {
    elegirOpcion('Agregar adjunto', [
      { text: 'Tomar foto', value: 'camera' },
      { text: 'Elegir de galería', value: 'gallery' },
      { text: 'Elegir PDF', value: 'pdf' },
    ], (valor) => {
      if (valor === 'camera') handleTomarFoto();
      else if (valor === 'gallery') handleElegirGaleria();
      else if (valor === 'pdf') handleElegirPdf();
    });
  }

  async function handleEliminar(item) {
    setError('');
    setEliminandoId(item.id);
    try {
      await api.delete(`/api/adjuntos/${item.id}`);
      setExitingId(item.id);
      await new Promise((resolve) => setTimeout(resolve, EXIT_DURATION));
      await fetchAdjuntos();
    } catch (err) {
      setError(err.mensaje);
    } finally {
      setEliminandoId(null);
      setExitingId(null);
    }
  }

  function confirmEliminar(item) {
    confirmarDestructivo(
      'Eliminar adjunto',
      `¿Seguro que querés eliminar ${item.tipo_archivo === 'pdf' ? 'este PDF' : 'esta foto'}?`,
      () => handleEliminar(item)
    );
  }

  function handleTap(item) {
    if (item.tipo_archivo === 'pdf') {
      Linking.openURL(item.url);
    } else {
      setVisorUrl(item.url);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.titulo}>{label}</Text>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <View style={styles.grid}>
        {loading ? (
          <ActivityIndicator color={colors.textMuted} style={styles.loadingSlot} />
        ) : (
          <>
            {adjuntos.map((item, i) => (
              <FadeSlideIn key={item.id} index={i} style={styles.slotWrap}>
                <FadeOutRow exiting={exitingId === item.id}>
                  <PressScale
                    contentStyle={styles.thumb}
                    onPress={() => handleTap(item)}
                    disabled={eliminandoId === item.id}
                    accessibilityLabel={item.tipo_archivo === 'pdf' ? 'Abrir PDF' : 'Ver foto'}
                  >
                    {item.tipo_archivo === 'pdf' ? (
                      <View style={styles.pdfTile}>
                        <Ionicons name="document-text-outline" size={24} color={colors.textMuted} />
                      </View>
                    ) : (
                      <Image source={{ uri: item.url }} style={styles.thumbImage} />
                    )}
                  </PressScale>
                  <PressScale
                    contentStyle={styles.deleteBadge}
                    onPress={() => confirmEliminar(item)}
                    disabled={eliminandoId === item.id}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityLabel="Eliminar adjunto"
                  >
                    {eliminandoId === item.id ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Ionicons name="close" size={12} color={colors.danger} />
                    )}
                  </PressScale>
                  {item.tipo_archivo === 'pdf' && (
                    <Text style={styles.thumbLabel} numberOfLines={2}>
                      {item.nombre_original || 'PDF'}
                    </Text>
                  )}
                </FadeOutRow>
              </FadeSlideIn>
            ))}

            {uploading && (
              <View style={styles.slotWrap}>
                <View style={[styles.thumb, styles.uploadingTile]}>
                  <ActivityIndicator color={colors.textMuted} />
                </View>
              </View>
            )}

            <PressScale
              contentStyle={[styles.thumb, styles.addTile]}
              onPress={handleAgregar}
              disabled={uploading}
              accessibilityLabel="Agregar adjunto"
            >
              <Ionicons name="add" size={26} color={colors.textMuted} />
            </PressScale>
          </>
        )}
      </View>

      <Modal visible={!!visorUrl} transparent animationType="fade" onRequestClose={() => setVisorUrl(null)}>
        <View style={styles.visorBackdrop}>
          <PressScale
            contentStyle={styles.visorCloseBtn}
            onPress={() => setVisorUrl(null)}
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={22} color={colors.onAccent} />
          </PressScale>
          {!!visorUrl && (
            <Image source={{ uri: visorUrl }} style={styles.visorImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 12,
  },
  titulo: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: poppinsWeight('700'),
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  loadingSlot: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  // Sin height fija — cada slot ahora crece con el label del nombre de
  // archivo debajo del thumb (antes coincidía 1:1 con THUMB_SIZE).
  slotWrap: {
    width: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.input,
    overflow: 'hidden',
    ...cardBase,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  // Sólo bajo el tile de PDF — un thumbnail de 72px de un documento de
  // texto no es legible, así que lo que identifica al archivo es el nombre,
  // no la miniatura.
  thumbLabel: {
    fontSize: 10.5,
    lineHeight: 13,
    color: colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  pdfTile: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
  },
  uploadingTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    // cardBase trae su propia sombra/bg — se pisan a propósito acá para que
    // el tile de "agregar" se lea como un placeholder punteado, no como una
    // card más del mismo peso visual que las que ya tienen contenido.
    shadowOpacity: 0,
    elevation: 0,
  },
  // Presente pero no dominante: el relleno danger sólido era el elemento de
  // más peso visual de toda la grilla, compitiendo con el contenido del
  // adjunto. Queda como una tilde blanca con el glifo en danger — el color
  // semántico sigue estando, en el glifo y no en un disco lleno. El tamaño
  // (20) ya era el correcto y no cambia; la confirmación real la sigue
  // dando confirmarDestructivo, no el peso del botón.
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visorBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visorImage: {
    width: '100%',
    height: '80%',
  },
  visorCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
