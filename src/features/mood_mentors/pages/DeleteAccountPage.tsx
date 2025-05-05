import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DeleteAccountPage() {
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [dataChecked, setDataChecked] = useState(false);
  const [error, setError] = useState('');
  
  const requiredConfirmation = "DELETE";
  
  const handleGoBack = () => {
    navigate('/mood-mentor-dashboard/settings');
  };
  
  const handleDeleteAccount = async () => {
    try {
      setError('');
      
      // Check confirmation criteria
      if (confirmation !== requiredConfirmation) {
        setError('Please type DELETE to confirm account deletion');
        return;
      }
      
      if (!confirmChecked || !dataChecked) {
        setError('Please check both confirmation boxes');
        return;
      }
      
      setIsDeleting(true);
      
      // Delete data from database first
      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete account');
      }
      
      // Sign out the user
      await signout();
      
      // Show success message
      toast.success('Your account has been successfully deleted');
      
      // Redirect to home page
      navigate('/');
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setError(error.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Delete Account</h1>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: This action cannot be undone</AlertTitle>
          <AlertDescription>
            Deleting your account will remove all your data from our platform, including your profile, 
            patient relationships, appointments, messages, and other associated information.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Delete Your Mood Mentor Account</CardTitle>
            <CardDescription>
              Before you delete your account, please read through the following information carefully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium">What happens when you delete your account:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Your profile will be permanently removed</li>
                  <li>All your patient relationships will be terminated</li>
                  <li>Your appointment history will be deleted</li>
                  <li>Your messages with patients will be deleted</li>
                  <li>Your reviews and ratings will be removed</li>
                  <li>You will lose access to all platform features</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium">This action cannot be reversed:</h3>
                <p className="mt-2">
                  Once your account is deleted, we cannot recover any of your data. If you wish to use the platform
                  again in the future, you will need to create a new account from scratch.
                </p>
              </div>
              
              <div className="pt-4">
                <div className="flex items-top space-x-2">
                  <Checkbox 
                    id="confirm-delete" 
                    checked={confirmChecked}
                    onCheckedChange={(checked) => setConfirmChecked(checked === true)}
                  />
                  <Label 
                    htmlFor="confirm-delete" 
                    className="text-sm font-normal leading-tight"
                  >
                    I understand that deleting my account will permanently remove all my data and this action cannot be undone.
                  </Label>
                </div>
              </div>
              
              <div className="flex items-top space-x-2">
                <Checkbox 
                  id="confirm-data" 
                  checked={dataChecked}
                  onCheckedChange={(checked) => setDataChecked(checked === true)}
                />
                <Label 
                  htmlFor="confirm-data" 
                  className="text-sm font-normal leading-tight"
                >
                  I understand that my patient relationships will be terminated and they will lose access to my services.
                </Label>
              </div>
            </div>
            
            <div className="space-y-2 pt-4">
              <Label htmlFor="confirmation">
                Please type <span className="font-bold">{requiredConfirmation}</span> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={requiredConfirmation}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={
                isDeleting || 
                confirmation !== requiredConfirmation || 
                !confirmChecked || 
                !dataChecked
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                'Permanently Delete Account'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
} 