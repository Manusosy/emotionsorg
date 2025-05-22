// Test script to verify Supabase connection
(function() {
  const testSupabaseConnection = async () => {
    try {
      if (!window.ENV_CONFIG) {
        console.error('❌ ENV_CONFIG not found in window object');
        document.getElementById('test-result').innerText = 'Failed: ENV_CONFIG not found';
        return;
      }
      
      console.log('🔍 Testing Supabase connection with credentials:');
      console.log('   URL:', window.ENV_CONFIG.VITE_SUPABASE_URL);
      console.log('   Key available:', !!window.ENV_CONFIG.VITE_SUPABASE_ANON_KEY);

      // Create a minimal Supabase client for testing
      const { createClient } = window.supabase;
      
      if (!createClient) {
        console.error('❌ @supabase/supabase-js not found. Include it before this script.');
        document.getElementById('test-result').innerText = 'Failed: Supabase JS client not found';
        return;
      }
      
      const supabase = createClient(
        window.ENV_CONFIG.VITE_SUPABASE_URL,
        window.ENV_CONFIG.VITE_SUPABASE_ANON_KEY
      );
      
      // Make a simple request
      const start = Date.now();
      const { data, error } = await supabase.from('profiles').select('count');
      const elapsed = Date.now() - start;
      
      if (error) {
        console.error('❌ Supabase connection failed:', error);
        document.getElementById('test-result').innerText = `Failed: ${error.message}`;
        return;
      }
      
      console.log('✅ Supabase connection successful! Response time:', elapsed, 'ms');
      console.log('   Response data:', data);
      document.getElementById('test-result').innerText = `Success! Response time: ${elapsed}ms`;
    } catch (err) {
      console.error('❌ Error testing Supabase connection:', err);
      document.getElementById('test-result').innerText = `Error: ${err.message}`;
    }
  };

  // Expose globally
  window.testSupabaseConnection = testSupabaseConnection;
  
  // Run on load if the target element exists
  window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('test-result')) {
      testSupabaseConnection();
    }
  });
})(); 