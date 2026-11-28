import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TextInput, Animated, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Lora_700Bold } from '@expo-google-fonts/lora';
import * as Notifications from 'expo-notifications';

import './src/theme/escalaTexto';
import { PreferenciasProvider } from './src/context/PreferenciasContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FamilyProvider } from './src/context/FamilyContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import GroupSetupScreen from './src/screens/GroupSetupScreen';
import MainTabs from './src/navigation/MainTabs';
import Logo from './src/components/Logo';
import DialogHost from './src/components/DialogHost';
import ToastHost from './src/components/ToastHost';
import NotFoundScreen from './src/screens/NotFoundScreen';
import StyleguideScreen from './src/screens/StyleguideScreen';
import { formatearTitulo, sincronizarTitulo } from './src/navigation/titulos';
import { injectPaperCss } from './src/theme/paper';
import { colors } from './src/theme/colors';

// Edge dibuja su propio ojo dentro de los inputs de contraseña; ya tenemos
// el botón "Mostrar", así que se oculta el nativo para no duplicar.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input::-ms-reveal, input::-ms-clear { display: none; } html, body { background: #FBF6EE; }';
  document.head.appendChild(style);
  // El contenido está en español: los lectores de pantalla eligen la voz según este atributo.
  document.documentElement.lang = 'es';
  // Utilidades "paper cutout" (grano de papel, tarjetas flotantes, paper-pop).
  injectPaperCss();
  // Favicon explícito (el corazón terracota) — sin esto el navegador cae al /favicon.ico por defecto.
  if (!document.querySelector('link[rel~="icon"]')) {
    const icono = document.createElement('link');
    icono.rel = 'icon';
    icono.type = 'image/png';
    icono.href = '/favicon.png';
    document.head.appendChild(icono);
  }
}

const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();

// Ref imperativo al NavigationContainer — sólo existe para poder navegar
// desde el listener de tap-en-notificación de acá abajo, que corre fuera de
// cualquier componente de pantalla y no tiene un prop `navigation` propio.
const navigationRef = createNavigationContainerRef();

// Handler global — corre en cualquier pantalla, no depende de qué screen
// esté montada. shouldShowBanner/shouldShowList son los campos vigentes en
// SDK 51 (expo-notifications 0.28.x); shouldShowAlert se deja también por
// compat con código/ejemplos que aún lo esperan, no tiene efecto negativo.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Default global de fontFamily — Plus Jakarta Sans en vez del sans-serif del sistema.
// Se pisa vía defaultProps en lugar de un componente Text propio (fuera de
// alcance acá); los componentes ya usan `fontWeight` en sus estilos, que
// React Native ignora en fuentes custom, pero el peso visual sigue viniendo
// del nombre de familia (Regular/SemiBold/Bold) cargado más abajo.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'PlusJakartaSans_400Regular' }, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: 'PlusJakartaSans_400Regular' }, TextInput.defaultProps.style];

// 1 — booting === true: rehidratando sesión desde AuthContext
// Pantalla de carga: el logo con un latido muy suave (escala 1 → 1,04), sin movimiento
// brusco. Se usa mientras cargan las fuentes y la sesión.
function SplashScreen() {
  const latido = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(latido, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [latido]);
  const scale = latido.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  return (
    <View style={styles.splash}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Logo variante="color" size={104} />
      </Animated.View>
    </View>
  );
}

// 2 — sin token: welcome/onboarding pre-auth, luego login/registro. Welcome
// es ahora la ruta inicial — Login/Register no cambian, sólo cómo se llega
// a ellas la primera vez (antes Login era el primer screen).
function AuthNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// 3 — con token pero sin grupo: onboarding standalone (sin tabs)
function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="GroupSetup" component={GroupSetupScreen} />
    </OnboardingStack.Navigator>
  );
}

