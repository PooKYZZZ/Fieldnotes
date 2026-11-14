import { DashboardHome } from "@/features/dashboard/dashboard-home";
import { getDashboardContent } from "@/features/dashboard/content.server";

export default function DashboardPage() {
  return <DashboardHome {...getDashboardContent()} />;
}
