import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FamilyListScreen from '../screens/FamilyListScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountScreen from '../screens/AccountScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import AddVaccineScreen from '../screens/AddVaccineScreen';
import AddTreatmentScreen from '../screens/AddTreatmentScreen';
import AddReminderScreen from '../screens/AddReminderScreen';
import { colors } from '../theme/colors';
import { poppinsWeight } from '../theme/typography';

const Tab = createBottomTabNavigator();
const FamiliaStack = createNativeStackNavigator();
const CalendarioStack = createNativeStackNavigator();

// Stack propio del tab "Familia" — data-screen del mockup: familyList, addMember, profileDetail...
// AddVaccine/AddTreatment se empujan sobre ProfileDetail (NAV-2).
// AddVaccineScreen/AddTreatmentScreen son placeholders hasta UI-3.
function FamiliaStackNavigator() {
  return (
    <FamiliaStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}
    >
      <FamiliaStack.Screen name="FamilyList" component={FamilyListScreen} />
      {/* presentation:'modal' en los 3 forms de alta/edición — los distingue
          visualmente de "drilling in" (ProfileDetail, slide lateral default):
          se sienten como una tarea acotada que se abre encima, no un nivel
          más profundo de navegación. Ver auditoría de transiciones. */}
      <FamiliaStack.Screen name="AddMember" component={AddMemberScreen} options={{ presentation: 'modal' }} />
      <FamiliaStack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
      <FamiliaStack.Screen name="AddVaccine" component={AddVaccineScreen} options={{ presentation: 'modal' }} />
      <FamiliaStack.Screen name="AddTreatment" component={AddTreatmentScreen} options={{ presentation: 'modal' }} />
    </FamiliaStack.Navigator>
  );
}

// Stack propio del tab "Calendario" (NAV-3) — Calendar como ruta inicial,
// AddReminder empujado encima. AddReminderScreen es placeholder hasta UI-5.
function CalendarioStackNavigator() {
  return (
    <CalendarioStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}
    >
      <CalendarioStack.Screen name="Calendar" component={CalendarScreen} />
      <CalendarioStack.Screen
        name="AddReminder"
        component={AddReminderScreen}
        options={{ presentation: 'modal' }}
      />
    </CalendarioStack.Navigator>
  );
}

// Los emojis (👪📅👤) traían su propio color de fuente y no respondían al
// tint activo/inactivo — Ionicons outline sí, vía la prop `color` que
// React Navigation ya pasa a tabBarIcon.
const TAB_ICONS = {
  Familia: 'people-outline',
  Calendario: 'calendar-outline',
  Cuenta: 'person-outline',
};

// Migración 2 (hogareño): esto era BlurView (nativo) / backdropFilter (web)
// sobre colors.glass. En web ya estaba muerto — colors.glass es blanco sólido
// desde la migración de paleta, así que el backdrop-filter no tenía nada
// translúcido detrás para desenfocar. En nativo el BlurView de expo-blur SÍ
// seguía haciendo algo real (su `tint="light"` es una translucidez propia,
// no depende de nuestros tokens) — pero dejarlo ahí habría sido la única
// superficie con vidrio/blur en toda la app, después de aplanar headers y
// cards en el resto de las pantallas. Se opta por una barra plana opaca acá
// también, consistente con esa dirección, en vez de mantener un blur que
// técnicamente funcionaba pero desentonaba con el resto.
function TabBarBackground() {
  return <View style={[StyleSheet.absoluteFill, styles.tabBarGlass]} />;
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: colors.bgBase }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size ?? 22} color={color} />
        ),
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={{
              color,
              fontSize: 11,
              fontFamily: focused ? poppinsWeight('600') : poppinsWeight('400'),
            }}
          >
            {route.name}
          </Text>
        ),
        // position: 'absolute' + fondo transparente para que el contenido de
        // cada screen se vea (y desenfoque) debajo de la barra flotante. Al
        // fijar position:'absolute' se pierde el alto/padding-bottom
        // safe-area que calcula por default react-navigation — sin fijarlo
        // acá a mano, ícono y label quedaban apretados/superpuestos,
        // especialmente con el inset del home indicator.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () => <TabBarBackground />,
      })}
    >
      <Tab.Screen name="Familia" component={FamiliaStackNavigator} />
      <Tab.Screen name="Calendario" component={CalendarioStackNavigator} />
      <Tab.Screen name="Cuenta" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarGlass: {
    // bgBase, no colors.glass (blanco puro) — mismo criterio que los headers
    // de las screens (ver FamilyListScreen.js): la barra debe leerse como
    // parte de la página crema, no como un rectángulo blanco flotando.
    backgroundColor: colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderSoft,
  },
});