// Cruce entre Auth/Onboarding/Main: no son screens dentro de un mismo
// native-stack (son árboles de navegación enteros y distintos, elegidos acá
// por un simple if/else) — el prop `animation` de native-stack no tiene
// forma de aplicarse acá, no hay stack compartido que lo entienda. Se logra
// el mismo efecto de "llegada" a mano: un fade-in liviano (Animated.View +
// opacity) cada vez que `phaseKey` cambia, sin tocar la lógica de qué
// navegador se monta. Es fade-in puro, no un crossfade real con la fase
// anterior desvaneciéndose en simultáneo (eso pediría mantener montados dos
// árboles de navegación a la vez, mucho más riesgo/costo para un beneficio
// cosmético menor) — la fase vieja se desmonta al instante, la nueva entra
// con opacity 0→1.
function PhaseFade({ phaseKey, children }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevPhaseRef = useRef(phaseKey);

  useEffect(() => {
    if (prevPhaseRef.current === phaseKey) return;
    prevPhaseRef.current = phaseKey;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [phaseKey, opacity]);

  return <Animated.View style={[styles.phaseFade, { opacity }]}>{children}</Animated.View>;
}

// 4 — el árbol raíz decide qué navegador renderizar según el estado de sesión
function RootNavigator() {
  const { booting, token, grupo } = useAuth();

  const phase = booting ? 'boot' : !token ? 'auth' : !grupo ? 'onboarding' : 'main';

  return (
    <PhaseFade phaseKey={phase}>
      {phase === 'boot' && <SplashScreen />}
      {phase === 'auth' && <AuthNavigator />}
      {phase === 'onboarding' && <OnboardingNavigator />}
      {phase === 'main' && (
        <FamilyProvider>
          {/* En pantallas anchas (web) MainTabs muestra una barra lateral y
              centra el contenido en una columna de hasta 880px. */}
          <View style={styles.mainColumn}>
            <MainTabs />
          </View>
        </FamilyProvider>
      )}
    </PhaseFade>
  );
}

// Web: la app vive en la raíz ("/"). Cualquier otra dirección (enlace viejo, código de invitación
// pegado en la barra) muestra la página 404 en vez de la app como si nada.
function direccionDesconocida() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return !['', '/', '/index.html', '/styleguide'].includes(window.location.pathname);
}

// /styleguide (sólo web): tokens y componentes del sistema visual renderizados (docs/ux/04-design-system.md).
const esStyleguide = () => Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname === '/styleguide';

export default function App() {
  const [noEncontrada, setNoEncontrada] = useState(direccionDesconocida);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    Lora_700Bold,
  });

  // Tap en una notificación (app en background o recién abierta desde ahí)
  // navega al tab Calendario, donde vive CalendarScreen. Se resuelve por
  // nombre de ruta contra la Tab.Navigator de MainTabs (ver
  // navigation/MainTabs.js) — sólo tiene efecto si ya se llegó a esa parte
  // del árbol (con token+grupo); si el listener dispara antes (login aún no
  // resuelto), navigationRef.isReady() es false y se ignora en silencio en
  // vez de tirar error.
  useEffect(() => {
    // DOS-11: abre el día del aviso (con su «Dada» a mano), no el Calendario genérico.
    const sub = Notifications.addNotificationResponseReceivedListener((respuesta) => {
      if (navigationRef.isReady()) {
        const dia = respuesta?.notification?.request?.content?.data?.dia;
        navigationRef.navigate('Calendario', dia ? { screen: 'Calendar', params: { dia } } : undefined);
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return <SplashScreen />;
  }

  if (esStyleguide()) {
    if (typeof document !== 'undefined') document.title = 'Sistema visual · DOMUS+';
    return (
      <SafeAreaProvider>
        <PreferenciasProvider>
          <StyleguideScreen />
          <ToastHost />
        </PreferenciasProvider>
      </SafeAreaProvider>
    );
  }

  if (noEncontrada) {
    return (
      <SafeAreaProvider>
        <NotFoundScreen
          onVolver={() => {
            window.history.replaceState(null, '', '/');
            setNoEncontrada(false);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PreferenciasProvider>
      <AuthProvider>
        <NavigationContainer
          ref={navigationRef}
          documentTitle={{ formatter: formatearTitulo }}
          onReady={() => sincronizarTitulo(navigationRef)}
          onStateChange={() => sincronizarTitulo(navigationRef)}
        >
          <StatusBar style="dark" />
          <RootNavigator />
          <DialogHost />
          <ToastHost />
        </NavigationContainer>
      </AuthProvider>
      </PreferenciasProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  phaseFade: {
    flex: 1,
  },
  mainColumn: {
    flex: 1,
    width: '100%',
  },
});
