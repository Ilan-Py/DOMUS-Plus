import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FamilyListScreen from '../screens/FamilyListScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AccountScreen from '../screens/AccountScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const FamiliaStack = createNativeStackNavigator();

// Stack propio del tab "Familia" — data-screen del mockup: familyList, addMember, profileDetail...
function FamiliaStackNavigator() {
  return (
    <FamiliaStack.Navigator screenOptions={{ headerShown: false }}>
      <FamiliaStack.Screen name="FamilyList" component={FamilyListScreen} />
      <FamiliaStack.Screen name="AddMember" component={AddMemberScreen} />
      <FamiliaStack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
    </FamiliaStack.Navigator>
  );
}

const TAB_ICONS = {
  Familia: '👪',
  Calendario: '📅',
  Cuenta: '👤',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Familia" component={FamiliaStackNavigator} />
      <Tab.Screen name="Calendario" component={CalendarScreen} />
      <Tab.Screen name="Cuenta" component={AccountScreen} />
    </Tab.Navigator>
  );
}
