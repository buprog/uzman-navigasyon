export default function KVKKPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">KVKK Aydınlatma Metni</h1>
      
      <div className="prose prose-slate max-w-none">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Veri Sorumlusu</h2>
          <p className="text-slate-700">
            <strong>[ŞİRKET ADI PLACEHOLDER]</strong><br />
            Adres: [ADRES PLACEHOLDER]<br />
            İletişim: [E-POSTA PLACEHOLDER]
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. İşlenen Kişisel Veriler</h2>
          <p className="text-slate-700 mb-2">
            Uzman Navigasyon uygulaması, abonelik ve ödeme yönetimi amacıyla aşağıdaki kişisel verileri işlemektedir:
          </p>
          <ul className="list-disc pl-6 text-slate-700">
            <li><strong>E-posta adresi</strong>: Hesap oluşturma, doğrulama ve iletişim</li>
            <li><strong>Ad-soyad</strong>: Hesap kimliği</li>
            <li><strong>Şirket adı</strong> (opsiyonel): İşletme kullanıcıları için</li>
            <li><strong>Anonim cihaz kimliği</strong>: İlk yolculuk deneme süresi takibi (localStorage + cookie)</li>
            <li><strong>Tarayıcı parmak izi özeti (hash)</strong>: Yedek cihaz tanıma (sadece özet saklanır, ham sinyal yok)</li>
            <li><strong>Abonelik/ödeme kayıtları</strong>: Premium durum, kampanya kullanımı, ödeme tarihi ve tutarı (test ödemesi)</li>
          </ul>
          <p className="text-slate-700 mt-3">
            <strong>İşlenmeyenler</strong>: IMEI, telefon numarası, kesin konum verisi (sunucuda saklanmaz).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. İşleme Amaçları</h2>
          <ul className="list-disc pl-6 text-slate-700">
            <li>Kullanıcı hesabı oluşturma ve kimlik doğrulama</li>
            <li>Premium abonelik yönetimi ve ödeme işleme</li>
            <li>İlk yolculuk deneme süresi takibi (cihaz bazlı, anonim)</li>
            <li>Kampanya uygunluğu kontrolü (e-posta bazlı, 15 günlük pencere)</li>
            <li>Müşteri destek ve iletişim</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Hukuki Dayanak</h2>
          <p className="text-slate-700">
            Kişisel verileriniz, <strong>açık rızanız</strong> (KVKK m.5/1) ve <strong>sözleşmenin ifası</strong> (KVKK m.5/2-c) hukuki dayanakları ile işlenmektedir.
            Kayıt ve ödeme ekranlarında açık rıza onayı alınmaktadır.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Saklama Süresi</h2>
          <ul className="list-disc pl-6 text-slate-700">
            <li><strong>Hesap verileri</strong>: Hesap aktif olduğu sürece</li>
            <li><strong>Abonelik/ödeme kayıtları</strong>: Vergi mevzuatı gereği 10 yıl (anonimleştirilmiş)</li>
            <li><strong>Anonim cihaz kimliği</strong>: Deneme süresi bitene kadar (localStorage, kullanıcı tarafından silinebilir)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. KVKK Madde 11 Kapsamında Haklarınız</h2>
          <p className="text-slate-700 mb-2">Kişisel verilerinize ilişkin:</p>
          <ul className="list-disc pl-6 text-slate-700">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
            <li><strong>Silme veya yok edilmesini isteme</strong> ("Hesabımı ve verilerimi sil" seçeneği)</li>
            <li>Düzeltme, silme ve yok edilme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
            <li>Münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonuç çıkmasına itiraz etme</li>
            <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Veri Silme ve Anonimleştirme</h2>
          <p className="text-slate-700 mb-2">
            Hesabınızı ve kişisel verilerinizi silmek için:
          </p>
          <ul className="list-disc pl-6 text-slate-700">
            <li>Sağ üst köşedeki profil menüsünden <strong>"Hesabımı ve verilerimi sil"</strong> seçeneğini kullanabilirsiniz</li>
            <li>Silme işlemi sonrası: E-posta, ad-soyad, şirket adı ve oturumlarınız kalıcı olarak silinir</li>
            <li>Abonelik/ödeme kayıtları anonimleştirilir (kimlik bilgileri geri döndürülemez hash ile değiştirilir)</li>
            <li>Anonim cihaz kimliği tarayıcınızın localStorage'ında kalır (tarayıcı verileri temizleyerek silebilirsiniz)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">8. Misafir Modu (Silent Demo)</h2>
          <p className="text-slate-700">
            Uygulama, hesap oluşturmadan "Misafir" olarak kullanılabilir. Bu modda:
          </p>
          <ul className="list-disc pl-6 text-slate-700">
            <li>Sadece anonim cihaz kimliği (localStorage + cookie) kullanılır</li>
            <li>E-posta, ad-soyad gibi kişisel veriler toplanmaz</li>
            <li>İlk yolculuk deneme süresi için gerekli olan anonim takip yapılır</li>
            <li>Bu mod için ayrıca rıza gerektirmez (anonim, kişisel veri yok)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">9. İletişim</h2>
          <p className="text-slate-700">
            KVKK haklarınızı kullanmak veya sorularınız için:<br />
            <strong>E-posta</strong>: [İLETİŞİM E-POSTA PLACEHOLDER]<br />
            <strong>Adres</strong>: [ADRES PLACEHOLDER]
          </p>
          <p className="text-slate-700 mt-3">
            Başvurularınız, kimlik tespiti sonrası 30 gün içinde ücretsiz olarak yanıtlanacaktır.
          </p>
        </section>

        <section className="mb-8">
          <p className="text-sm text-slate-500">
            <strong>Son güncelleme</strong>: 24 Eylül 2026<br />
            <strong>Metin versiyonu</strong>: v1.0
          </p>
        </section>
      </div>
    </div>
  );
}
