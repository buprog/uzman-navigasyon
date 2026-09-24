import { redirect } from "next/navigation";
import { createDemoSession, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LandingPage() {
  let user = await getSessionUser();
  
  if (!user) {
    user = await createDemoSession();
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
