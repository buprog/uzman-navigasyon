#!/usr/bin/env tsx
/**
 * E2E test for family membership system
 * Usage: npx tsx scripts/family-e2e.ts [--url=https://uzman-navigasyon.vercel.app]
 * 
 * Requirements: A FAMILY discount code must exist in the system before running this test.
 * Create one via the admin panel with at least 10 uses and set it as FAMILY_TEST_CODE env var.
 */

import { randomBytes } from "crypto";

const BASE_URL = process.argv.find((a) => a.startsWith("--url="))?.split("=")[1] ||
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
  "http://localhost:3000";

const FAMILY_CODE = process.env.FAMILY_TEST_CODE || "AILE-TEST01";

const createdDeviceIds: string[] = [];

async function main() {
  console.log(`🧪 Family E2E Test against ${BASE_URL}`);
  console.log(`   Using FAMILY code: ${FAMILY_CODE}\n`);

  try {
    // 1. Redeem FAMILY code with owner device
    console.log("1️⃣ Creating family with owner device...");
    const ownerDeviceId = `test-owner-${randomBytes(8).toString("hex")}`;
    createdDeviceIds.push(ownerDeviceId);
    
    const redeemRes = await fetch(`${BASE_URL}/api/discount/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: FAMILY_CODE,
        deviceId: ownerDeviceId,
        platform: "web",
      }),
    });
    const redeemData = await redeemRes.json();
    
    if (!redeemData.ok || redeemData.type !== "FAMILY") {
      throw new Error(`Failed to redeem: ${JSON.stringify(redeemData)}`);
    }
    
    const inviteCode = redeemData.inviteCode;
    const maxMembers = redeemData.maxMembers;
    console.log(`   ✅ Family created: ${inviteCode} (max ${maxMembers})`);

    // 2. Check owner status
    console.log("\n2️⃣ Verifying owner status...");
    const ownerStatus = await fetch(`${BASE_URL}/api/discount/status?deviceId=${ownerDeviceId}`).then(r => r.json());
    
    if (ownerStatus.source !== "family" || !ownerStatus.family || ownerStatus.family.role !== "OWNER") {
      throw new Error(`Owner status incorrect: ${JSON.stringify(ownerStatus)}`);
    }
    console.log(`   ✅ Owner confirmed, premium until: ${ownerStatus.premiumUntil}`);

    // 3. Join with 2 regular members
    console.log("\n3️⃣ Adding 2 regular members...");
    const memberDevices: string[] = [];
    
    for (let i = 1; i <= 2; i++) {
      const memberId = `test-member-${i}-${randomBytes(6).toString("hex")}`;
      createdDeviceIds.push(memberId);
      memberDevices.push(memberId);
      
      const joinRes = await fetch(`${BASE_URL}/api/family/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          deviceId: memberId,
          platform: "web",
        }),
      });
      const joinData = await joinRes.json();
      
      if (!joinData.ok) {
        throw new Error(`Member ${i} join failed: ${JSON.stringify(joinData)}`);
      }
      console.log(`   ✅ Member ${i} joined (${memberId.substring(0, 12)}...)`);
    }

    // 4. Verify member premium status
    console.log("\n4️⃣ Verifying member premium...");
    for (let i = 0; i < memberDevices.length; i++) {
      const memberStatus = await fetch(`${BASE_URL}/api/discount/status?deviceId=${memberDevices[i]}`).then(r => r.json());
      
      if (memberStatus.source !== "family" || !memberStatus.family || memberStatus.family.role !== "MEMBER") {
        throw new Error(`Member ${i + 1} status incorrect: ${JSON.stringify(memberStatus)}`);
      }
      console.log(`   ✅ Member ${i + 1} has family premium`);
    }

    // 5. Test concurrent joins (fill remaining seats)
    const remainingSeats = maxMembers - 3; // owner + 2 members already
    const extraMembers = remainingSeats + 2; // Try to overfill by 2
    
    console.log(`\n5️⃣ Testing concurrent joins (${extraMembers} attempts into ${remainingSeats} seats)...`);
    
    const concurrentJoinPromises = [];
    for (let i = 0; i < extraMembers; i++) {
      const extraId = `test-concurrent-${i}-${randomBytes(6).toString("hex")}`;
      createdDeviceIds.push(extraId);
      
      concurrentJoinPromises.push(
        fetch(`${BASE_URL}/api/family/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inviteCode,
            deviceId: extraId,
            platform: "web",
          }),
        }).then(r => r.json())
      );
    }
    
    const concurrentResults = await Promise.all(concurrentJoinPromises);
    const successfulJoins = concurrentResults.filter(r => r.ok).length;
    const fullErrors = concurrentResults.filter(r => r.error === "full").length;
    
    if (successfulJoins !== remainingSeats) {
      throw new Error(`Expected exactly ${remainingSeats} successful concurrent joins, got ${successfulJoins}`);
    }
    
    if (fullErrors !== 2) {
      throw new Error(`Expected exactly 2 'full' errors, got ${fullErrors}`);
    }
    
    console.log(`   ✅ Exactly ${successfulJoins} concurrent joins succeeded, ${fullErrors} correctly rejected`);

    // 6. Test member leave and rejoin
    console.log("\n6️⃣ Testing member leave and rejoin...");
    const memberToTest = memberDevices[0];
    
    // Leave
    const leaveRes = await fetch(`${BASE_URL}/api/family/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: memberToTest }),
    });
    const leaveData = await leaveRes.json();
    
    if (!leaveData.ok) {
      throw new Error(`Failed to leave: ${JSON.stringify(leaveData)}`);
    }
    console.log(`   ✅ Member left family`);
    
    // Verify no longer has family premium
    const afterLeaveStatus = await fetch(`${BASE_URL}/api/discount/status?deviceId=${memberToTest}`).then(r => r.json());
    if (afterLeaveStatus.source === "family") {
      throw new Error(`Member still has family premium after leaving: ${JSON.stringify(afterLeaveStatus)}`);
    }
    console.log(`   ✅ Confirmed: no longer has family premium`);
    
    // Rejoin
    const rejoinRes = await fetch(`${BASE_URL}/api/family/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode,
        deviceId: memberToTest,
        platform: "web",
      }),
    });
    const rejoinData = await rejoinRes.json();
    
    if (!rejoinData.ok) {
      throw new Error(`Failed to rejoin: ${JSON.stringify(rejoinData)}`);
    }
    console.log(`   ✅ Member successfully rejoined`);
    
    // Verify has family premium again
    const afterRejoinStatus = await fetch(`${BASE_URL}/api/discount/status?deviceId=${memberToTest}`).then(r => r.json());
    if (afterRejoinStatus.source !== "family") {
      throw new Error(`Member doesn't have family premium after rejoining: ${JSON.stringify(afterRejoinStatus)}`);
    }
    console.log(`   ✅ Confirmed: family premium restored`);

    console.log("\n✅ All tests passed!\n");

  } catch (err) {
    console.error("\n❌ Test failed:", err);
    process.exitCode = 1;
  } finally {
    console.log("🧹 Test complete. Created test devices:");
    createdDeviceIds.forEach(id => console.log(`   - ${id}`));
    console.log("\n💡 Note: Test data persists. Clean up via admin panel if needed.\n");
  }
}

main();
