import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  UserPlus,
  Users,
  Eye,
  MoreVertical,
  MapPin,
} from "lucide-react";
import { AuthContext } from "@/contexts/authContext";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, differenceInHours } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  country: string;
  city: string;
  state: string;
  avatar_url?: string;
  created_at: string;
}

interface SupportGroup {
  id: string;
  name: string;
  mood_mentor_id: string;
  description: string;
  created_at: string;
}

export default function PatientsPage() {
  const { user } = useContext(AuthContext);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  useEffect(() => {
    // Fetch patients first
    fetchPatients();
    
    // Then fetch support groups
    if (user?.id) {
      fetchSupportGroups();
    }

    // Set up listener for patient updates
    const patientListener = patientService.subscribeToPatientUpdates(() => {
      fetchPatients(); // Refresh the patients list when changes occur
    });

    return () => {
      // Clean up listener
      if (patientListener && typeof patientListener === 'function') {
        patientListener();
      }
    };
  }, [user?.id]);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      console.log('Starting patient fetch...');

      // First check network connectivity
      const isNetworkOnline = navigator.onLine;
      if (!isNetworkOnline) {
        console.error('Device is offline');
        toast.error("Network connection unavailable. Please check your internet connection.");
        setIsLoading(false);
        setPatients([]);
        return;
      }

      // Fetch patients using the patient service
      const patientData = await patientService.getAllPatients();
      
      if (patientData && patientData.length > 0) {
        console.log(`Found ${patientData.length} patients`);
        setPatients(patientData);
      } else {
        console.log('No patients found');
        setPatients([]);
        toast.info("No patients found");
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error("Failed to fetch patients");
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupportGroups = async () => {
    try {
      if (!user?.id) {
        console.error('No user ID available');
        return;
      }
      
      // Fetch support groups using the mood mentor service
      const groups = await moodMentorService.getSupportGroups(user.id);
      
      if (groups && groups.length > 0) {
        setSupportGroups(groups);
        // Set the first group as selected by default
        if (groups.length > 0 && !selectedGroup) {
          setSelectedGroup(groups[0].id);
        }
      } else {
        setSupportGroups([]);
      }
    } catch (error) {
      console.error('Error fetching support groups:', error);
      toast.error("Failed to fetch support groups");
      setSupportGroups([]);
    }
  };

  const addToGroup = async (patientId: string, groupId: string) => {
    try {
      if (!groupId || !patientId) {
        toast.error("Missing group or patient information");
        return;
      }
      
      await moodMentorService.addPatientToGroup(patientId, groupId);
      toast.success("Patient added to group successfully");
    } catch (error) {
      console.error('Error adding patient to group:', error);
      toast.error("Failed to add patient to group");
    }
  };

  const viewProfile = (patient: PatientProfile) => {
    setSelectedPatient(patient);
    setIsProfileOpen(true);
  };

  const getFullName = (patient: PatientProfile) => {
    return `${patient.first_name} ${patient.last_name}`.trim();
  };

  const getInitials = (patient: PatientProfile) => {
    return `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.trim() || '?';
  };

  const getAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return "N/A";
    try {
      const birthDate = new Date(dateOfBirth);
      const ageDiff = new Date().getFullYear() - birthDate.getFullYear();
      return `${ageDiff} yrs`;
    } catch (e) {
      return "N/A";
    }
  };

  const isNewPatient = (createdAt: string) => {
    if (!createdAt) return false;
    try {
      const created = new Date(createdAt);
      const hoursDiff = differenceInHours(new Date(), created);
      return hoursDiff < 48; // Consider new if added in the last 48 hours
    } catch (e) {
      return false;
    }
  };

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient => {
    const fullName = getFullName(patient).toLowerCase();
    const email = patient.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Patients</h1>
            <p className="text-muted-foreground">Manage your patients and group memberships</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search patients..."
                className="pl-8 w-full md:w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {supportGroups.length > 0 && (
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {supportGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            
            <Button className="flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium mb-2">No patients found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? "No patients match your search criteria"
                  : "You haven't added any patients yet"}
              </p>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add your first patient
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="mr-3 h-8 w-8">
                          <AvatarImage src={patient.avatar_url || undefined} alt={getFullName(patient)} />
                          <AvatarFallback>{getInitials(patient)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{getFullName(patient)}</div>
                          {isNewPatient(patient.created_at) && (
                            <Badge variant="outline" className="mt-1 bg-green-50 text-green-600 text-xs">New</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-3.5 w-3.5 text-gray-500 mr-1" />
                        <span>{patient.city ? `${patient.city}, ${patient.country}` : patient.country}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getAge(patient.date_of_birth)}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.created_at ? format(new Date(patient.created_at), 'MMM d, yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewProfile(patient)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          {supportGroups.length > 0 && selectedGroup && (
                            <DropdownMenuItem onClick={() => addToGroup(patient.id, selectedGroup)}>
                              <Users className="mr-2 h-4 w-4" />
                              Add to Group
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      
      {/* Patient Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Patient Profile</DialogTitle>
            <DialogDescription>
              Detailed information about the patient
            </DialogDescription>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedPatient.avatar_url || undefined} alt={getFullName(selectedPatient)} />
                  <AvatarFallback>{getInitials(selectedPatient)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{getFullName(selectedPatient)}</h3>
                  <p className="text-gray-500">{selectedPatient.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p>{selectedPatient.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p>{selectedPatient.date_of_birth 
                      ? format(new Date(selectedPatient.date_of_birth), 'MMMM d, yyyy')
                      : 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p>{selectedPatient.city && selectedPatient.state
                      ? `${selectedPatient.city}, ${selectedPatient.state}`
                      : selectedPatient.country || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Joined</p>
                  <p>{selectedPatient.created_at 
                      ? format(new Date(selectedPatient.created_at), 'MMMM d, yyyy')
                      : 'Unknown'}</p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                  Close
                </Button>
                <Button>
                  Schedule Session
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
} 


