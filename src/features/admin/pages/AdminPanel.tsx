import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useState, useEffect } from 'react';
import { Container } from '@/components/ui/container';
import DbMigrationPanel from '@/components/admin/DbMigrationPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AdminPanel() {
  const [user, setUser] = useState<{ id: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the current user
  useEffect(() => {
    async function getUserData() {
      setLoading(true);
      
      try {
        const userData = await authService.getCurrentUser();
        
        if (!userData) {
          setLoading(false);
          return;
        }
        
        // Check if user is admin
        const userProfile = await userService.getUserProfile(userData.id);
        const userRole = userProfile?.role || userData.role || 'user';
        
        setUser({ id: userData.id, role: userRole });
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    getUserData();
  }, []);

  // Check if the user is an admin
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <Container className="py-8">
        <div>Loading...</div>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container className="py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Admin access is required.
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage application settings and perform administrative tasks
        </p>
      </div>
      
      <Tabs defaultValue="database">
        <TabsList className="mb-4">
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="database" className="space-y-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>
                Run migrations and manage database schema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DbMigrationPanel />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>User management features will be added in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Application settings will be added in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
} 


