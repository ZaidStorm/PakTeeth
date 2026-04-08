/**
 * Safely find an appointment for messaging
 * Checks all possible ID fields used in the system
 */
function findAppointmentForMessage(appointments, id) {
    if (!appointments || !id) return null;
    return appointments.find(a =>
        String(a._id) === String(id) ||
        String(a.id) === String(id) ||
        String(a.appointmentId) === String(id)
    );
}

// Make available globally
window.findAppointmentForMessage = findAppointmentForMessage;

/**
 * Safely find a patient for messaging
 */
function findPatientForMessage(patients, id) {
    if (!patients || !id) return null;
    return patients.find(p =>
        String(p._id) === String(id) ||
        String(p.id) === String(id) ||
        String(p.patientId) === String(id)
    );
}

window.findPatientForMessage = findPatientForMessage;
