import DashboardLayout from "../components/DashboardLayout";
import { SharedMessagesPage } from "@/components/messaging/SharedMessagesPage";

export default function MessagesPage() {
  return (
    <DashboardLayout>
      <SharedMessagesPage userRole="patient" />
    </DashboardLayout>
  );
} 


