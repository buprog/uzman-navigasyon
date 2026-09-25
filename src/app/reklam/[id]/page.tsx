import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";

type Props = {
  params: { id: string };
};

export default async function AdDetailPage({ params }: Props) {
  const { id } = params;

  const ad = await prisma.ad.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      text: true,
      imageUrl: true,
      detailContent: true,
      active: true,
    },
  });

  if (!ad || !ad.active) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-teal-700 hover:text-teal-900 mb-4"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Geri dön
        </Link>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="relative w-full h-64 bg-slate-100">
            <Image
              src={ad.imageUrl}
              alt={ad.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="p-6">
            <div className="mb-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Reklam
              </span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              {ad.title}
            </h1>

            <p className="text-lg text-slate-600 mb-6">
              {ad.text}
            </p>

            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {ad.detailContent}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Bu bir reklam içeriğidir. Daha fazla bilgi için lütfen iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
