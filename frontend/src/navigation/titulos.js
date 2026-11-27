// Título de la pestaña del navegador (sólo web) según la pantalla en foco, para que nunca
// quede el genérico del bundler. NavigationContainer lo usa vía `documentTitle.formatter`.
export const TITULO_INICIAL = 'DOMUS+ · Salud familiar';

const TITULOS = {
  Welcome: TITULO_INICIAL,
  Login: 'Iniciar sesión · DOMUS+',
  Register: 'Crear cuenta · DOMUS+',
  GroupSetup: 'Tu grupo familiar · DOMUS+',
  FamilyList: 'Mi familia · DOMUS+',
  Familia: 'Mi familia · DOMUS+',
  AddMember: 'Agregar a la familia · DOMUS+',
  AddVaccine: 'Vacuna · DOMUS+',
  AddTreatment: 'Tratamiento · DOMUS+',
  Emergency: 'Ficha de emergencia · DOMUS+',
  Calendar: 'Calendario · DOMUS+',
  Calendario: 'Calendario · DOMUS+',
  AddReminder: 'Recordatorio · DOMUS+',
  Cuenta: 'Mi cuenta · DOMUS+',
};

export function formatearTitulo(_options, route) {
  if (route?.name === 'ProfileDetail' && route.params?.nombre) return `${route.params.nombre} · DOMUS+`;
  return TITULOS[route?.name] || TITULO_INICIAL;
}

// El documentTitle de React Navigation sólo se entera de cambios de opciones; al pasar de
// sesión (auth → grupo → app) se montan árboles de navegación nuevos y el título quedaba viejo.
// Este sincronizador se engancha a onReady/onStateChange del contenedor.
export function sincronizarTitulo(navigationRef) {
  if (typeof document === 'undefined' || !navigationRef?.isReady?.()) return;
  document.title = formatearTitulo(null, navigationRef.getCurrentRoute());
}
