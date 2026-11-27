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
import InlineError from './InlineError';
import { EmptyDoodle } from './FamilyDoodles';
import FadeSlideIn from './FadeSlideIn';
import FadeOutRow, { EXIT_DURATION } from './FadeOutRow';
import { confirmarDestructivo, elegirOpcion } from '../utils/confirm';


// `parentType` es una de las 5 llaves que el backend acepta como padre único
// de un adjunto (ver chk_adjunto_un_padre en Scripts/04_adjuntos.sql y
// CAMPOS_PADRE en adjuntoController.js) — el componente arma
// `${parentType}_id` para hablar con /api/adjuntos, mismo contrato en los 3
// verbos (POST/GET/DELETE).
// `compact`: título chico para los adjuntos dentro de una tarjeta de vacuna/
// tratamiento/evento. `addLabel`: texto del botón del pie.
export default function AttachmentsSection({
  parentType,
  parentId,
  label = 'Adjuntos',
  compact = false,
  hint,
  addLabel = 'Adjuntar documento',
}) {
  const [adjuntos, setAdjuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [exitingId, setExitingId] = useState(null);
  const [visorUrl, setVisorUrl] = useState(null);

  const fetchAdjuntos = useCallback(async () => {
    setError('');
    setLoadError(false);
    setLoading(true);
    try {
      const datos = await getList('/api/adjuntos', { params: { [`${parentType}_id`]: parentId } });
      setAdjuntos(datos);
    } catch {
      // Mensaje claro dentro de la tarjeta (con Reintentar), no el texto técnico del servidor.
      setLoadError(true);
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
    try {
      if (Platform.OS === 'web') {
        // En web, FormData no entiende el objeto { uri, name, type } propio de
        // React Native: lo convierte en el texto "[object Object]" y el
        // servidor responde "Debe adjuntar un archivo". Hay que mandar un
        // archivo real (Blob/File), que se arma desde la uri del selector.
        const blob = await (await fetch(uri)).blob();
        formData.append('archivo', new File([blob], nombre, { type: mimeType || blob.type }));
      } else {
        formData.append('archivo', { uri, name: nombre, type: mimeType });
      }
      await api.post('/api/adjuntos', formData);
      await fetchAdjuntos();
    } catch (err) {
      // Un 5xx es un fallo del servidor (ej. el servicio de archivos): mensaje
      // claro en vez del texto técnico. Los 4xx traen un motivo útil (tipo de
      // archivo no soportado, tamaño, etc.) y se muestran tal cual.
      setError(
        err.status >= 500
          ? 'No pudimos subir el archivo. Probá de nuevo en un rato.'
          : err.mensaje
      );
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
    <View style={compact ? styles.rootCompact : null}>
      {/* En modo compacto (dentro de una vacuna/tratamiento) el título y la lista
          sólo aparecen si hay archivos; sin archivos queda un botón chico. */}
      {!!label && (!compact || adjuntos.length > 0) && (
        <Text style={[styles.titulo, compact && styles.tituloCompact, !!hint && styles.tituloConHint]}>{label}</Text>
      )}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      {loadError ? (
        <InlineError message="No pudimos cargar los documentos." onRetry={fetchAdjuntos} />
      ) : (
        <>
          <ErrorBanner message={error} onDismiss={() => setError('')} />

          {loading ? (
            <ActivityIndicator color={colors.textMuted} style={styles.loadingSlot} />
          ) : (
            <>
              {adjuntos.length === 0 && !uploading && !compact && (
                <View style={styles.emptyRow}>
                  <EmptyDoodle variant="documento" size={48} />
                  <Text style={styles.emptyText}>Todavía no hay documentos.</Text>
                </View>
              )}

              {adjuntos.map((item, i) => {
                const esPdf = item.tipo_archivo === 'pdf';
                const nombre = item.nombre_original || (esPdf ? 'Documento PDF' : 'Foto');
                return (
                  <FadeSlideIn key={item.id} index={i}>
                    <FadeOutRow exiting={exitingId === item.id}>
                      <View style={[styles.row, i < adjuntos.length - 1 && styles.rowDivider]}>
                        <PressScale
                          style={styles.rowMain}
                          contentStyle={styles.rowMainInner}
                          onPress={() => handleTap(item)}
                          disabled={eliminandoId === item.id}
                          accessibilityLabel={esPdf ? `Abrir PDF ${nombre}` : `Ver foto ${nombre}`}
                        >
                          {esPdf ? (
                            <View style={styles.pdfTile}>
                              <Ionicons name="document-text-outline" size={24} color={colors.iconWarm} />
                            </View>
                          ) : (
                            <Image source={{ uri: item.url }} style={styles.thumbImage} accessible={false} accessibilityIgnoresInvertColors />
                          )}
                          <Text style={styles.rowName} numberOfLines={2}>
                            {nombre}
                          </Text>
                          {/* Indica que tocar la fila abre el archivo. */}
                          <Ionicons name="chevron-forward" size={20} color={colors.iconWarm} />
                        </PressScale>
                        <PressScale
                          contentStyle={styles.deleteBtn}
                          onPress={() => confirmEliminar(item)}
                          disabled={eliminandoId === item.id}
                          accessibilityLabel={`Eliminar ${nombre}`}
                        >
                          {eliminandoId === item.id ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                          ) : (
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                          )}
                        </PressScale>
                      </View>
                    </FadeOutRow>
                  </FadeSlideIn>
                );
              })}

              {uploading && (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator color={colors.textMuted} />
                  <Text style={styles.rowName}>Subiendo…</Text>
                </View>
              )}

              <PressScale
                contentStyle={[
                  styles.addBtn,
                  compact && styles.addBtnCompact,
                  compact && adjuntos.length === 0 && styles.addBtnCompactAlone,
                ]}
                onPress={handleAgregar}
                disabled={uploading}
                accessibilityLabel="Adjuntar documento"
              >
                <Ionicons name="add" size={20} color={colors.ink} />
                <Text style={styles.addText}>{addLabel}</Text>
              </PressScale>
            </>
          )}
        </>
      )}

      <Modal visible={!!visorUrl} transparent animationType="fade" onRequestClose={() => setVisorUrl(null)}>
        <View style={styles.visorBackdrop}>
          <PressScale
            contentStyle={styles.visorCloseBtn}
            onPress={() => setVisorUrl(null)}
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={24} color={colors.onAccent} />
          </PressScale>
          {!!visorUrl && (
            <Image source={{ uri: visorUrl }} style={styles.visorImage} resizeMode="contain" accessibilityLabel="Foto adjunta ampliada" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Dentro de una vacuna/tratamiento: separado de los datos con un divisor sutil.
  rootCompact: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EFE8DF' },
  titulo: {
    fontSize: 16,
    fontFamily: poppinsWeight('700'),
    color: colors.ink,
    marginBottom: 12,
  },
  tituloConHint: { marginBottom: 4 },
  hint: { fontSize: 15, lineHeight: 22, color: colors.textBody, marginBottom: 12 },
  tituloCompact: {
    fontSize: 14,
    fontFamily: poppinsWeight('600'),
    color: colors.textBody,
    marginBottom: 8,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  emptyText: { flex: 1, fontSize: 16, color: colors.textBody },
  loadingSlot: { alignSelf: 'flex-start', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderCard },
  rowMain: { flex: 1 },
  rowMainInner: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 4 },
  rowName: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.ink, fontFamily: poppinsWeight('600') },
  thumbImage: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.surfaceSand },
  pdfTile: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.badgeSand,
  },
  // Separado 16px de la flecha de abrir, para no borrar por error al querer abrir.
  deleteBtn: { width: 48, height: 48, marginLeft: 16, alignItems: 'center', justifyContent: 'center' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  // Botón secundario de ancho completo al pie de la lista.
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.glassStrong,
  },
  addBtnCompact: { alignSelf: 'flex-start', paddingHorizontal: 16 },
  addBtnCompactAlone: { marginTop: 0 },
  addText: { fontSize: 16, fontFamily: poppinsWeight('600'), color: colors.ink },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
