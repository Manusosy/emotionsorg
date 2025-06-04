import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { SharedMessagesPage } from "@/components/messaging/SharedMessagesPage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/authContext";
import { toast } from "sonner";
import { messagingService, messageService } from "@/services";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [initialPatientId, setInitialPatientId] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
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
          
          // Try to create a conversation with the new messaging system first
          let result = await messagingService.getOrCreateConversation(
            user.id,
            patientId
          );
          
          // If that fails, try the direct messaging fallback
          if (result.error) {
            console.log('First attempt failed, trying direct messaging fallback');
            result = await messageService.getOrCreateConversation(
              user.id,
              patientId
            );
          }
          
          if (result.error) {
            console.error("Error initializing conversation:", result.error);
            setInitializationError(result.error);
            toast.error("Could not initialize conversation with patient");
            return;
          }
          
          if (result.data) {
            console.log(`Conversation initialized with ID: ${result.data}`);
            setInitialPatientId(patientId);
            setInitializationError(null);
          }
        } catch (err: any) {
          console.error("Error in conversation initialization:", err);
          setInitializationError(err.message || "Failed to prepare messaging interface");
          toast.error("Failed to create conversation with patient");
        } finally {
          setIsInitializing(false);
        }
      };
      
      initializeConversation();
    }
  }, [patientId, user, navigate, retryCount]);
  
  const handleCreateNewMessage = () => {
    setShowNewMessageModal(true);
    // In a real implementation, we would show a modal to select a patient
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      {isInitializing ? (
        <div className="flex items-center justify-center h-[calc(100vh-134px)]">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Preparing chat interface...</p>
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
                  "Try Again"
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


