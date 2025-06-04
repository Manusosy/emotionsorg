import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { SharedMessagesPage } from "@/components/messaging/SharedMessagesPage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/authContext";
import { toast } from "sonner";
import { messagingService, messageService, patientService } from "@/services";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MessagesPage() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [initialPatientId, setInitialPatientId] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  
  // Fetch patient profile if we have a patient ID
  useEffect(() => {
    const fetchPatientProfile = async () => {
      if (!patientId) return;
      
      try {
        const result = await patientService.getPatientById(patientId);
        if (result.success && result.data) {
          setPatientProfile(result.data);
        }
      } catch (err) {
        console.error("Error fetching patient profile:", err);
      }
    };
    
    fetchPatientProfile();
  }, [patientId]);
  
  // Set the initial patient ID when component mounts
  useEffect(() => {
    if (patientId && user) {
      setInitialPatientId(patientId);
      
      // Try to initialize a conversation if we have a patient ID
      const initializeConversation = async () => {
        try {
          setIsInitializing(true);
          setInitializationError(null);
          console.log(`Initializing conversation with patient ID: ${patientId}`);
          
          // First verify that the patient exists
          const patientResult = await patientService.getPatientById(patientId);
          if (!patientResult.success || !patientResult.data) {
            console.error("Patient not found:", patientId);
            setInitializationError("Patient not found. Please check the patient ID.");
            toast.error("Could not find patient profile");
            setIsInitializing(false);
            return;
          }
          
          console.log("Patient found:", patientResult.data);
          
          // Try to create a conversation with the messaging system
          console.log(`Creating conversation between mentor ${user.id} and patient ${patientId}`);
          const result = await messagingService.getOrCreateConversation(
            user.id,
            patientId
          );
          
          if (result.error) {
            console.error("Error initializing conversation:", result.error);
            setInitializationError(result.error);
            toast.error("Could not initialize conversation with patient");
            setIsInitializing(false);
            return;
          }
          
          if (result.data) {
            console.log(`Conversation initialized with ID: ${result.data}`);
            setInitialPatientId(patientId);
            setInitializationError(null);
            
            // Add a small delay to ensure the database has registered the conversation
            setTimeout(() => {
              setIsInitializing(false);
            }, 1000);
          } else {
            console.error("No conversation ID returned");
            setInitializationError("Failed to create conversation");
            toast.error("Could not initialize conversation with patient");
            setIsInitializing(false);
          }
        } catch (err: any) {
          console.error("Error in conversation initialization:", err);
          setInitializationError(err.message || "Failed to prepare messaging interface");
          toast.error("Failed to create conversation with patient");
          setIsInitializing(false);
        }
      };
      
      initializeConversation();
    } else {
      // If we don't have a patient ID, just show the messages page
      setIsInitializing(false);
    }
  }, [patientId, user, retryCount]);
  
  const handleCreateNewMessage = () => {
    setShowNewMessageModal(true);
    // In a real implementation, we would show a modal to select a patient
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Helper function to get initials from a name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <DashboardLayout>
      {isInitializing ? (
        <div className="flex items-center justify-center h-[calc(100vh-134px)]">
          <div className="flex flex-col items-center text-center">
            {/* Modern loading spinner */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-opacity-50 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              {patientProfile && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={patientProfile.avatarUrl} />
                    <AvatarFallback>{getInitials(patientProfile.fullName || "")}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
            <p className="mt-4 text-gray-700 font-medium">Preparing chat interface...</p>
            {patientProfile && (
              <p className="text-sm text-gray-500 mt-1">
                Connecting with {patientProfile.fullName}
              </p>
            )}
          </div>
        </div>
      ) : initializationError ? (
        <div className="flex items-center justify-center h-[calc(100vh-134px)]">
          <div className="w-full max-w-md">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Conversation Initialization Failed</AlertTitle>
              <AlertDescription>
                We couldn't establish a messaging connection with this patient.
                {initializationError.includes("not yet initialized") && 
                  " The messaging system may still be setting up."}
              </AlertDescription>
            </Alert>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/mood-mentor-dashboard/messages')}>
                Go Back
              </Button>
              <Button onClick={handleRetry} className="ml-2">
                {retryCount > 0 && isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Trying again...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <SharedMessagesPage 
          userRole="mood_mentor" 
          onCreateNewMessage={handleCreateNewMessage}
          initialPatientId={initialPatientId}
        />
      )}
      
      {/* Modal for new message would go here */}
      {showNewMessageModal && (
        <div>
          {/* This would be replaced with a proper modal component */}
          <p>New message modal would appear here</p>
        </div>
      )}
    </DashboardLayout>
  );
} 


