import { Platform, Share } from 'react-native';
import { getList } from '../api/client';
import { formatearTelefono } from './displayFormat';

// Resumen en texto plano de las fichas de emergencia de todos los integrantes del grupo (tipo de sangre,
// alergias, notas y contactos), para guardarlo, imprimirlo o mandárselo a un médico.
export async function armarResumenFichas({ grupoNombre, integrantes }) {
  const bloques = await Promise.all(
    integrantes.map(async (i) => {
      let contactos = [];
      try {
        contactos = await getList(`/api/familia/integrantes/${i.id}/contactos-emergencia`);
      } catch {
        // sin los contactos igual sirve el resto de la ficha
      }
      const lineas = [`${i.nombre} ${i.apellido}`];
      lineas.push(`  Tipo de sangre: ${i.tipo_sangre || 'sin cargar'}`);
      lineas.push(`  Alergias: ${i.alergias || 'sin cargar'}`);
      if (i.notas_emergencia) lineas.push(`  Notas: ${i.notas_emergencia}`);
      if (contactos.length) {
        lineas.push('  Contactos de emergencia:');
        contactos.forEach((c) =>
          lineas.push(`    - ${c.nombre}${c.relacion ? ` (${c.relacion})` : ''}: ${formatearTelefono(c.telefono)}`)
        );
      }
      return lineas.join('\n');
    })
  );
  return [`Fichas de emergencia - ${grupoNombre || 'Grupo familiar'}`, '', ...bloques.map((b) => `${b}\n`), 'Generado con DOMUS+'].join('\n');
}

// Web: descarga un .txt. Celular: abre el menú de compartir.
export async function entregarTexto(nombreArchivo, texto) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ message: texto });
}
