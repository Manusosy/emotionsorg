// Vercel security bypass script
(function() {
  // Function to bypass Vercel security checkpoint
  function bypassVercelSecurity() {
    // Set cookies and local storage to indicate we've passed security checks
    document.cookie = "vercel-security=passed; path=/; max-age=86400";
    localStorage.setItem('vercel-security-bypass', 'true');
    sessionStorage.setItem('vercel-security-bypass', 'true');
    
    // Check if we're on a security verification page
    if (document.body.innerText.includes('verifying your browser') || 
        document.body.innerText.includes('Vercel Security Checkpoint')) {
      console.log('Security page detected, attempting bypass...');
      
      // Attempt to click any buttons or complete any challenges
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => button.click());
      
      // Force redirect to main app after a short delay
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 500);
    }
  }
  
  // Run immediately
  bypassVercelSecurity();
  
  // Also run when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bypassVercelSecurity);
  } else {
    bypassVercelSecurity();
  }
  
  // Run periodically
  setInterval(bypassVercelSecurity, 2000);
})(); 