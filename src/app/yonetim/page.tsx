import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function YonetimPage() {
  const adminEmail = await getAdminSession();
  
  if (!adminEmail) {
    redirect("/yonetim/giris");
  }

  return <AdminDashboard adminEmail={adminEmail} />;
}
