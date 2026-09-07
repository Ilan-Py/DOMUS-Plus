// Relocated from WelcomeScreen.js's local SPACING const (the only consumer
// so far) — values unchanged, just promoted so a second screen can share it.
export const SPACING = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// screenTopPadding: el `54` que despeja la status bar/notch, repetido en 9
// screens — 6 vía ScreenHeader (../components/ScreenHeader.js) y 3 sueltos
// en `authWrap` (LoginScreen, RegisterScreen, GroupSetupScreen), que NO son
// header bars (sin back/título/hairline) y por eso no pasan por ScreenHeader.
// Un solo número compartido en vez del literal `54` copiado 9 veces.
export const layout = {
  screenTopPadding: 54,
};
