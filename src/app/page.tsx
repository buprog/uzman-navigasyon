import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const user = await getSessionUser();

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
