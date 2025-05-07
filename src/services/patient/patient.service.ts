import { 
  IPatientService, 
  Appointment, 
  AppointmentReport,
  PatientMetric,
  Assessment
} from './patient.interface';

/**
 * Mock Patient Service
 * Implements the PatientService interface with mock functionality
 */
export class MockPatientService implements IPatientService {
  // Mock data
  private appointments: Record<string, Appointment> = {};
  private reports: Record<string, AppointmentReport> = {};
  private metrics: Record<string, PatientMetric> = {};
  private assessments: Record<string, Assessment> = {};
  
  constructor() {
    // Initialize with some example data for testing
    this.initializeMockData();
  }
  
  private initializeMockData() {
    // Create some mock appointments
    const mockAppointments: Partial<Appointment>[] = [
      {
        patientId: '1',
        moodMentorId: '2',
        timestamp: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in future
        status: 'scheduled',
        meetingLink: 'https://meet.example.com/abc123',
        notes: 'Initial consultation'
      },
      {
        patientId: '1',
        moodMentorId: '2',
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        status: 'completed',
        meetingLink: 'https://meet.example.com/def456',
        notes: 'Follow-up session'
      },
      {
        patientId: '1',
        moodMentorId: '3',
        timestamp: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
        status: 'completed',
        meetingLink: 'https://meet.example.com/ghi789',
        notes: 'Stress management techniques'
      }
    ];
    
    for (const appointment of mockAppointments) {
      const id = `appt-${Math.random().toString(36).substring(2, 15)}`;
      this.appointments[id] = {
        id,
        patientId: appointment.patientId || '',
        moodMentorId: appointment.moodMentorId || '',
        timestamp: appointment.timestamp || new Date().toISOString(),
        status: appointment.status || 'scheduled',
        meetingLink: appointment.meetingLink,
        notes: appointment.notes
      };
    }
    
    // Create some mock appointment reports
    const mockReports: Partial<AppointmentReport>[] = [
      {
        appointmentId: Object.keys(this.appointments)[1], // completed appointment
        patientId: '1',
        moodMentorId: '2',
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        summary: 'Patient shows signs of improvement in anxiety symptoms. Reported better sleep patterns over the past week.',
        recommendations: [
          'Continue with daily meditation practice',
          'Maintain sleep journal',
          'Practice deep breathing during stress triggers'
        ],
        followUpDate: new Date(Date.now() + 86400000 * 14).toISOString(),
        moodScore: 7
      },
      {
        appointmentId: Object.keys(this.appointments)[2], // completed appointment
        patientId: '1',
        moodMentorId: '3',
        date: new Date(Date.now() - 86400000 * 10).toISOString(),
        summary: 'Patient discussed work-related stress factors. Identified several triggers and developed coping strategies.',
        recommendations: [
          'Implement time-boxing technique for work tasks',
          'Take regular breaks during high-stress periods',
          'Practice progressive muscle relaxation before bed'
        ],
        followUpDate: new Date(Date.now() + 86400000 * 21).toISOString(),
        moodScore: 6
      }
    ];
    
    for (const report of mockReports) {
      const id = `report-${Math.random().toString(36).substring(2, 15)}`;
      this.reports[id] = {
        id,
        appointmentId: report.appointmentId || '',
        patientId: report.patientId || '',
        moodMentorId: report.moodMentorId || '',
        date: report.date || new Date().toISOString(),
        summary: report.summary || '',
        recommendations: report.recommendations || [],
        followUpDate: report.followUpDate,
        moodScore: report.moodScore
      };
    }
    
    // Create some mock metrics
    const metricTypes = ['anxiety', 'depression', 'stress', 'sleep_quality'];
    const today = new Date();
    
    // Generate 30 days of data
    for (let i = 0; i < 30; i++) {
      const date = new Date(today.getTime() - 86400000 * i);
      
      for (const type of metricTypes) {
        // Generate random values for each metric
        let value;
        switch (type) {
          case 'anxiety':
            // Anxiety improving over time (scale 0-10)
            value = Math.max(2, Math.min(8, 8 - i * 0.2 + Math.random() * 2 - 1));
            break;
          case 'depression':
            // Depression steady with some fluctuation (scale 0-10)
            value = Math.max(2, Math.min(8, 5 + Math.random() * 2 - 1));
            break;
          case 'stress':
            // Stress slightly decreasing (scale 0-10)
            value = Math.max(2, Math.min(9, 7 - i * 0.1 + Math.random() * 3 - 1.5));
            break;
          case 'sleep_quality':
            // Sleep quality improving (scale 0-10)
            value = Math.max(2, Math.min(9, 4 + i * 0.15 + Math.random() * 2 - 1));
            break;
          default:
            value = 5;
        }
        
        const id = `metric-${type}-${date.toISOString()}`;
        this.metrics[id] = {
          id,
          patientId: '1',
          type,
          value,
          timestamp: date.toISOString()
        };
      }
    }
    
    // Create some mock assessments
    const assessmentTypes = ['phq9', 'gad7', 'pss10', 'dass21'];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getTime() - 86400000 * i * 15); // Every 15 days
      
