import React from 'react';
import ScreenHeader from '../components/ScreenHeader';

// Compartido por AddVaccineScreen, AddTreatmentScreen y AddReminderScreen —
// mismo topbar que AddMemberScreen/ProfileDetailScreen, ahora vía el
// ScreenHeader compartido (ver src/components/ScreenHeader.js) — y misma
// regla de clave de dueño que /api/salud/* espera: exactamente
// integrante_id O mascota_id, nunca ambas.

export function ownerField(ownerTipo, ownerId) {
  return ownerTipo === 'integrante' ? { integrante_id: ownerId } : { mascota_id: ownerId };
}

export function HealthFormTopbar({ navigation, title }) {
  return <ScreenHeader title={title} onBack={() => navigation.goBack()} />;
}
