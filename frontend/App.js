import React from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

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

// 4 — el árbol raíz decide qué navegador renderizar según el estado de sesión
function RootNavigator() {
  const { booting, token, grupo } = useAuth();

  if (booting) {
    return <SplashScreen />;
  }

  if (!token) {
    return <AuthNavigator />;
  }

  if (!grupo) {
    return <OnboardingNavigator />;
  }

  return (
    <FamilyProvider>
      <MainTabs />
    </FamilyProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
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
});
