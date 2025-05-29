import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  Check,
  X,
  Filter,
  Search,
  MoreVertical,
  FileText,
  Edit,
  Phone,
} from "lucide-react";
// Supabase import removed
import { useNavigate, useLocation } from "react-router-dom";
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
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";
import { AuthContext } from "@/contexts/authContext";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ChatButton } from "@/components/messaging/ChatButton";
import { useAuth } from "@/contexts/authContext";

interface AppointmentDisplay {
  id: string;
  patient_id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  patient: {
    name: string;
    avatar: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Parse URL parameters for date filtering
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const dateParam = queryParams.get('date');
    
    if (dateParam) {
      // Set custom date filter
      setDateFilter('custom');
      
      // Store the specific date in a ref or state if needed
      // This is handled directly in the fetchAppointments function
    }
  }, [location.search]);
  
  useEffect(() => {
    fetchAppointments();
  }, [user, statusFilter, dateFilter, location.search]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('mentor_appointments_view')
        .select('*')
        .eq('mentor_id', user?.id)
        .order('date', { ascending: true });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      const today = new Date();
      const queryParams = new URLSearchParams(location.search);
      const dateParam = queryParams.get('date');
      
      switch (dateFilter) {
        case "today":
          query = query.eq('date', format(today, 'yyyy-MM-dd'));
          break;
        case "week":
          const weekStart = format(today, 'yyyy-MM-dd');
          const weekEnd = format(addDays(today, 7), 'yyyy-MM-dd');
          query = query.gte('date', weekStart).lte('date', weekEnd);
          break;
        case "month":
          const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
          const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
          query = query.gte('date', monthStart).lte('date', monthEnd);
          break;
        case "custom":
          // Handle specific date from URL parameter
          if (dateParam) {
            query = query.eq('date', dateParam);
          }
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Function to normalize status values
      const normalizeStatus = (status: string) => {
        status = status.toLowerCase();
        // Map "scheduled" and "pending" to "upcoming" for consistency
        if (status === "scheduled" || status === "pending") {
          return "upcoming";
        }
        return status;
      };
      
      const transformedData = (data || []).map(appointment => ({
        id: appointment.id,
        patient_id: appointment.patient_id,
        date: appointment.date,
        time: `${appointment.start_time} - ${appointment.end_time}`,
        type: appointment.meeting_type,
        status: normalizeStatus(appointment.status || "upcoming"),
        notes: appointment.notes,
        patient: {
          name: appointment.patient_name || "Unknown Patient",
          avatar: appointment.patient_avatar_url || "",
          email: appointment.patient_email || "",
          phone: appointment.patient_phone || ""
        }
      }));
      
      console.log("Transformed appointment data:", transformedData);
      setAppointments(transformedData);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast.error("Failed to fetch appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success(`Appointment ${newStatus} successfully`);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || "Failed to update appointment status");
    }
  };

  const handleJoinSession = (appointment: AppointmentDisplay) => {
    // Route based on appointment type
    switch (appointment.type.toLowerCase()) {
      case 'video':
        navigate(`/mood-mentor-dashboard/session/${appointment.id}`);
        break;
      case 'chat':
        navigate(`/mood-mentor-dashboard/messages/${appointment.patient_id}`);
        break;
      case 'audio':
        navigate(`/mood-mentor-dashboard/session/${appointment.id}?mode=audio`);
        break;
      default:
        navigate(`/mood-mentor-dashboard/session/${appointment.id}`);
    }
  };

  const handleExportAppointment = (appointment: AppointmentDisplay) => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Appointment Details', 14, 20);

      // Add appointment info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Format appointment ID
      const appointmentId = appointment.id.slice(-5);
      
      // Appointment details
      doc.text(`ID: #Apt${appointmentId}`, 14, 35);
      doc.text(`Patient: ${appointment.patient.name}`, 14, 42);
      doc.text(`Date: ${appointment.date}`, 14, 49);
      doc.text(`Time: ${appointment.time}`, 14, 56);
      doc.text(`Type: ${appointment.type}`, 14, 63);
      doc.text(`Status: ${appointment.status}`, 14, 70);
      
      if (appointment.patient.email) {
        doc.text(`Email: ${appointment.patient.email}`, 14, 77);
      }
      
      if (appointment.patient.phone) {
        doc.text(`Phone: ${appointment.patient.phone}`, 14, 84);
      }
      
      // Add notes if available
      if (appointment.notes) {
        doc.text('Notes:', 14, 91);
        
        // Handle long notes with wrapping
        const splitNotes = doc.splitTextToSize(appointment.notes, 180);
        doc.text(splitNotes, 14, 98);
      }
      
      // Add footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 285);
      
      // Save the PDF
      doc.save(`appointment-${appointmentId}.pdf`);
      toast.success('Appointment details exported to PDF');
    } catch (error) {
      console.error('Error exporting appointment:', error);
      toast.error('Failed to export appointment details');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: { color: "bg-blue-100 text-blue-800", label: "Upcoming" },
      scheduled: { color: "bg-blue-100 text-blue-800", label: "Upcoming" },
      pending: { color: "bg-blue-100 text-blue-800", label: "Upcoming" },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      "in-progress": { color: "bg-yellow-100 text-yellow-800", label: "In Progress" },
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.upcoming;
    return <Badge className={`${config.color}`}>{config.label}</Badge>;
  };

  const getAppointmentTypeBadge = (type: string) => {
    const typeConfig = {
      video: { icon: <Video className="w-3 h-3 mr-1" />, label: "Video" },
      "in-person": { icon: null, label: "In-Person" },
      chat: { icon: <MessageSquare className="w-3 h-3 mr-1" />, label: "Chat" },
    };

    const config = typeConfig[type as keyof typeof typeConfig];
    return (
      <Badge variant="outline" className="flex items-center">
        {config?.icon}
        {config?.label || type}
      </Badge>
    );
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (searchQuery === "") return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      appointment.patient.name.toLowerCase().includes(searchLower) ||
      appointment.patient.email?.toLowerCase().includes(searchLower) ||
      appointment.patient.phone?.toLowerCase().includes(searchLower) ||
      appointment.id.toLowerCase().includes(searchLower)
    );
  });

  // Update the isAppointmentActive function
  const isAppointmentActive = (appointmentDate: string, appointmentTime: string) => {
    try {
      const now = new Date();
      const [startHour, startMinute] = appointmentTime.split(':').map(Number);
      
      // Create appointment start time
      const appointmentStart = new Date(appointmentDate);
      appointmentStart.setHours(startHour, startMinute, 0, 0);
      
      // Calculate time difference in minutes
      const timeDiffMinutes = (appointmentStart.getTime() - now.getTime()) / (1000 * 60);
      
      console.log(`Appointment time difference: ${timeDiffMinutes} minutes for ${appointmentDate} ${appointmentTime}`);
      
      // Return true if the appointment is within 5 minutes before or 60 minutes after
      return timeDiffMinutes <= 5 && timeDiffMinutes >= -60;
    } catch (error) {
      console.error('Error checking appointment time:', error);
      return false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Manage your appointments and sessions</p>
          </div>
        </div>

        <Card>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by patient name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      {new URLSearchParams(location.search).get('date') && (
                        <SelectItem value="custom">
                          {new Date(new URLSearchParams(location.search).get('date')!).toLocaleDateString()}
                        </SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading appointments...
                      </TableCell>
                    </TableRow>
                  ) : filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              {appointment.patient.avatar ? (
                                <img
                                  src={appointment.patient.avatar}
                                  alt={appointment.patient.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-lg font-bold text-gray-600">
                                  {appointment.patient.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{appointment.patient.name}</div>
                              {appointment.patient.email && (
                                <div className="text-sm text-gray-500">{appointment.patient.email}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                              <span>{appointment.date}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{appointment.time}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getAppointmentTypeBadge(appointment.type)}</TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Upcoming/Scheduled/Pending Appointments */}
                            {(appointment.status.toLowerCase() === "upcoming" || 
                              appointment.status.toLowerCase() === "scheduled" || 
                              appointment.status.toLowerCase() === "pending") && (
                              <>
                                {isAppointmentActive(appointment.date, appointment.time.split(' - ')[0]) ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleJoinSession(appointment)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {appointment.type.toLowerCase() === 'video' && (
                                      <><Video className="w-3 h-3 mr-1" /> Join Video</>
                                    )}
                                    {appointment.type.toLowerCase() === 'chat' && (
                                      <><MessageSquare className="w-3 h-3 mr-1" /> Open Chat</>
                                    )}
                                    {appointment.type.toLowerCase() === 'audio' && (
                                      <><Phone className="w-3 h-3 mr-1" /> Join Audio</>
                                    )}
                                    {!['video', 'chat', 'audio'].includes(appointment.type.toLowerCase()) && (
                                      <><Clock className="w-3 h-3 mr-1" /> Join Now</>
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleJoinSession(appointment)}
                                    variant="outline"
                                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                  >
                                    <FileText className="w-3 h-3 mr-1" /> View Details
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleJoinSession(appointment)}>
                                      {appointment.type.toLowerCase() === 'video' && (
                                        <><Video className="w-4 h-4 mr-2" /> View Video Session</>
                                      )}
                                      {appointment.type.toLowerCase() === 'chat' && (
                                        <><MessageSquare className="w-4 h-4 mr-2" /> Open Chat</>
                                      )}
                                      {appointment.type.toLowerCase() === 'audio' && (
                                        <><Phone className="w-4 h-4 mr-2" /> View Audio Session</>
                                      )}
                                      {!['video', 'chat', 'audio'].includes(appointment.type.toLowerCase()) && (
                                        <><FileText className="w-4 h-4 mr-2" /> View Session</>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "completed")}>
                                      <Check className="w-4 h-4 mr-2" /> Mark as Completed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "cancelled")}>
                                      <X className="w-4 h-4 mr-2" /> Cancel Appointment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportAppointment(appointment)}>
                                      <FileText className="w-4 h-4 mr-2" /> Export Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                            
                            {/* In-Progress Appointments */}
                            {appointment.status.toLowerCase() === "in-progress" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinSession(appointment)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {appointment.type.toLowerCase() === 'video' && (
                                    <><Video className="w-3 h-3 mr-1" /> Continue Video</>
                                  )}
                                  {appointment.type.toLowerCase() === 'chat' && (
                                    <><MessageSquare className="w-3 h-3 mr-1" /> Continue Chat</>
                                  )}
                                  {appointment.type.toLowerCase() === 'audio' && (
                                    <><Phone className="w-3 h-3 mr-1" /> Continue Audio</>
                                  )}
                                  {!['video', 'chat', 'audio'].includes(appointment.type.toLowerCase()) && (
                                    <><Video className="w-3 h-3 mr-1" /> Continue Session</>
                                  )}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "completed")}>
                                      <Check className="w-4 h-4 mr-2" /> Mark as Completed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportAppointment(appointment)}>
                                      <FileText className="w-4 h-4 mr-2" /> Export Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                            
                            {/* Completed Appointments */}
                            {appointment.status.toLowerCase() === "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleJoinSession(appointment)}
                                >
                                  <FileText className="w-3 h-3 mr-1" /> View Details
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigate(`/mood-mentor-dashboard/notes/${appointment.id}`)}>
                                      <Edit className="w-4 h-4 mr-2" /> Edit Notes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportAppointment(appointment)}>
                                      <FileText className="w-4 h-4 mr-2" /> Export Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                            
                            {/* Cancelled Appointments */}
                            {appointment.status.toLowerCase() === "cancelled" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleJoinSession(appointment)}
                                >
                                  <FileText className="w-3 h-3 mr-1" /> View Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExportAppointment(appointment)}
                                >
                                  <FileText className="w-3 h-3 mr-1" /> Export
                                </Button>
                              </>
                            )}
                            
                            {/* Chat Button for all chat appointments */}
                            {appointment.type.toLowerCase() === 'chat' && (
                              <ChatButton
                                appointmentId={appointment.id}
                                variant="outline"
                                size="sm"
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
} 


