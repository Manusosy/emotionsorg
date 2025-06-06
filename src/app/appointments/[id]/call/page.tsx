import { AppointmentCall } from '@/components/calls/AppointmentCall';

interface AppointmentCallPageProps {
  params: {
    id: string;
  };
  searchParams: {
    type?: 'video' | 'audio';
  };
}

export default function AppointmentCallPage({ params, searchParams }: AppointmentCallPageProps) {
  const isAudioOnly = searchParams.type === 'audio';

  return (
    <div className="container mx-auto py-8">
      <AppointmentCall
        appointmentId={params.id}
        isAudioOnly={isAudioOnly}
      />
    </div>
  );
} 