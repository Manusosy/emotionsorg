import { appointmentService } from '@/services'
import { useAuth } from '@/contexts/authContext';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Supabase import removed

const formSchema = z.object({
  date: z.date({
    required_error: 'Please select a date for your session',
  }),
  time: z.string({
    required_error: 'Please select a time for your session',
  }),
  notes: z.string().min(10, 'Please provide at least 10 characters').max(500),
  meeting_type: z.enum(['video', 'audio', 'chat'], {
    required_error: 'Please select a meeting type',
  }),
});

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00'
];

const meetingTypes = [
  { value: 'video', label: 'Video Call' },
  { value: 'audio', label: 'Audio Call' },
  { value: 'chat', label: 'Chat' }
];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  moodMentorId: string;
  moodMentorName: string;
}

export function BookingModal({
  isOpen,
  onClose,
  moodMentorId,
  moodMentorName,
}: BookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
      meeting_type: 'video',
    }
  });

  const { user } = useAuth();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      if (!user) {
        toast.error('You must be logged in to book a session');
        return;
      }

      // Calculate end time (1 hour after start time)
      const [hours, minutes] = values.time.split(':');
      const endHour = (parseInt(hours) + 1) % 24;
      const endTime = `${endHour.toString().padStart(2, '0')}:${minutes}`;

      // Use the appointment service to book the appointment
      const response = await appointmentService.bookAppointment({
        patient_id: user.id,
        mentor_id: moodMentorId,
        title: `Session with ${moodMentorName}`,
        description: values.notes,
        date: format(values.date, 'yyyy-MM-dd'),
        start_time: values.time,
        end_time: endTime,
        meeting_link: `https://meet.emotionsapp.com/${user.id}/${moodMentorId}`,
        meeting_type: values.meeting_type,
        notes: values.notes
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success('Session booked successfully');
      onClose();
      form.reset();
    } catch (error: any) {
      toast.error('Failed to book session');
      console.error('Error booking session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book a Session with {moodMentorName}</DialogTitle>
          <DialogDescription>
            Fill in the details below to schedule your session.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="meeting_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {meetingTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe what you'd like to discuss in this session..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Booking...' : 'Book Session'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 


