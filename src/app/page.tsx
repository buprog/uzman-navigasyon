import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { init?: string };
}) {
  const user = await getSessionUser();

  // If init flag is present but no user, show error (loop guard)
  if (!user && searchParams.init) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 [html[data-mode='night']_&]:bg-slate-900">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-900 [html[data-mode='night']_&]:text-slate-100">Oturum başlatılamadı</h1>
          <p className="mt-2 text-sm text-slate-600 [html[data-mode='night']_&]:text-slate-300">
            Demo oturumu oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin veya{" "}
            <Link href="/kayit" className="text-teal-700 underline">
              kayıt olun
            </Link>.
          </p>
          <Link href="/" className="btn-primary mt-4 inline-block">
            Tekrar dene
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/api/auth/init");
  }

  const sampleTour = await prisma.tour.findFirst({
    where: {
      userId: user.id,
      isSample: true,
    },
    select: { id: true },
  });

  if (sampleTour) {
    redirect(`/planlayici/${sampleTour.id}`);
  }

  redirect("/turlar");
}
