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

  // Remove previous sample for idempotent seed
  await prisma.tour.deleteMany({ where: { userId: user.id, isSample: true } });

  const tour = await prisma.tour.create({
    data: {
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

  const departure = await prisma.departure.create({
    data: {
      tourId: tour.id,
      date: "2026-05-10",
      capacity: 16,
      bookedCount: 0,
      status: "yayin",
      shareCode: nanoid(),
      note: "Örnek yayınlı kalkış",
    },
  });

  console.log("Seed OK");
  console.log("  Demo user: operator@demo.com / demo1234 (Basic)");
  console.log("  Sample tour:", tour.name, tour.id);
  console.log("  Public link: /p/" + departure.shareCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
