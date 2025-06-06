// Function to determine if Join button should be shown
const canJoinSession = (appointment: AppointmentDisplay) => {
  // Only allow joining if the appointment is in 'scheduled' status (mentor has started the session)
  return appointment.status === 'scheduled';
};

// Render action buttons based on appointment type and status
const renderActionButtons = (appointment: AppointmentDisplay) => {
  if (appointment.status === 'completed') {
    return (
      <div className="flex gap-2">
        <button 
          className="px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
          onClick={() => navigate(`/dashboard/appointments/${appointment.id}/feedback`)}
        >
          Leave Feedback
        </button>
      </div>
    );
  }

  // Show Join button only if the mentor has started the session
  if (canJoinSession(appointment)) {
    return (
      <div className="flex gap-2">
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={() => handleJoinSession(appointment)}
        >
          Join
        </button>
      </div>
    );
  }

  // For upcoming appointments that haven't been started by the mentor yet
  return (
    <div className="flex gap-2">
      <button 
        className="px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
        onClick={() => handleReschedule(appointment)}
      >
        Reschedule
      </button>
      <button 
        className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
        onClick={() => handleCancel(appointment)}
      >
        Cancel
      </button>
    </div>
  );
}; 