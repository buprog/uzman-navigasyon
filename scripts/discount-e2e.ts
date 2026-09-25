#!/usr/bin/env -S npx tsx

/**
 * Discount Code E2E Test Script
 * 
 * Usage: npx tsx scripts/discount-e2e.ts
 * Requires: DATABASE_URL environment variable
 * 
 * This script:
 * 1. Creates a test discount code
 * 2. Redeems it via the live API for deviceId 'test-device-grokbot'
 * 3. Verifies the redemption
 * 4. Cleans up: deletes the code, redemption, and device identity (if created)
 */

const { PrismaClient } = require("@prisma/client");
const nodeCrypto = require("node:crypto");

const TEST_DEVICE_ID = "test-device-grokbot";
const TEST_CODE_PREFIX = "E2ETEST";
const DEFAULT_BASE_URL = "https://uzman-navigasyon.vercel.app";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  console.log("🧪 Discount Code E2E Test\n");

  // Track if we created the device
  let createdDevice = false;

  try {
    // Check if device already exists
    const existingDevice = await prisma.deviceIdentity.findUnique({
      where: { deviceId: TEST_DEVICE_ID },
    });

    // Step 1: Create a test code
    console.log("1️⃣ Creating test discount code...");
    const testCode = `${TEST_CODE_PREFIX}-${nodeCrypto.randomInt(100000, 999999)}`;
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const discountCode = await prisma.discountCode.create({
      data: {
        code: testCode,
        type: "PREMIUM_DAYS",
        premiumDays: 7,
        startsAt: now,
        endsAt: tomorrow,
        maxUses: 1,
        note: "E2E test code",
      },
    });

    console.log(`✅ Created code: ${testCode} (id: ${discountCode.id})`);

    // Step 2: Redeem via live API
    console.log("\n2️⃣ Redeeming code via API...");
    const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
    const apiUrl = `${baseUrl}/api/discount/redeem`;

    const redeemResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: testCode,
        deviceId: TEST_DEVICE_ID,
        platform: "web",
      }),
    });

    const redeemData = await redeemResponse.json();

    if (!redeemData.ok) {
      throw new Error(`Redemption failed: ${redeemData.message}`);
    }

    console.log(`✅ Code redeemed successfully!`);
    console.log(`   Type: ${redeemData.type}`);
    console.log(`   Premium Days: ${redeemData.premiumDays}`);
    console.log(`   Premium Until: ${redeemData.premiumUntil}`);

    // Mark that we may have created the device
    if (!existingDevice) {
      createdDevice = true;
    }

    // Step 3: Verify redemption in database
    console.log("\n3️⃣ Verifying redemption...");
    const redemption = await prisma.discountRedemption.findFirst({
      where: {
        codeId: discountCode.id,
        deviceId: TEST_DEVICE_ID,
      },
    });

    if (!redemption) {
      throw new Error("Redemption not found in database");
    }

    const device = await prisma.deviceIdentity.findUnique({
      where: { deviceId: TEST_DEVICE_ID },
    });

    if (!device || !device.premiumExpiresAt) {
      throw new Error("Device premium not set");
    }

    console.log(`✅ Redemption verified`);
    console.log(`   Device premium expires at: ${device.premiumExpiresAt}`);

    // Step 4: Cleanup
    console.log("\n4️⃣ Cleaning up...");

    // Delete redemption
    await prisma.discountRedemption.deleteMany({
      where: {
        codeId: discountCode.id,
      },
    });
    console.log(`✅ Deleted redemption`);

    // Delete code
    await prisma.discountCode.delete({
      where: { id: discountCode.id },
    });
    console.log(`✅ Deleted code`);

    // Delete device identity if we created it
    if (createdDevice && device) {
      await prisma.deviceIdentity.delete({
        where: { id: device.id },
      });
      console.log(`✅ Deleted test device identity`);
    } else if (device) {
      // Just reset premium if device existed before
      await prisma.deviceIdentity.update({
        where: { id: device.id },
        data: { premiumExpiresAt: null },
      });
      console.log(`✅ Reset device premium`);
    }

    console.log("\n✅ E2E test completed successfully!");
  } catch (error) {
    console.error("\n❌ E2E test failed:", error);

    // Best effort cleanup
    try {
      console.log("\n🧹 Attempting cleanup...");
      await prisma.discountCode.deleteMany({
        where: {
          code: {
            startsWith: TEST_CODE_PREFIX,
          },
        },
      });
      
      // If we created the device, delete it; otherwise just reset premium
      const device = await prisma.deviceIdentity.findUnique({
        where: { deviceId: TEST_DEVICE_ID },
      });
      
      if (device) {
        if (createdDevice) {
          await prisma.deviceIdentity.delete({
            where: { id: device.id },
          });
        } else {
          await prisma.deviceIdentity.update({
            where: { id: device.id },
            data: { premiumExpiresAt: null },
          });
        }
      }
      
      console.log("✅ Cleanup completed");
    } catch (cleanupError) {
      console.error("❌ Cleanup failed:", cleanupError);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
