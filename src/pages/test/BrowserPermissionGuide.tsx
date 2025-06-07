import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function BrowserPermissionGuide() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex gap-2 items-center">
        <Link to="/test/camera">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Camera Test
          </Button>
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold">Browser Camera &amp; Microphone Permission Guide</h1>
      <p className="text-gray-600 max-w-3xl">
        This guide will help you enable camera and microphone permissions in different browsers.
        Choose your browser below to see specific instructions.
      </p>
      
      <Tabs defaultValue="chrome">
        <TabsList className="grid grid-cols-4 sm:grid-cols-5 max-w-3xl">
          <TabsTrigger value="chrome">Chrome</TabsTrigger>
          <TabsTrigger value="firefox">Firefox</TabsTrigger>
          <TabsTrigger value="edge">Edge</TabsTrigger>
          <TabsTrigger value="safari">Safari</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chrome" className="mt-6">
          <Card className="p-6 max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">Google Chrome Camera Permissions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 1: Using the Address Bar</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click on the <strong>lock icon</strong> (or "Not secure" text) in the address bar</li>
                  <li>Select <strong>Site settings</strong> from the dropdown menu</li>
                  <li>Under "Permissions", find <strong>Camera</strong> and <strong>Microphone</strong></li>
                  <li>Use the dropdown menu to select <strong>Allow</strong> for both</li>
                  <li>Refresh the page to apply changes</li>
                </ol>
                <div className="my-4 bg-gray-100 p-4 rounded-lg">
                  <img 
                    src="https://i.imgur.com/2Uj4Hp0.png" 
                    alt="Chrome address bar permission settings" 
                    className="max-w-full h-auto rounded border border-gray-200" 
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 2: Through Chrome Settings</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click the three dots menu (⋮) in the upper-right corner</li>
                  <li>Select <strong>Settings</strong></li>
                  <li>Click <strong>Privacy and security</strong> in the left sidebar</li>
                  <li>Select <strong>Site Settings</strong></li>
                  <li>Under "Permissions", click on <strong>Camera</strong> or <strong>Microphone</strong></li>
                  <li>Find our website in the list or add it to "Allowed to use your camera/microphone"</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-blue-800 mb-2">Common Chrome Issues</h3>
                <ul className="list-disc pl-5 text-blue-800 space-y-2">
                  <li>If permissions are already set to "Allow" but still not working, try clearing site data</li>
                  <li>Check if another application is using your camera (close Zoom, Teams, etc.)</li>
                  <li>Ensure Chrome is up to date</li>
                  <li>Some work or school devices may have restrictions set by administrators</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="firefox" className="mt-6">
          <Card className="p-6 max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">Firefox Camera Permissions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 1: Using the Address Bar</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click on the <strong>lock icon</strong> in the address bar</li>
                  <li>Click the <strong>Connection secure</strong> dropdown</li>
                  <li>Click <strong>More Information</strong></li>
                  <li>In the new window, go to the <strong>Permissions</strong> tab</li>
                  <li>Find <strong>Use the Camera</strong> and <strong>Use the Microphone</strong></li>
                  <li>Remove the settings or change to <strong>Allow</strong></li>
                  <li>Close the dialog and refresh the page</li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 2: Through Firefox Settings</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click the menu button (three lines) in the upper-right corner</li>
                  <li>Select <strong>Settings</strong></li>
                  <li>In the left sidebar, click <strong>Privacy & Security</strong></li>
                  <li>Scroll down to <strong>Permissions</strong> section</li>
                  <li>Click <strong>Settings...</strong> next to "Camera" or "Microphone"</li>
                  <li>Find our website in the list or add it to the allowed list</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-blue-800 mb-2">Common Firefox Issues</h3>
                <ul className="list-disc pl-5 text-blue-800 space-y-2">
                  <li>Firefox might require you to allow camera access each time you join a meeting</li>
                  <li>Check if you accidentally clicked "Block" when first prompted</li>
                  <li>Ensure Firefox is up to date</li>
                  <li>Try using the browser in private browsing mode as a test</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="edge" className="mt-6">
          <Card className="p-6 max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">Microsoft Edge Camera Permissions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 1: Using the Address Bar</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click on the <strong>lock icon</strong> in the address bar</li>
                  <li>Select <strong>Site permissions</strong> from the popup</li>
                  <li>Toggle <strong>Camera</strong> and <strong>Microphone</strong> to Allow</li>
                  <li>Refresh the page to apply changes</li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 2: Through Edge Settings</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click the three dots menu (...) in the upper-right corner</li>
                  <li>Select <strong>Settings</strong></li>
                  <li>Click <strong>Cookies and site permissions</strong> in the left sidebar</li>
                  <li>Scroll down and select <strong>Camera</strong> or <strong>Microphone</strong></li>
                  <li>Make sure our website is not in the "Block" list</li>
                  <li>Add our website to the "Allow" list if needed</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-blue-800 mb-2">Common Edge Issues</h3>
                <ul className="list-disc pl-5 text-blue-800 space-y-2">
                  <li>Microsoft Edge is based on Chromium, so most Chrome solutions will work here too</li>
                  <li>Check Windows privacy settings as they can override browser settings</li>
                  <li>In Windows, go to Settings → Privacy → Camera/Microphone and ensure browser access is enabled</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="safari" className="mt-6">
          <Card className="p-6 max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">Safari Camera Permissions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 1: Using Safari Preferences</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click <strong>Safari</strong> in the top menu</li>
                  <li>Select <strong>Settings for [website]</strong> or <strong>Preferences</strong></li>
                  <li>Click the <strong>Websites</strong> tab</li>
                  <li>Select <strong>Camera</strong> or <strong>Microphone</strong> from the left sidebar</li>
                  <li>Find our website in the list on the right</li>
                  <li>Use the dropdown to select <strong>Allow</strong></li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Method 2: Through macOS System Preferences</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Click the Apple icon in the top-left corner</li>
                  <li>Select <strong>System Preferences</strong> (or System Settings)</li>
                  <li>Click <strong>Security & Privacy</strong> (or Privacy & Security)</li>
                  <li>Select <strong>Camera</strong> or <strong>Microphone</strong> from the left sidebar</li>
                  <li>Ensure Safari is checked in the list of apps</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-blue-800 mb-2">Common Safari Issues</h3>
                <ul className="list-disc pl-5 text-blue-800 space-y-2">
                  <li>Safari requires explicit permission for each website</li>
                  <li>Intelligent Tracking Prevention can sometimes interfere with permissions</li>
                  <li>Try disabling content blockers temporarily</li>
                  <li>macOS may have separate system-level permissions for camera and microphone</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="mobile" className="mt-6">
          <Card className="p-6 max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">Mobile Browser Permissions</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">iOS (iPhone/iPad)</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Open <strong>Settings</strong> on your device</li>
                  <li>Scroll down and find your browser (Safari, Chrome, etc.)</li>
                  <li>Tap on the browser name</li>
                  <li>Look for <strong>Camera</strong> and <strong>Microphone</strong> settings</li>
                  <li>Ensure they are set to <strong>Allow</strong></li>
                  <li>Additionally, check Settings → Privacy → Camera/Microphone and ensure your browser is enabled</li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Android</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>Open <strong>Settings</strong> on your device</li>
                  <li>Tap <strong>Apps</strong> or <strong>Applications</strong></li>
                  <li>Find and tap your browser (Chrome, Firefox, etc.)</li>
                  <li>Tap <strong>Permissions</strong></li>
                  <li>Ensure <strong>Camera</strong> and <strong>Microphone</strong> are set to Allow</li>
                  <li>When prompted in the browser, always tap "Allow" for camera and microphone</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-semibold text-blue-800 mb-2">Common Mobile Issues</h3>
                <ul className="list-disc pl-5 text-blue-800 space-y-2">
                  <li>Mobile browsers may have limited video call functionality compared to desktop</li>
                  <li>Try our dedicated mobile app for the best experience</li>
                  <li>Ensure your device has sufficient battery and isn't in power-saving mode</li>
                  <li>Close other apps that might be using the camera</li>
                  <li>Some older devices may not support advanced WebRTC features needed for video calls</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-yellow-50 p-6 rounded-lg max-w-3xl">
        <h2 className="text-xl font-semibold text-yellow-800 mb-3">Still Having Issues?</h2>
        <p className="text-yellow-800 mb-4">
          If you've tried all the steps above and still can't access your camera or microphone, try these additional troubleshooting tips:
        </p>
        <ul className="list-disc pl-5 text-yellow-800 space-y-2 mb-4">
          <li>Restart your browser completely</li>
          <li>Restart your computer</li>
          <li>Try a different browser</li>
          <li>Check if your camera works in other applications</li>
          <li>Make sure your camera isn't being used by another application</li>
          <li>Ensure your camera drivers are up to date</li>
          <li>Try disconnecting and reconnecting external cameras/microphones</li>
        </ul>
        
        <div className="flex gap-4 mt-4">
          <a 
            href="/test/camera" 
            className="inline-flex items-center text-yellow-800 font-medium hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Return to Camera Test
          </a>
          
          <a 
            href="https://support.google.com/chrome/answer/2693767?hl=en"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-yellow-800 font-medium hover:underline"
          >
            Google Chrome Help <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
} 