      for (const type of assessmentTypes) {
        let score;
        let responses: Record<string, any> = {};
        
        switch (type) {
          case 'phq9': // Depression
            // Scores gradually improving (0-27)
            score = Math.max(5, Math.min(20, 18 - i * 2 + Math.random() * 4 - 2));
            // Mock responses (9 questions, 0-3 scale)
            for (let q = 1; q <= 9; q++) {
              responses[`q${q}`] = Math.floor(Math.random() * 4);
            }
            break;
          case 'gad7': // Anxiety
            // Scores gradually improving (0-21)
            score = Math.max(4, Math.min(18, 15 - i * 1.5 + Math.random() * 3 - 1.5));
            // Mock responses (7 questions, 0-3 scale)
            for (let q = 1; q <= 7; q++) {
              responses[`q${q}`] = Math.floor(Math.random() * 4);
            }
            break;
          case 'pss10': // Perceived Stress
            // Scores slightly fluctuating (0-40)
            score = Math.max(10, Math.min(35, 25 - i * 1 + Math.random() * 6 - 3));
            // Mock responses (10 questions, 0-4 scale)
            for (let q = 1; q <= 10; q++) {
              responses[`q${q}`] = Math.floor(Math.random() * 5);
            }
            break;
          case 'dass21': // Depression, Anxiety, Stress
            // Scores gradually improving (0-120)
            score = Math.max(20, Math.min(80, 60 - i * 5 + Math.random() * 10 - 5));
            // Mock responses (21 questions, 0-3 scale)
            for (let q = 1; q <= 21; q++) {
              responses[`q${q}`] = Math.floor(Math.random() * 4);
            }
            break;
          default:
            score = 10;
        }
        
        const id = `assessment-${type}-${date.toISOString()}`;
        this.assessments[id] = {
          id,
          patientId: '1',
          type,
          date: date.toISOString(),
          score,
          responses
        };
      }
    }
  }
  
  async getAppointments(patientId: string, options?: {
    status?: 'scheduled' | 'completed' | 'cancelled';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const limit = options?.limit || 20;
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    let appointments = Object.values(this.appointments)
      .filter(appointment => appointment.patientId === patientId)
      .filter(appointment => {
        // Filter by status if specified
        if (options?.status && appointment.status !== options.status) {
          return false;
        }
        
        // Filter by date range if specified
        if (startDate || endDate) {
          const appointmentDate = new Date(appointment.timestamp);
          
          if (startDate && appointmentDate < startDate) {
            return false;
          }
          
          if (endDate && appointmentDate > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, limit);
    
    return appointments;
  }
  
  async getAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    data: AppointmentReport[];
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    try {
      let reports = Object.values(this.reports)
        .filter(report => {
          // Filter by patient ID if specified
          if (options?.patientId && report.patientId !== options.patientId) {
            return false;
          }
          
          // Filter by mood mentor ID if specified
          if (options?.moodMentorId && report.moodMentorId !== options.moodMentorId) {
            return false;
          }
          
          // Filter by date range if specified
          if (startDate || endDate) {
            const reportDate = new Date(report.date);
            
            if (startDate && reportDate < startDate) {
              return false;
            }
            
            if (endDate && reportDate > endDate) {
              return false;
            }
          }
          
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(offset, offset + limit);
      
      return {
        success: true,
        data: reports,
        error: null
      };
    } catch (err) {
      return {
        success: false,
        data: [],
        error: 'Failed to fetch appointment reports'
      };
    }
  }
  
  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const id = `appt-${Math.random().toString(36).substring(2, 15)}`;
    
    const newAppointment: Appointment = {
      id,
      ...appointment
    };
    
    this.appointments[id] = newAppointment;
    
    return newAppointment;
  }
  
  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const appointment = this.appointments[id];
    
    if (!appointment) {
      return null;
    }
    
    this.appointments[id] = {
      ...appointment,
      ...data
    };
    
    return this.appointments[id];
  }
  
  async cancelAppointment(id: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const appointment = this.appointments[id];
    
    if (!appointment) {
      return false;
    }
    
    this.appointments[id] = {
      ...appointment,
      status: 'cancelled'
    };
    
    return true;
  }
  
  async getMetrics(patientId: string, options?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PatientMetric[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    let metrics = Object.values(this.metrics)
      .filter(metric => metric.patientId === patientId)
      .filter(metric => {
        // Filter by type if specified
        if (options?.type && metric.type !== options.type) {
          return false;
        }
        
        // Filter by date range if specified
        if (startDate || endDate) {
          const metricDate = new Date(metric.timestamp);
          
          if (startDate && metricDate < startDate) {
            return false;
          }
          
          if (endDate && metricDate > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return metrics;
  }
  
  async getAssessments(patientId: string, options?: {
    type?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Assessment[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const limit = options?.limit || 20;
    const startDate = options?.startDate ? new Date(options.startDate) : undefined;
    const endDate = options?.endDate ? new Date(options.endDate) : undefined;
    
    let assessments = Object.values(this.assessments)
      .filter(assessment => assessment.patientId === patientId)
      .filter(assessment => {
        // Filter by type if specified
        if (options?.type && assessment.type !== options.type) {
          return false;
        }
        
        // Filter by date range if specified
        if (startDate || endDate) {
          const assessmentDate = new Date(assessment.date);
          
          if (startDate && assessmentDate < startDate) {
            return false;
          }
          
          if (endDate && assessmentDate > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
    
    return assessments;
  }
  
  getMockAppointmentReports(filter: string = 'all'): AppointmentReport[] {
    // Return mock appointment reports based on filter
    // Simulate filtered data
    let filteredReports = Object.values(this.reports);
    
    if (filter !== 'all') {
      const statusMap: Record<string, string> = {
        'upcoming': 'scheduled',
        'completed': 'completed',
        'cancelled': 'cancelled'
      };
      
      const aptIds = Object.values(this.appointments)
        .filter(apt => apt.status === statusMap[filter])
        .map(apt => apt.id);
      
      filteredReports = filteredReports.filter(report => 
        aptIds.includes(report.appointmentId)
      );
    }
    
    return filteredReports;
  }
  
  // Implementation of getPatientDashboardData
  async getPatientDashboardData(patientId: string): Promise<{
    success: boolean;
    data: PatientDashboardData | null;
    error: string | null;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Get metrics for this patient
      const patientMetrics = Object.values(this.metrics)
        .filter(metric => metric.patientId === patientId);
      
      // Check if patient has any assessments
      const hasAssessments = Object.values(this.assessments)
        .some(assessment => assessment.patientId === patientId);
      
      // Get the latest assessment date
      const latestAssessment = Object.values(this.assessments)
        .filter(assessment => assessment.patientId === patientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      // Calculate average mood score from metrics
      const anxietyMetrics = patientMetrics.filter(m => m.type === 'anxiety');
      const stressMetrics = patientMetrics.filter(m => m.type === 'stress');
      const sleepMetrics = patientMetrics.filter(m => m.type === 'sleep_quality');
      
      const moodScore = anxietyMetrics.length > 0 
        ? 10 - (anxietyMetrics.reduce((sum, m) => sum + m.value, 0) / anxietyMetrics.length)
        : 7.5; // Default if no data
      
      const stressLevel = stressMetrics.length > 0
        ? stressMetrics.reduce((sum, m) => sum + m.value, 0) / stressMetrics.length / 10
        : 0.4; // Default if no data
      
      // Calculate streak (consecutive days with entries)
      // For mock purposes we'll use a simple random value
      const streak = Math.floor(Math.random() * 5) + 1;
      
      // Format the dashboard data
      const dashboardData: PatientDashboardData = {
        metrics: {
          moodScore,
          stressLevel,
          consistency: 0.7, // Example value
          lastCheckInStatus: hasAssessments ? "Completed" : "No check-ins yet",
          streak,
          firstCheckInDate: hasAssessments 
            ? "Jan 15, 2023" // Example date
            : "",
          lastCheckInTime: "10:30 AM", // Example time
          lastCheckInDate: new Date().toLocaleDateString('en-US', { 
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          lastAssessmentDate: latestAssessment 
            ? new Date(latestAssessment.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : "Not taken",
          hasAssessments
        },
        journalEntries: [
          {
            id: "journal-1",
            title: "Today's reflection",
            content: "I felt much calmer after my morning meditation...",
            mood: "Happy",
            created_at: new Date().toISOString()
          },
          {
            id: "journal-2",
            title: "Challenging work day",
            content: "Felt stressed during the team meeting but managed...",
            mood: "Anxious",
            created_at: new Date(Date.now() - 86400000 * 2).toISOString()
          }
        ],
        supportGroups: [
          {
            id: "group-1",
            name: "Anxiety Support",
            members: 12,
            nextMeeting: new Date(Date.now() + 86400000 * 3).toISOString()
          },
          {
            id: "group-2",
            name: "Mindfulness Practice",
            members: 8,
            nextMeeting: new Date(Date.now() + 86400000 * 5).toISOString()
          }
        ]
      };
      
      return {
        success: true,
        data: dashboardData,
        error: null
      };
    } catch (error) {
      console.error("Error getting patient dashboard data:", error);
      return {
        success: false,
        data: null,
        error: "Failed to fetch dashboard data"
      };
    }
  }
  
  // Implementation of saveAssessment
  async saveAssessment(assessment: Omit<Assessment, 'id'>): Promise<Assessment> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const id = `assessment-${Math.random().toString(36).substring(2, 15)}`;
    
    const newAssessment: Assessment = {
      id,
      ...assessment
    };
    
    // Save to mock storage
    this.assessments[id] = newAssessment;
    
    return newAssessment;
  }
  
  // Implementation of updateMetrics
  async updateMetrics(patientId: string, metricsUpdate: UserMetricsUpdate): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      // For simplicity, create new metric entries for each field
      const now = new Date().toISOString();
      
      if (metricsUpdate.stressLevel !== undefined) {
        const id = `metric-stress-${now}`;
        this.metrics[id] = {
          id,
          patientId,
          type: 'stress',
          value: metricsUpdate.stressLevel * 10, // Convert 0-1 scale to 0-10
          timestamp: now
        };
      }
      
      if (metricsUpdate.moodScore !== undefined) {
        const id = `metric-mood-${now}`;
        this.metrics[id] = {
          id,
          patientId,
          type: 'mood',
          value: metricsUpdate.moodScore,
          timestamp: now
        };
      }
      
      // Add other metric updates as needed
      
      return true;
    } catch (error) {
      console.error("Error updating metrics:", error);
      return false;
    }
  }
}

// Export a singleton instance
export const patientService: IPatientService = new MockPatientService(); 