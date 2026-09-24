import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { getAdminLoginUrl } from "@/lib/adminPath";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function InternalAdminPage() {
  const adminEmail = await getAdminSession();
  
  if (!adminEmail) {
    const loginUrl = getAdminLoginUrl();
    if (loginUrl) {
      redirect(loginUrl);
    } else {
      redirect('/');
    }
  }

  return <AdminDashboard adminEmail={adminEmail} />;
}
