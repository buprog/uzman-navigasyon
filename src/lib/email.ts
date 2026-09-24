/**
 * Email sending abstraction with Resend
 * Graceful fallback if RESEND_API_KEY not configured
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  // If Resend not configured, handle gracefully
  if (!RESEND_API_KEY) {
    if (IS_PRODUCTION) {
      console.error("[email] RESEND_API_KEY not configured in production");
      return {
        success: false,
        error: "E-posta doğrulama şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      };
    } else {
      // Development: log to console
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📧 EMAIL VERIFICATION CODE (Development)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`To: ${to}`);
      console.log(`Code: ${code}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return { success: true };
    }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject: "Uzman Navigasyon - Doğrulama Kodu",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f766e;">Uzman Navigasyon</h2>
            <p>Doğrulama kodunuz:</p>
            <div style="background: #f0fdfa; border: 2px solid #0f766e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #0f766e; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
            </div>
            <p style="color: #64748b; font-size: 14px;">Bu kod 10 dakika geçerlidir.</p>
            <p style="color: #64748b; font-size: 14px;">Bu kodu kimseyle paylaşmayın.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[email] Resend API error:", error);
      return {
        success: false,
        error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[email] Send error:", error);
    return {
      success: false,
      error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.",
    };
  }
}
