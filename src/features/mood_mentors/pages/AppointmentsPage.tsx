import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
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
  Calendar,
  Clock,
  Video,
  MessageSquare,
  Check,
  X,
  Filter,
  Search,
  MoreVertical,
} from "lucide-react";
// Supabase import removed
import { useAuth } from "@/hooks/use-auth";
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
import { format } from "date-fns";

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
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, [user, statusFilter, dateFilter]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient_profiles:patient_id(*)
        `)
        .eq('mood_mentor_id', user?.id)
        .order('date', { ascending: true });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      const today = new Date();
      switch (dateFilter) {
        case "today":
          query = query.eq('date', format(today, 'yyyy-MM-dd'));
          break;
        case "week":
          const weekStart = format(today, 'yyyy-MM-dd');
          const weekEnd = format(new Date(today.setDate(today.getDate() + 7)), 'yyyy-MM-dd');
          query = query.gte('date', weekStart).lte('date', weekEnd);
          break;
        case "month":
          const monthStart = format(today, 'yyyy-MM-01');
          const monthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
          query = query.gte('date', monthStart).lte('date', monthEnd);
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const transformedData = (data || []).map(appointment => ({
        ...appointment,
        patient: {
          name: appointment.patient_profiles?.full_name || appointment.client_name || "Patient",
          avatar: appointment.patient_profiles?.avatar_url || "",
          email: appointment.patient_profiles?.email,
          phone: appointment.patient_profiles?.phone,
        }
      }));
      
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

  const handleJoinSession = (appointmentId: string) => {
    window.location.href = `/mood-mentor-dashboard/session/${appointmentId}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: { color: "bg-blue-100 text-blue-800", label: "Upcoming" },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      "in-progress": { color: "bg-yellow-100 text-yellow-800", label: "In Progress" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;
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
                            {appointment.status === "upcoming" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinSession(appointment.id)}
                                  className="bg-[#0078FF] text-white hover:bg-blue-700"
                                >
                                  Join Session
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
                                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "cancelled")}>
                                      <X className="w-4 h-4 mr-2" /> Cancel Appointment
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
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


