import { useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Clock, Save, CalendarIcon, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Work hours interface
interface WorkHours {
  day: string;
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export default function AvailabilityPage() {
  const [workHours, setWorkHours] = useState<WorkHours[]>(
    DAYS.map(day => ({
      day,
      enabled: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day),
      startHour: 9,
      endHour: 17,
    }))
  );
  
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Update a specific day's working hours
  const updateWorkHour = (index: number, field: keyof WorkHours, value: any) => {
    const newWorkHours = [...workHours];
    newWorkHours[index] = { 
      ...newWorkHours[index], 
      [field]: value 
    };
    setWorkHours(newWorkHours);
  };
  
  // Handle adding a date to unavailable dates
  const handleAddUnavailableDate = () => {
    if (!date) return;
    
    // Check if date already exists in the array
    const exists = unavailableDates.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    );
    
    if (exists) {
      toast.error("This date is already marked as unavailable");
      return;
    }
    
    setUnavailableDates([...unavailableDates, date]);
    setDate(undefined);
    toast.success("Date marked as unavailable");
  };
  
  // Remove a date from unavailable dates
  const handleRemoveUnavailableDate = (index: number) => {
    const newDates = [...unavailableDates];
    newDates.splice(index, 1);
    setUnavailableDates(newDates);
    toast.success("Date removed from unavailable dates");
  };
  
  // Save all settings
  const handleSaveSettings = () => {
    toast.success("Availability settings saved successfully");
    console.log({ workHours, unavailableDates });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Manage Availability</h1>
            <p className="text-muted-foreground">Set your working hours and manage your schedule</p>
          </div>
          <Button onClick={handleSaveSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
        
        <Tabs defaultValue="working-hours">
          <TabsList>
            <TabsTrigger value="working-hours">Working Hours</TabsTrigger>
            <TabsTrigger value="unavailable-dates">Time Off</TabsTrigger>
            <TabsTrigger value="appointment-settings">Appointment Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="working-hours" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workHours.map((day, index) => (
                    <div key={day.day} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={day.enabled} 
                            onCheckedChange={(checked) => updateWorkHour(index, 'enabled', checked)}
                          />
                          <Label className={cn(day.enabled ? 'opacity-100' : 'opacity-50')}>
                            {day.day}
                          </Label>
                        </div>
                      </div>
                      
                      <div className="col-span-5">
                        <Label>Start Time</Label>
                        <Select 
                          value={day.startHour.toString()} 
                          onValueChange={(value) => updateWorkHour(index, 'startHour', parseInt(value))}
                          disabled={!day.enabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.slice(0, 23).map((hour) => (
                              <SelectItem key={hour} value={hour.toString()}>
                                {hour.toString().padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-5">
                        <Label>End Time</Label>
                        <Select 
                          value={day.endHour.toString()} 
                          onValueChange={(value) => updateWorkHour(index, 'endHour', parseInt(value))}
                          disabled={!day.enabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.slice(day.startHour + 1).map((hour) => (
                              <SelectItem key={hour} value={hour.toString()}>
                                {hour.toString().padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="unavailable-dates" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Unavailable Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md border"
                    />
                    <Button onClick={handleAddUnavailableDate} disabled={!date}>
                      Add Selected Date
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Unavailable Dates</CardTitle>
                </CardHeader>
                <CardContent>
                  {unavailableDates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <CalendarIcon className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-muted-foreground">
                        No unavailable dates set
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Select dates on the calendar to mark yourself as unavailable
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {unavailableDates.map((unavailableDate, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded-md">
                          <span>{format(unavailableDate, 'EEEE, MMMM d, yyyy')}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveUnavailableDate(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="appointment-settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-2">
                    <Label htmlFor="session-duration">Default Session Duration</Label>
                    <Select defaultValue="60">
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="buffer-time">Buffer Time Between Sessions</Label>
                    <Select defaultValue="15">
                      <SelectTrigger>
                        <SelectValue placeholder="Select buffer time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No buffer</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <Label htmlFor="advance-booking">Advance Booking Limit</Label>
                    </div>
                    <Select defaultValue="60">
                      <SelectTrigger>
                        <SelectValue placeholder="Select advance booking limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">1 week</SelectItem>
                        <SelectItem value="14">2 weeks</SelectItem>
                        <SelectItem value="30">1 month</SelectItem>
                        <SelectItem value="60">2 months</SelectItem>
                        <SelectItem value="90">3 months</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      <Info className="inline h-3 w-3 mr-1" />
                      How far in advance clients can book appointments with you
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 