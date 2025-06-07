import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Mic, CameraOff, MicOff, RefreshCw, ListRestart, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CameraTest() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [browserInfo, setBrowserInfo] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get browser info on load
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const browserDetails = 
      `Browser: ${navigator.userAgent}\n` +
      `Platform: ${navigator.platform}\n` +
      `Cookies Enabled: ${navigator.cookieEnabled}\n` +
      `Online: ${navigator.onLine}`;
      
    setBrowserInfo(browserDetails);
  }, []);

  // Check for available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // This will trigger the permission prompt in most browsers
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Get list of devices after permissions granted
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Log device info
        console.log('Available devices:', devices);
        setDevices(devices);
        
        // Set default devices
        const defaultCamera = devices.find(device => device.kind === 'videoinput')?.deviceId;
        const defaultMic = devices.find(device => device.kind === 'audioinput')?.deviceId;
        
        if (defaultCamera) setSelectedCamera(defaultCamera);
        if (defaultMic) setSelectedMicrophone(defaultMic);
        
        // Clean up temp stream
        tempStream.getTracks().forEach(track => track.stop());
        
        setHasPermissions(true);
        addToLog('✅ Initial permissions check successful');
      } catch (err: any) {
        console.error('Error getting media devices:', err);
        setHasPermissions(false);
        addToLog(`❌ Error getting media devices: ${err.name}: ${err.message}`);
      }
    };
    
    getDevices();
    
    return () => {
      // Clean up any active streams when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const addToLog = (message: string) => {
    setErrorLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const activateCamera = async () => {
    // Stop any existing stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    try {
      addToLog('🔄 Requesting camera access...');
      
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true
      };
      
      console.log('Using constraints:', constraints);
      addToLog(`📋 Using constraints: ${JSON.stringify(constraints)}`);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check what tracks we actually got
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      
      addToLog(`✅ Media access granted: video=${hasVideo}, audio=${hasAudio}`);
      
      // Connect stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setLocalStream(stream);
      setIsCameraActive(hasVideo);
      setIsMicActive(hasAudio);
      
      toast.success('Camera and microphone activated');
    } catch (err: any) {
      console.error('Failed to get camera access:', err);
      addToLog(`❌ Access error: ${err.name}: ${err.message}`);
      
      // Try audio only as fallback
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Camera access denied by browser. Please check your browser settings.');
        addToLog('🔄 Trying audio-only as fallback...');
        
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(audioStream);
          setIsCameraActive(false);
          setIsMicActive(true);
          addToLog('✅ Audio-only fallback successful');
        } catch (audioErr: any) {
          addToLog(`❌ Audio fallback failed: ${audioErr.name}: ${audioErr.message}`);
          toast.error('Could not access camera or microphone');
        }
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('No camera or microphone found on this device');
      } else {
        toast.error(`Media error: ${err.message}`);
      }
    }
  };

  const refreshDeviceList = async () => {
    try {
      addToLog('🔄 Refreshing device list...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      setDevices(devices);
      addToLog(`✅ Found ${devices.filter(d => d.kind === 'videoinput').length} cameras and ${devices.filter(d => d.kind === 'audioinput').length} microphones`);
      toast.success('Device list updated');
    } catch (err: any) {
      console.error('Error refreshing devices:', err);
      addToLog(`❌ Error refreshing devices: ${err.name}: ${err.message}`);
      toast.error('Failed to refresh device list');
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraActive(!isCameraActive);
      addToLog(`🎥 Camera ${!isCameraActive ? 'enabled' : 'disabled'}`);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicActive(!isMicActive);
      addToLog(`🎤 Microphone ${!isMicActive ? 'enabled' : 'disabled'}`);
    }
  };

  const copyDiagnostics = () => {
    const diagnosticInfo = `
CAMERA TEST DIAGNOSTICS
======================
Time: ${new Date().toLocaleString()}

BROWSER INFO
-----------
${browserInfo}

DEVICE INFO
-----------
Cameras: ${devices.filter(d => d.kind === 'videoinput').length}
Microphones: ${devices.filter(d => d.kind === 'audioinput').length}
Speakers: ${devices.filter(d => d.kind === 'audiooutput').length}

Cameras:
${devices.filter(d => d.kind === 'videoinput').map(d => `- ${d.label || 'Unnamed Device'} (${d.deviceId.substring(0, 8)}...)`).join('\n')}

Microphones:
${devices.filter(d => d.kind === 'audioinput').map(d => `- ${d.label || 'Unnamed Device'} (${d.deviceId.substring(0, 8)}...)`).join('\n')}

PERMISSION STATUS
----------------
Has Permissions: ${hasPermissions}
Camera Active: ${isCameraActive}
Microphone Active: ${isMicActive}

EVENT LOG
---------
${errorLog.join('\n')}
`;

    navigator.clipboard.writeText(diagnosticInfo);
    toast.success('Diagnostic information copied to clipboard');
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Camera &amp; Microphone Test</h1>
      <p className="text-gray-600">
        Use this page to test your camera and microphone settings for video calls.
        If you're having issues with calls, the information here can help diagnose the problem.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Camera Preview */}
        <Card className="md:col-span-2 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Camera Preview</h2>
          </div>
          <div className="flex-grow bg-gray-100 relative">
            {localStream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-16 w-16 text-gray-400" />
                <p className="mt-4 text-gray-500">Camera preview will appear here</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 flex justify-center gap-3">
            <Button
              size="icon"
              variant={isCameraActive ? "default" : "outline"}
              onClick={toggleCamera}
              disabled={!localStream || !localStream.getVideoTracks().length}
              className="rounded-full h-12 w-12"
            >
              {isCameraActive ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </Button>
            <Button
              size="icon"
              variant={isMicActive ? "default" : "outline"}
              onClick={toggleMic}
              disabled={!localStream || !localStream.getAudioTracks().length}
              className="rounded-full h-12 w-12"
            >
              {isMicActive ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
          </div>
        </Card>
        
        {/* Controls */}
        <Card className="flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Device Settings</h2>
          </div>
          <div className="p-4 space-y-4 flex-grow">
            <div className="space-y-2">
              <label className="text-sm font-medium">Camera</label>
              <Select 
                value={selectedCamera} 
                onValueChange={setSelectedCamera}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices
                    .filter(device => device.kind === 'videoinput')
                    .map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.substring(0, 4)}...`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Microphone</label>
              <Select 
                value={selectedMicrophone} 
                onValueChange={setSelectedMicrophone}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {devices
                    .filter(device => device.kind === 'audioinput')
                    .map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 4)}...`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-4 space-y-3">
              <Button 
                onClick={activateCamera} 
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Test Camera &amp; Mic
              </Button>
              
              <Button 
                variant="outline" 
                onClick={refreshDeviceList}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Device List
              </Button>
            </div>
            
            <div className="border-t pt-4 mt-6">
              <h3 className="font-medium mb-2">Permissions Status</h3>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hasPermissions === true ? 'bg-green-500' : hasPermissions === false ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                  <span>Permissions: {hasPermissions === true ? 'Granted' : hasPermissions === false ? 'Denied' : 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Camera: {isCameraActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isMicActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Microphone: {isMicActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Log */}
        <Card className="md:col-span-3">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Diagnostic Log</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setErrorLog([])}
              >
                <ListRestart className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyDiagnostics}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Diagnostics
              </Button>
            </div>
          </div>
          <div className="p-4 max-h-60 overflow-y-auto bg-gray-50 font-mono text-sm">
            {errorLog.length === 0 ? (
              <p className="text-gray-500">No events logged yet. Start by testing your camera.</p>
            ) : (
              <div className="space-y-1">
                {errorLog.map((log, index) => (
                  <div key={index} className="border-b border-gray-100 pb-1 last:border-0">{log}</div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Troubleshooting Tips</h3>
        <ul className="list-disc pl-5 text-blue-700 space-y-1">
          <li>Make sure your browser has permission to access the camera and microphone</li>
          <li>Check that no other applications are using your camera</li>
          <li>Try refreshing the page if the camera doesn't appear</li>
          <li>Some antivirus software may block camera access</li>
          <li>If using a laptop, check if there's a physical camera switch or keyboard shortcut</li>
          <li>For enterprise environments, contact your IT administrator as policy settings may block access</li>
        </ul>
        <div className="mt-4">
          <a 
            href="/test/permissions" 
            className="text-blue-700 font-medium hover:underline inline-flex items-center"
          >
            View detailed browser permission guide
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
} 