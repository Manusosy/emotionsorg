import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { SharedMessagesPage } from "@/components/messaging/SharedMessagesPage";
import { useAuth } from "@/contexts/authContext";
import { toast } from "sonner";
import { messagingService } from "@/services";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
  const { mentorId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [initialMentorId, setInitialMentorId] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Set the initial mentor ID when component mounts
  useEffect(() => {
    if (mentorId && user) {
      setInitialMentorId(mentorId);
      
      // Try to initialize a conversation if we have a mentor ID
      const initializeConversation = async () => {
        try {
          setIsInitializing(true);
          setInitializationError(null);
          console.log(`Initializing conversation with mentor ID: ${mentorId}`);
          
          // Try to create a conversation with the messaging system
          const result = await messagingService.getOrCreateConversation(
            user.id,
            mentorId
          );
          
          if (result.error) {
            console.error("Error initializing conversation:", result.error);
            setInitializationError(result.error);
            toast.error("Could not initialize conversation with mood mentor");
            return;
          }
          
          if (result.data) {
            console.log(`Conversation initialized with ID: ${result.data}`);
            setInitialMentorId(mentorId);
            setInitializationError(null);
            
            // Add a small delay to ensure the database has registered the conversation
            setTimeout(() => {
              setIsInitializing(false);
            }, 500);
          }
        } catch (err: any) {
          console.error("Error in conversation initialization:", err);
          setInitializationError(err.message || "Failed to prepare messaging interface");
          toast.error("Failed to create conversation with mood mentor");
          setIsInitializing(false);
        }
      };
      
      initializeConversation();
    }
  }, [mentorId, user, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
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
            </div>
            <p className="mt-4 text-gray-700 font-medium">Preparing chat interface...</p>
            <p className="text-sm text-gray-500 mt-1">
              Connecting with your mood mentor
            </p>
          </div>
        </div>
      ) : initializationError ? (
        <div className="flex items-center justify-center h-[calc(100vh-134px)]">
          <div className="w-full max-w-md">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Conversation Initialization Failed</AlertTitle>
              <AlertDescription>
                We couldn't establish a messaging connection with your mood mentor.
                {initializationError.includes("not yet initialized") && 
                  " The messaging system may still be setting up."}
              </AlertDescription>
            </Alert>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/messages')}>
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
          userRole="patient" 
          initialPatientId={initialMentorId}
        />
      )}
    </DashboardLayout>
  );
} 


