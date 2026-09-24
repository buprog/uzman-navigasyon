"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_CONFIG, processTestPayment } from "@/lib/paymentConfig";
import { completeTrialWithPayment, completeTrialWithoutPayment } from "@/lib/trial";
import { getDeviceIdentity } from "@/lib/deviceIdentity";

type Props = {
  onClose: () => void;
  onPaymentComplete: () => void;
};

export function PaymentModal({ onClose, onPaymentComplete }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"auth" | "verify" | "payment">("auth");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [campaignEligible, setCampaignEligible] = useState(false);
  const [campaignDaysLeft, setCampaignDaysLeft] = useState(0);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  
  useEffect(() => {
    async function checkDevice() {
      const identity = await getDeviceIdentity();
      setDeviceId(identity.deviceId);
      
      // Check campaign eligibility
      const res = await fetch("/api/device/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      });
      
      if (res.ok) {
        const data = await res.json();
        setCampaignEligible(data.device.campaignEligible);
      }
    }
    checkDevice();
  }, []);

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const fd = new FormData(e.currentTarget);
    const endpoint = authMode === "signup" ? "/api/auth/register" : "/api/auth/login";
    const body: any = {
      email: fd.get("email"),
      password: fd.get("password"),
    };
    
    if (authMode === "signup") {
      body.name = fd.get("name");
      body.companyName = fd.get("companyName");
      body.gender = fd.get("gender");
      body.consentGiven = consentGiven;
    }
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    
    if (!res.ok) {
      setError(data.error || (authMode === "signup" ? "Kayıt başarısız" : "Giriş başarısız"));
      return;
    }
    
    setUserId(data.id);
    setUserEmail(data.email);
    
    // For signup, go to verification step
    if (authMode === "signup") {
      await sendVerificationCode(data.email);
      setStep("verify");
    } else {
      // For login, go straight to payment
      await checkCampaign(data.email);
      setStep("payment");
    }
  }
  
  async function sendVerificationCode(email: string) {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      setLoading(false);
      
      if (!res.ok) {
        setError(data.error || "Kod gönderilemedi");
        return false;
      }
      
      setCodeSent(true);
      return true;
    } catch (err) {
      setError("Kod gönderilemedi");
      setLoading(false);
      return false;
    }
  }
  
  async function verifyCode() {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("6 haneli kodu girin");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/verify-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, code: verificationCode }),
      });
      
      const data = await res.json();
      setLoading(false);
      
      if (!res.ok) {
        setError(data.error || "Doğrulama başarısız");
        return;
      }
      
      // Get campaign info
      if (data.emailIdentity) {
        setCampaignEligible(data.emailIdentity.campaignEligible);
        setCampaignDaysLeft(data.emailIdentity.campaignDaysLeft || 0);
      }
      
      setStep("payment");
    } catch (err) {
      setError("Doğrulama başarısız");
      setLoading(false);
    }
  }
  
  async function checkCampaign(email: string) {
    try {
      // For logged-in users, check campaign directly
      const res = await fetch("/api/auth/verify-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: "000000" }), // dummy code for checking only
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.emailIdentity) {
          setCampaignEligible(data.emailIdentity.campaignEligible);
          setCampaignDaysLeft(data.emailIdentity.campaignDaysLeft || 0);
        }
      }
    } catch (err) {
      // Ignore errors, just use normal price
    }
  }

  async function handlePayment() {
    setLoading(true);
    setError("");
    
    try {
      const result = await processTestPayment({
        userId,
        plan: "yearly",
        email: userEmail,
      });
      
      if (!result.success) {
        setError(result.message);
        setLoading(false);
        return;
      }
      
      // Link email to user and activate premium
      const purchaseRes = await fetch("/api/email/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usedCampaign: campaignEligible,
        }),
      });
      
      if (!purchaseRes.ok) {
        setError("Premium aktivasyonu başarısız");
        setLoading(false);
        return;
      }
      
      // Mark trial as completed with payment
      completeTrialWithPayment();
      setLoading(false);
      onPaymentComplete();
      router.refresh();
    } catch (err) {
      setError("Ödeme işlemi başarısız");
      setLoading(false);
    }
  }

  function handleSkip() {
    completeTrialWithoutPayment();
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-2xl">
        {step === "auth" ? (
          <div className="p-6">
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-900">
                🎉 Deneme süreniz bitti! Premium özelliklere devam etmek için hesap oluşturun ve ödeme yapın.
              </p>
            </div>
            
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => { setAuthMode("signup"); setError(""); }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  authMode === "signup"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Yeni Hesap
              </button>
              <button
                onClick={() => { setAuthMode("login"); setError(""); }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  authMode === "login"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Giriş Yap
              </button>
            </div>

            <h2 className="text-xl font-bold mb-2">
              {authMode === "signup" ? "Hesap oluştur" : "Giriş yap"}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              {authMode === "signup"
                ? "Premium'a geçmek için önce hesap oluşturun."
                : "Mevcut hesabınızla giriş yapın."}
            </p>

            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === "signup" && (
                <div>
                  <label className="label">Ad soyad</label>
                  <input name="name" required className="input" />
                </div>
              )}
              <div>
                <label className="label">E-posta</label>
                <input name="email" type="email" required className="input" />
              </div>
              <div>
                <label className="label">Şifre {authMode === "signup" && "(min. 6)"}</label>
                <input
                  name="password"
                  type="password"
                  minLength={authMode === "signup" ? 6 : undefined}
                  required
                  className="input"
                />
              </div>
              {authMode === "signup" && (
                <>
                  <div>
                    <label className="label">Şirket adı (opsiyonel)</label>
                    <input name="companyName" className="input" />
                  </div>
                  <div>
                    <label className="label">Cinsiyet</label>
                    <select name="gender" defaultValue="UNSPECIFIED" className="input">
                      <option value="UNSPECIFIED">Belirtmek istemiyorum</option>
                      <option value="MALE">Erkek</option>
                      <option value="FEMALE">Kadın</option>
                    </select>
                  </div>
                </>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              
              {authMode === "signup" && (
                <>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        required
                        className="mt-0.5 w-4 h-4 text-teal-700 rounded focus:ring-teal-500"
                      />
                      <span className="text-[11px] text-slate-700">
                        Cihaz kimliğim, e-posta adresim ve (belirttiysem) cinsiyet bilgimin abonelik yönetimi ve hizmet kişiselleştirme amacıyla işlenmesine açık rıza veriyorum.{" "}
                        <a href="/kvkk" target="_blank" className="text-teal-700 underline font-semibold">
                          KVKK Aydınlatma Metni
                        </a>
                      </span>
                    </label>
                  </div>
                  
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                    <p className="text-[10px] text-slate-600">
                      🔒 Kampanya ve abonelik hakkını korumak için cihazınıza özel anonim bir tanımlayıcı kullanıyoruz.{" "}
                      <a href="/privacy" className="text-teal-700 underline">
                        Gizlilik
                      </a>
                    </p>
                  </div>
                </>
              )}
              
              <button type="submit" disabled={loading || (authMode === "signup" && !consentGiven)} className="btn-primary w-full">
                {loading
                  ? "İşleniyor…"
                  : (authMode === "signup" ? "Hesap oluştur ve devam et →" : "Giriş yap ve devam et →")}
              </button>
            </form>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={handleSkip}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition"
              >
                Şimdi değil
              </button>
            </div>
          </div>
        ) : step === "verify" ? (
          <div className="p-6">
            <div className="mb-4 rounded-lg bg-teal-50 border border-teal-200 p-3">
              <p className="text-sm text-teal-900">
                ✅ Hesap oluşturuldu! Şimdi e-postanızı doğrulayın.
              </p>
            </div>
            
            <h2 className="text-xl font-bold mb-2">E-posta Doğrulama</h2>
            <p className="text-sm text-slate-600 mb-4">
              <strong>{userEmail}</strong> adresine 6 haneli bir kod gönderdik.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="label">Doğrulama Kodu (6 hane)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setVerificationCode(val);
                  }}
                  className="input text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>
              
              {error && <p className="text-sm text-red-600">{error}</p>}
              
              <button
                onClick={verifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="btn-primary w-full"
              >
                {loading ? "Doğrulanıyor…" : "Doğrula ve Devam Et"}
              </button>
              
              <div className="text-center">
                <button
                  onClick={() => sendVerificationCode(userEmail)}
                  disabled={loading}
                  className="text-sm text-teal-700 hover:text-teal-900 disabled:opacity-50"
                >
                  Kodu tekrar gönder
                </button>
              </div>
              
              <button
                onClick={handleSkip}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition"
              >
                Şimdi değil
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-4 rounded-lg bg-teal-50 border border-teal-200 p-3">
              <p className="text-sm text-teal-900">
                ✅ Giriş başarılı! Şimdi Premium planınızı seçin.
              </p>
            </div>
            
            <h2 className="text-xl font-bold mb-2">Premium Paketi</h2>
            <p className="text-sm text-slate-600 mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                Yıllık / Senelik
              </span>
            </p>
            
            <div className="mb-6 rounded-lg border-2 border-teal-600 bg-teal-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">{PAYMENT_CONFIG.yearly.period}</span>
                {campaignEligible && (
                  <span className="badge-premium !text-[10px]">
                    {PAYMENT_CONFIG.yearly.campaignBadge}
                  </span>
                )}
              </div>
              
              {campaignEligible ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-teal-700">
                      ₺{PAYMENT_CONFIG.yearly.campaignPrice.toFixed(2)}
                    </p>
                    <p className="text-lg text-slate-500 line-through">
                      ₺{PAYMENT_CONFIG.yearly.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-teal-700 font-semibold mt-1">
                    Kampanya: {campaignDaysLeft} gün kaldı!
                  </p>
                </div>
              ) : (
                <p className="text-3xl font-bold text-teal-700">
                  ₺{PAYMENT_CONFIG.yearly.price.toFixed(2)}
                </p>
              )}
              
              <p className="text-xs text-slate-600 mt-2">
                {PAYMENT_CONFIG.yearly.periodDescription}
              </p>
              
              <ul className="mt-3 space-y-1 text-xs text-slate-700">
                <li>✓ Sınırsız tur ve kalkış</li>
                <li>✓ Sınırsız rezervasyon</li>
                <li>✓ Otel, restoran, servis bulma</li>
                <li>✓ Çevredeki aktiviteler</li>
                <li>✓ Premium rozeti</li>
              </ul>
            </div>
            
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-3">
              <p className="text-xs text-amber-900">
                ⚠️ <strong>Test ödemesi</strong> - Gerçek ücret alınmaz. Üretim ortamında gerçek ödeme sağlayıcısı (iyzico/Stripe) entegre edilecek.
              </p>
            </div>
            
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-4">
              <p className="text-[10px] text-slate-600">
                🔒 <strong>Gizlilik:</strong> Kampanya ve abonelik hakkını korumak için cihazınıza özel anonim bir tanımlayıcı kullanıyoruz.{" "}
                <a href="/privacy" className="text-teal-700 underline">
                  Daha fazla bilgi
                </a>
              </p>
            </div>
            
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            
            <button
              onClick={handlePayment}
              disabled={loading}
              className="btn-primary w-full mb-3"
            >
              {loading ? "İşleniyor…" : campaignEligible 
                ? `₺${PAYMENT_CONFIG.yearly.campaignPrice.toFixed(0)} ile Premium'a geç (Test)`
                : `₺${PAYMENT_CONFIG.yearly.price.toFixed(0)} ile Premium'a geç (Test)`
              }
            </button>
            
            <button
              onClick={handleSkip}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Vazgeç
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
