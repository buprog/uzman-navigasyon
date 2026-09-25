import { redirect } from "next/navigation";
import { isGoogleOAuthConfigured } from "@/lib/googleOAuth";
import { GoogleSignInButton } from "@/components/admin/GoogleSignInButton";

export const metadata = {
  title: "Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ConsoleSignInPage() {
  const isConfigured = isGoogleOAuthConfigured();

  if (!isConfigured) {
    return (
      <div className="min-h-[calc(100vh-57px)] bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">
              Console
            </h1>
            <div className="rounded-lg bg-slate-100 p-4 text-center">
              <p className="text-sm text-slate-600">Giriş yapılandırılmamış</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            🔐 Admin Girişi
          </h1>

          <GoogleSignInButton />

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Admin paneli sadece yetkili personel içindir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
