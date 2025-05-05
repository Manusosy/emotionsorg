import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export default function DeleteAccount() {
  const [confirmationText, setConfirmationText] = useState("");
  const [agreements, setAgreements] = useState({
    dataLoss: false,
    permanent: false,
    confirmation: false
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { signout, user } = useAuth();
  const navigate = useNavigate();

  const isFormValid = 
    confirmationText === "DELETE" && 
    Object.values(agreements).every(value => value === true);

  const handleDeleteAccount = async () => {
    if (!isFormValid) return;
    
    try {
      setIsDeleting(true);
      
      // Call the auth service to delete the user account
      if (user?.id) {
        const result = await authService.deleteUser(user.id);
        if (result.error) throw result.error;
      }
      
      toast.success("Account deletion initiated");
      
      // Log out the user
      await signout();
      
      // Navigate to home
      navigate("/", { replace: true });
      
      toast.success("Your account has been deleted successfully");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container max-w-2xl py-10">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>
        
        <Card className="border-red-200">
          <CardHeader className="border-b border-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-600">Delete Account</CardTitle>
            </div>
            <CardDescription>
              This action will permanently delete your account and all associated data.
              This cannot be undone.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
              <h3 className="font-semibold text-amber-900 mb-2">Warning: Account Deletion</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>All your personal data, including profile information, will be permanently deleted.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your appointment history and communications will be removed from our system.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You will lose access to any services and benefits associated with your account.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>This action cannot be reversed once completed.</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="dataLoss" 
                  checked={agreements.dataLoss}
                  onCheckedChange={(checked) => 
                    setAgreements({...agreements, dataLoss: checked === true})
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="dataLoss"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I understand that all my data will be permanently deleted
                  </Label>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="permanent" 
                  checked={agreements.permanent}
                  onCheckedChange={(checked) => 
                    setAgreements({...agreements, permanent: checked === true})
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="permanent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I understand that this action cannot be undone
                  </Label>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="confirmation" 
                  checked={agreements.confirmation}
                  onCheckedChange={(checked) => 
                    setAgreements({...agreements, confirmation: checked === true})
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="confirmation"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I confirm that I want to delete my account
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <Label htmlFor="confirmationText" className="font-semibold text-red-600">
                Type "DELETE" to confirm:
              </Label>
              <Input
                id="confirmationText"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="mt-2"
                placeholder="DELETE"
              />
            </div>
          </CardContent>
          
          <CardFooter className="border-t border-red-100 pt-6">
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!isFormValid || isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete My Account
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
} 


