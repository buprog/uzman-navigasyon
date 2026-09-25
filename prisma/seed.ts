import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

async function main() {
  const email = "operator@demo.com";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: "Demo Operatör",
      companyName: "Anadolu Turizm",
      plan: "basic",
      authProvider: "credentials",
      // Demo araç profili — planlayıcı yakıt tahmini için
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      fuelType: "hibrit",
      consumptionPer100: 4.5,
      bloodType: "A Rh+",
      emergencyPhone: "+90 555 111 22 33",
      preferTolls: true,
      odometerKm: 78500,
      tireTreadMm: 4.2,
    },
    create: {
      email,
      name: "Demo Operatör",
      companyName: "Anadolu Turizm",
      plan: "basic",
      authProvider: "credentials",
      passwordHash,
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      fuelType: "hibrit",
      consumptionPer100: 4.5,
      bloodType: "A Rh+",
      emergencyPhone: "+90 555 111 22 33",
      preferTolls: true,
      odometerKm: 78500,
      tireTreadMm: 4.2,
    },
  });

  // Upsert sample tour by stable ID (idempotent, non-destructive)
  // Use the existing sample tour ID to preserve it
  const sampleTourId = "cmug065rz0002116zh16juh3l";
  
  const tour = await prisma.tour.upsert({
    where: { id: sampleTourId },
    update: {
      name: "Kapadokya Keşif Turu",
      description:
        "3 günlük Kapadokya programı: Göreme, Uçhisar, Derinkuyu ve peri bacaları. Örnek seed turu.",
      startName: "Nevşehir",
      endName: "Göreme",
      startDate: "2026-05-10",
      endDate: "2026-05-12",
      dayCount: 3,
      isSample: true,
    },
    create: {
      id: sampleTourId,
      userId: user.id,
      name: "Kapadokya Keşif Turu",
      description:
        "3 günlük Kapadokya programı: Göreme, Uçhisar, Derinkuyu ve peri bacaları. Örnek seed turu.",
      startName: "Nevşehir",
      endName: "Göreme",
      startDate: "2026-05-10",
      endDate: "2026-05-12",
      dayCount: 3,
      isSample: true,
      stops: {
        create: [
          {
            dayIndex: 0,
            order: 0,
            type: "gezi",
            name: "Göreme Açık Hava Müzesi",
            durationMin: 120,
            note: "Kayalara oyulmuş kiliseler",
            lat: 38.6431,
            lng: 34.8458,
            address: "Göreme, Nevşehir",
          },
          {
            dayIndex: 0,
            order: 1,
            type: "yemek",
            name: "Göreme Öğle Yemeği",
            durationMin: 60,
            note: "Yöresel mutfak",
            lat: 38.6435,
            lng: 34.8289,
            address: "Göreme merkez",
          },
          {
            dayIndex: 0,
            order: 2,
            type: "konaklama",
            name: "Göreme Cave Hotel",
            durationMin: 0,
            note: "Check-in",
            lat: 38.645,
            lng: 34.83,
            address: "Göreme",
          },
          {
            dayIndex: 1,
            order: 0,
            type: "gezi",
            name: "Uçhisar Kalesi",
            durationMin: 90,
            note: "Panorama",
            lat: 38.6311,
            lng: 34.805,
            address: "Uçhisar",
          },
          {
            dayIndex: 1,
            order: 1,
            type: "gezi",
            name: "Paşabağ (Peri Bacaları)",
            durationMin: 75,
            note: "Mantarla peri bacaları",
            lat: 38.6706,
            lng: 34.8519,
            address: "Paşabağ",
          },
          {
            dayIndex: 1,
            order: 2,
            type: "konaklama",
            name: "Göreme Cave Hotel",
            durationMin: 0,
            note: "2. gece",
            lat: 38.645,
            lng: 34.83,
            address: "Göreme",
          },
          {
            dayIndex: 2,
            order: 0,
            type: "gezi",
            name: "Derinkuyu Yeraltı Şehri",
            durationMin: 100,
            note: "Çok katlı yeraltı yerleşimi",
            lat: 38.3735,
            lng: 34.735,
            address: "Derinkuyu",
          },
          {
            dayIndex: 2,
            order: 1,
            type: "gecis",
            name: "Nevşehir Dönüş",
            durationMin: 45,
            note: "Transfer",
            lat: 38.6244,
            lng: 34.7239,
            address: "Nevşehir",
          },
        ],
      },
    },
  });

  // Upsert sample departure (idempotent, preserve share code)
  const sampleDepartureId = "sample-departure-kapadokya";
  const sampleShareCode = "5d5e0rljyk"; // Fixed share code for sample tour
  
  const departure = await prisma.departure.upsert({
    where: { id: sampleDepartureId },
    update: {
      date: "2026-05-10",
      capacity: 16,
      bookedCount: 0,
      status: "yayin",
      note: "Örnek yayınlı kalkış",
    },
    create: {
      id: sampleDepartureId,
      tourId: tour.id,
      date: "2026-05-10",
      capacity: 16,
      bookedCount: 0,
      status: "yayin",
      shareCode: sampleShareCode,
      note: "Örnek yayınlı kalkış",
    },
  });

  // Idempotent placeholder ads
  const placeholderAds = [
    {
      title: "Kapadokya Balon Turu",
      text: "Gün doğumunda unutulmaz bir deneyim",
      imageUrl: "/ads/balon.svg",
      detailContent: "Kapadokya'nın eşsiz manzarasını sıcak hava balonuyla keşfedin. Gün doğumunda başlayan turumuz, peri bacaları üzerinde unutulmaz anlar yaşatır. Profesyonel pilotlar eşliğinde güvenli uçuş. Kahvaltı dahil.",
      targetGender: "ALL",
      sortOrder: 1,
    },
    {
      title: "Karadeniz Yayla Rotası",
      text: "Yeşilin her tonunu keşfedin",
      imageUrl: "/ads/yayla.svg",
      detailContent: "Karadeniz'in büyüleyici yaylalarını rehberli turlarımızla keşfedin. Ayder, Pokut, Şenyuva ve daha fazlası. Yerel rehberler eşliğinde doğa yürüyüşü, fotoğraf turları ve yayla kültürü deneyimi.",
      targetGender: "ALL",
      sortOrder: 2,
    },
    {
      title: "Rehberli Müze Turu",
      text: "Tarihi uzmanlardan dinleyin",
      imageUrl: "/ads/muze.svg",
      detailContent: "Türkiye'nin en önemli müzelerini uzman rehberler eşliğinde gezin. Topkapı Sarayı, Ayasofya, Efes Antik Kenti ve daha fazlası. Grup ve özel tur seçenekleri mevcut.",
      targetGender: "ALL",
      sortOrder: 3,
    },
    {
      title: "Macera: Rafting Rotası",
      text: "Adrenalin dolu bir gün sizi bekliyor",
      imageUrl: "/ads/rafting.svg",
      detailContent: "Köprülü Kanyon'da profesyonel ekipman ve deneyimli rehberlerle rafting macerası. Tüm güvenlik ekipmanı dahil. Başlangıç ve ileri seviye gruplar için uygun rotalar.",
      targetGender: "ALL",
      sortOrder: 4,
    },
  ];

  for (const ad of placeholderAds) {
    await prisma.ad.upsert({
      where: { 
        id: `placeholder-${ad.sortOrder}` // stable ID for idempotent seed
      },
      update: ad,
      create: {
        id: `placeholder-${ad.sortOrder}`,
        ...ad,
      },
    });
  }

  // Default ad settings
  await prisma.adSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      rotationInterval: 5, // 5 seconds
      rotationMode: "sıralı", // sequential by sort order
    },
  });

  console.log("Seed OK");
  console.log("  Demo user: operator@demo.com / demo1234 (Basic)");
  console.log("  Sample tour:", tour.name, tour.id);
  console.log("  Public link: /p/" + departure.shareCode);
  console.log("  Placeholder ads:", placeholderAds.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
