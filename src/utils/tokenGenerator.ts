import { agoraConfig } from '@/config/agora';
import { supabase } from '@/lib/supabase';

/**
 * Generate a random UID for Agora
 * @returns A random number between 1 and 999999
 */
export const generateUID = (): number => {
  return Math.floor(Math.random() * 999999) + 1;
};

/**
 * Generate a token for Agora using Supabase Edge Function
 * @param channelName The name of the channel to join
 * @param uid The user ID (optional)
 * @returns An object containing the token and uid
 */
export async function generateToken(channelName: string, uid?: string | number): Promise<{ token: string | null, uid: string | number }> {
  try {
    const clientUid = uid || generateUID();
    
    // Get the token from our Supabase Edge Function using POST method
    const { data, error } = await supabase.functions.invoke('agora-token', {
      method: 'POST',
      body: {
        channelName,
        uid: clientUid,
        role: 'publisher',
        expiry: 3600 // 1 hour
      }
    });
    
    if (error) {
      console.error('Error fetching token:', error);
      throw error;
    }
    
    return { 
      token: data?.token || null, 
      uid: clientUid 
    };
  } catch (error) {
    console.error('Error generating token:', error);
    
    // Fallback to app ID only mode in case of error
    console.warn('Falling back to app ID only mode - this is not secure for production!');
    return { token: null, uid: generateUID() };
  }
} 