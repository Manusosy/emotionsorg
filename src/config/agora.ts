import { getEnvValue } from '@/lib/supabase';

export const agoraConfig = {
  // Get Agora credentials from environment variables
  appId: getEnvValue('VITE_AGORA_APP_ID', 'f87255c9501e4db89944550d630c5b99' as any),
  appCertificate: getEnvValue('VITE_AGORA_APP_CERTIFICATE', '116c4e6416d5474c8b11fee8d3819e51' as any),
  // Channel name prefix for appointments
  channelPrefix: 'appointment-',
  // Video configuration
  videoConfig: {
    encoderConfig: '720p_1', // 720p quality
    optimizationMode: 'detail', // Prioritize video quality
    facingMode: 'user' // Use front camera
  },
  // Audio configuration
  audioConfig: {
    audioProfile: 'music_standard', // High-quality audio
    scenario: 'meeting' // Optimize for meeting scenario
  },
  // Client configuration
  clientConfig: {
    mode: 'rtc',
    codec: 'vp8',
    role: 'host'
  }
}; 