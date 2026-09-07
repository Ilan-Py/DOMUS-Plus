//Codigo por Claude
//1 — Config de multer para adjuntos: memoria (no disco — se sube directo a
// Cloudinary por stream, sin escribir temporales en el filesystem efímero
// del contenedor), 10MB máx, sólo imágenes comunes + PDF.
const multer = require('multer');

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function fileFilter(req, file, cb) {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
        // cb(null, false) no lleva mensaje al caller — se guarda acá para que
        // la ruta pueda devolver un 400 claro en vez del error genérico de
        // multer ("Unexpected field"/silencio).
        req.fileFilterError = `Tipo de archivo no soportado (${file.mimetype}). Se acepta JPEG, PNG, WEBP o PDF.`;
        return cb(null, false);
    }
    cb(null, true);
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter,
});

module.exports = upload;
