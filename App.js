import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FamilyProvider } from './src/context/FamilyContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import GroupSetupScreen from './src/screens/GroupSetupScreen';
import MainTabs from './src/navigation/MainTabs';
import BlobSpinner from './src/components/BlobSpinner';
import { colors } from './src/theme/colors';

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

// Default global de fontFamily — Poppins en vez del sans-serif del sistema.
// Se pisa vía defaultProps en lugar de un componente Text propio (fuera de
// alcance acá); los componentes ya usan `fontWeight` en sus estilos, que
// React Native ignora en fuentes custom, pero el peso visual sigue viniendo
// del nombre de familia (Regular/SemiBold/Bold) cargado más abajo.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'Poppins_400Regular' }, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: 'Poppins_400Regular' }, TextInput.defaultProps.style];

// 1 — booting === true: rehidratando sesión desde AuthContext
function SplashScreen() {
  return (
    <View style={styles.splash}>
      <BlobSpinner size={56} color={colors.ink} />
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
          <MainTabs />
        </FamilyProvider>
      )}
    </PhaseFade>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Tap en una notificación (app en background o recién abierta desde ahí)
  // navega al tab Calendario, donde vive CalendarScreen. Se resuelve por
  // nombre de ruta contra la Tab.Navigator de MainTabs (ver
  // navigation/MainTabs.js) — sólo tiene efecto si ya se llegó a esa parte
  // del árbol (con token+grupo); si el listener dispara antes (login aún no
  // resuelto), navigationRef.isReady() es false y se ignora en silencio en
  // vez de tirar error.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Calendario');
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
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
});
