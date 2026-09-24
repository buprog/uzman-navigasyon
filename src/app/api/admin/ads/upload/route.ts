import { NextResponse } from "next/server";
import { requireAdmin, logAdminAccess } from "@/lib/adminAuth";

async function uploadToBlob(filename: string, file: File, token: string) {
  // Use eval to prevent webpack from analyzing this import
  const importPath = "@vercel/blob";
  const blobModule = await Function(`return import("${importPath}")`)().catch(() => null);
  
  if (!blobModule) {
    throw new Error("@vercel/blob not installed");
  }

  const { put } = blobModule;
  const blob = await put(filename, file, {
    access: "public",
    token,
  });

  return blob.url;
}

export async function POST(req: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage yapılandırılmamış (BLOB_READ_WRITE_TOKEN eksik)" },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Sadece görsel dosyaları yüklenebilir" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Dosya boyutu çok büyük (max 5MB)" }, { status: 400 });
    }

    // Use Vercel Blob for uploads
    let blobUrl: string;
    try {
      blobUrl = await uploadToBlob(file.name, file, process.env.BLOB_READ_WRITE_TOKEN!);
    } catch (uploadError: any) {
      console.error("[blob upload error]", uploadError);
      if (uploadError.message?.includes("not installed")) {
        return NextResponse.json(
          { error: "@vercel/blob paketi yüklenmemiş. npm install @vercel/blob" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Blob upload başarısız: " + uploadError.message },
        { status: 500 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logAdminAccess(adminEmail, ip, "upload_ad_image", undefined, `Uploaded: ${file.name}`);

    return NextResponse.json({ url: blobUrl });
  } catch (e) {
    console.error("[admin/ads/upload]", e);
    return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
  }
}
