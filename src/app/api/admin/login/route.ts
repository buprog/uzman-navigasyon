import { NextResponse } from "next/server";
import { isAdminEnabled, verifyAdminCredentials, createAdminSession, logAdminAccess } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin paneli aktif değil. ADMIN_EMAIL ve ADMIN_PASSWORD env vars ayarlayın." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve şifre gerekli." },
        { status: 400 }
      );
    }

    const isValid = await verifyAdminCredentials(email, password);
    if (!isValid) {
      // Log failed attempt
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      await logAdminAccess(email, ip, "login_failed", undefined, "Invalid credentials");
      
      return NextResponse.json(
        { error: "Geçersiz e-posta veya şifre." },
        { status: 401 }
      );
    }

    await createAdminSession(email);

    // Log successful login
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAdminAccess(email, ip, "login_success");

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/login]", e);
    return NextResponse.json(
      { error: "Giriş işlemi başarısız." },
      { status: 500 }
    );
  }
}
