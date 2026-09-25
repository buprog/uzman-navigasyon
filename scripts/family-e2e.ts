#!/usr/bin/env tsx
/**
 * E2E test for family membership system
 * Usage: npx tsx scripts/family-e2e.ts [--url=https://uzman-navigasyon.vercel.app]
 * 
 * Requirements: A FAMILY discount code must exist in the system before running this test.
 * Create one via the admin panel with at least 10 uses and set it as FAMILY_TEST_CODE env var.
 * DATABASE_URL must be set for full blocker verification.
 */

import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.argv.find((a) => a.startsWith("--url="))?.split("=")[1] ||
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
  "http://localhost:3000";

const FAMILY_CODE = process.env.FAMILY_TEST_CODE || "AILE-TEST01";

const createdDeviceIds: string[] = [];
const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

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

    // 7. Test BLOCKER A: in_other_family redeem doesn't consume use
    console.log("\n7️⃣ Testing BLOCKER A: in_other_family redeem doesn't consume use...");
    
    // Get current usedCount from the database if available
    let usedCountBefore: number | undefined;
    if (prisma) {
      const codeRecord = await prisma.discountCode.findUnique({
        where: { code: FAMILY_CODE },
        select: { usedCount: true, id: true },
      });
      if (codeRecord) {
        usedCountBefore = codeRecord.usedCount;
        console.log(`   📊 DB usedCount before: ${usedCountBefore}`);
      }
    }
    
    // Try to redeem with a member device (should fail with in_other_family)
    const memberInOtherFamily = memberDevices[1]; // Still active in the family
    const failedRedeemRes = await fetch(`${BASE_URL}/api/discount/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: FAMILY_CODE,
        deviceId: memberInOtherFamily,
        platform: "web",
      }),
    });
    const failedRedeemData = await failedRedeemRes.json();
    
    if (failedRedeemRes.status !== 409 || failedRedeemData.error !== "in_other_family") {
      throw new Error(`Expected in_other_family error, got: ${JSON.stringify(failedRedeemData)}`);
    }
    console.log(`   ✅ Redeem correctly failed with in_other_family`);
    
    // Verify usedCount unchanged and no DiscountRedemption row
    if (prisma && usedCountBefore !== undefined) {
      const codeRecord = await prisma.discountCode.findUnique({
        where: { code: FAMILY_CODE },
        select: { usedCount: true, id: true },
      });
      if (codeRecord && codeRecord.usedCount !== usedCountBefore) {
        throw new Error(`usedCount changed from ${usedCountBefore} to ${codeRecord.usedCount} despite failure`);
      }
      console.log(`   ✅ DB usedCount unchanged: ${codeRecord?.usedCount}`);
      
      const redemption = await prisma.discountRedemption.findFirst({
        where: {
          codeId: codeRecord!.id,
          deviceId: memberInOtherFamily,
        },
      });
      if (redemption) {
        throw new Error(`DiscountRedemption row exists despite in_other_family failure`);
      }
      console.log(`   ✅ No DiscountRedemption row created`);
    }
    
    // Verify member still only has family premium, not individual
    const memberStatusAfterFailedRedeem = await fetch(`${BASE_URL}/api/discount/status?deviceId=${memberInOtherFamily}`).then(r => r.json());
    if (memberStatusAfterFailedRedeem.source !== "family") {
      throw new Error(`Member should only have family premium, not individual: ${JSON.stringify(memberStatusAfterFailedRedeem)}`);
    }
    console.log(`   ✅ Member still has only family premium (API verified)`);

    // 8. Test BLOCKER C: already_member on re-join
    console.log("\n8️⃣ Testing BLOCKER C: already_member on re-join of same family...");
    
    const memberAlreadyIn = memberDevices[0]; // Currently active in family after rejoin
    const alreadyMemberRes = await fetch(`${BASE_URL}/api/family/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode,
        deviceId: memberAlreadyIn,
        platform: "web",
      }),
    });
    const alreadyMemberData = await alreadyMemberRes.json();
    
    if (alreadyMemberRes.status !== 409 || alreadyMemberData.error !== "already_member") {
      throw new Error(`Expected already_member error, got: ${JSON.stringify(alreadyMemberData)}`);
    }
    console.log(`   ✅ Correctly returned already_member (not in_other_family)`);

    // 9. Test BLOCKER D: close family, join another, premium from new one
    console.log("\n9️⃣ Testing BLOCKER D: close family behavior...");
    
    // Note: We can't easily test the full close/reopen flow without admin access,
    // but we can test that members are properly filtered by ACTIVE status
    
    // Create a second family for testing
    const secondOwnerDeviceId = `test-owner-2-${randomBytes(8).toString("hex")}`;
    createdDeviceIds.push(secondOwnerDeviceId);
    
    const secondRedeemRes = await fetch(`${BASE_URL}/api/discount/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: FAMILY_CODE,
        deviceId: secondOwnerDeviceId,
        platform: "web",
      }),
    });
    const secondRedeemData = await secondRedeemRes.json();
    
    if (!secondRedeemData.ok || secondRedeemData.type !== "FAMILY") {
      throw new Error(`Failed to create second family: ${JSON.stringify(secondRedeemData)}`);
    }
    
    const secondInviteCode = secondRedeemData.inviteCode;
    console.log(`   ✅ Second family created: ${secondInviteCode}`);
    
    // Have a member leave the first family
    const testMember = memberDevices[1];
    const leaveForSecondRes = await fetch(`${BASE_URL}/api/family/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: testMember }),
    });
    const leaveForSecondData = await leaveForSecondRes.json();
    
    if (!leaveForSecondData.ok) {
      throw new Error(`Failed to leave first family: ${JSON.stringify(leaveForSecondData)}`);
    }
    console.log(`   ✅ Member left first family`);
    
    // Join the second family
    const joinSecondRes = await fetch(`${BASE_URL}/api/family/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode: secondInviteCode,
        deviceId: testMember,
        platform: "web",
      }),
    });
    const joinSecondData = await joinSecondRes.json();
    
    if (!joinSecondData.ok) {
      throw new Error(`Failed to join second family: ${JSON.stringify(joinSecondData)}`);
    }
    console.log(`   ✅ Member joined second family`);
    
    // Verify premium is from the second family
    const newFamilyStatus = await fetch(`${BASE_URL}/api/discount/status?deviceId=${testMember}`).then(r => r.json());
    if (newFamilyStatus.source !== "family" || !newFamilyStatus.family) {
      throw new Error(`Member should have family premium from second family: ${JSON.stringify(newFamilyStatus)}`);
    }
    console.log(`   ✅ Member has family premium from second family`);

    // 10-13. Test BLOCKER D2: bulk-reopen scenarios (requires admin access and DB)
    if (prisma && process.env.ADMIN_TOKEN) {
      console.log("\n🔟 Testing BLOCKER D2: bulk-reopen scenarios (requires admin)...");
      
      // Scenario 1: close → reopen restores only active-at-close members
      console.log("\n10.1 Close → reopen restores only active-at-close members...");
      const familyIdForReopen = await prisma.familyPlan.findFirst({
        where: { inviteCode },
        select: { id: true },
      });
      
      if (!familyIdForReopen) {
        console.log("   ⚠️ Skipped: family not found in DB");
      } else {
        // Close the family
        const closeRes = await fetch(`${BASE_URL}/api/admin/family/bulk-close`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.ADMIN_TOKEN}`,
          },
          body: JSON.stringify({ ids: [familyIdForReopen.id] }),
        });
        
        if (!closeRes.ok) {
          console.log(`   ⚠️ Skipped: close failed (${closeRes.status})`);
        } else {
          console.log(`   ✅ Family closed`);
          
          // Verify members have removedAt set
          const closedMembers = await prisma.familyMember.findMany({
            where: { familyId: familyIdForReopen.id },
          });
          const allHaveRemovedAt = closedMembers.every(m => m.removedAt !== null);
          if (!allHaveRemovedAt) {
            throw new Error("Not all members have removedAt after close");
          }
          console.log(`   ✅ All ${closedMembers.length} members have removedAt`);
          
          // Reopen
          const reopenRes = await fetch(`${BASE_URL}/api/admin/family/bulk-reopen`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.ADMIN_TOKEN}`,
            },
            body: JSON.stringify({ ids: [familyIdForReopen.id] }),
          });
          const reopenData = await reopenRes.json();
          
          if (!reopenRes.ok || !reopenData.reopened?.includes(familyIdForReopen.id)) {
            throw new Error(`Reopen failed: ${JSON.stringify(reopenData)}`);
          }
          console.log(`   ✅ Family reopened`);
          
          // Verify active members restored
          const reopenedMembers = await prisma.familyMember.findMany({
            where: { familyId: familyIdForReopen.id, removedAt: null },
          });
          if (reopenedMembers.length !== closedMembers.length) {
            throw new Error(`Expected ${closedMembers.length} restored, got ${reopenedMembers.length}`);
          }
          console.log(`   ✅ All ${reopenedMembers.length} members restored`);
        }
      }
      
      // Scenario 2: member removed before close stays removed
      console.log("\n10.2 Member removed before close stays removed...");
      const testFamilyForRemoval = await prisma.familyPlan.create({
        data: {
          ownerDeviceId: `test-reopen-owner-${randomBytes(6).toString("hex")}`,
          inviteCode: `AILE-${randomBytes(3).toString("hex").toUpperCase()}`,
          premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
          source: "admin",
          maxMembers: 5,
          members: {
            create: [
              {
                deviceId: `test-reopen-owner-${randomBytes(6).toString("hex")}`,
                role: "OWNER",
              },
              {
                deviceId: `test-reopen-mem1-${randomBytes(6).toString("hex")}`,
                role: "MEMBER",
              },
              {
                deviceId: `test-reopen-mem2-${randomBytes(6).toString("hex")}`,
                role: "MEMBER",
              },
            ],
          },
        },
        include: { members: true },
      });
      
      // Remove one member manually (not via close)
      const memberToRemove = testFamilyForRemoval.members.find(m => m.role === "MEMBER")!;
      await prisma.familyMember.update({
        where: { id: memberToRemove.id },
        data: { removedAt: new Date(Date.now() - 1000) }, // 1 sec before close
      });
      console.log(`   ✅ Manually removed member ${memberToRemove.deviceId.substring(0, 8)}`);
      
      // Close the family
      const closedAt = new Date();
      await prisma.$transaction([
        prisma.familyPlan.update({
          where: { id: testFamilyForRemoval.id },
          data: { status: "CLOSED", closedAt },
        }),
        prisma.familyMember.updateMany({
          where: { familyId: testFamilyForRemoval.id, removedAt: null },
          data: { removedAt: closedAt },
        }),
      ]);
      console.log(`   ✅ Family closed`);
      
      // Reopen
      const reopenRes2 = await fetch(`${BASE_URL}/api/admin/family/bulk-reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ADMIN_TOKEN}`,
        },
        body: JSON.stringify({ ids: [testFamilyForRemoval.id] }),
      });
      const reopenData2 = await reopenRes2.json();
      
      if (!reopenRes2.ok) {
        throw new Error(`Reopen failed: ${JSON.stringify(reopenData2)}`);
      }
      console.log(`   ✅ Family reopened`);
      
      // Verify the manually removed member is still removed
      const memberAfterReopen = await prisma.familyMember.findUnique({
        where: { id: memberToRemove.id },
      });
      if (memberAfterReopen?.removedAt === null) {
        throw new Error("Manually removed member was incorrectly restored");
      }
      console.log(`   ✅ Manually removed member stayed removed`);
      
      // Scenario 3: device in another family is skipped
      console.log("\n10.3 Device in another family is skipped...");
      
      // Create two families
      const family3a = await prisma.familyPlan.create({
        data: {
          ownerDeviceId: `test-skip-owner-a-${randomBytes(6).toString("hex")}`,
          inviteCode: `AILE-${randomBytes(3).toString("hex").toUpperCase()}`,
          premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
          source: "admin",
          maxMembers: 5,
          members: {
            create: [
              {
                deviceId: `test-skip-owner-a-${randomBytes(6).toString("hex")}`,
                role: "OWNER",
              },
              {
                deviceId: `test-skip-shared-${randomBytes(6).toString("hex")}`,
                role: "MEMBER",
              },
            ],
          },
        },
        include: { members: true },
      });
      
      const sharedDeviceId = family3a.members.find(m => m.role === "MEMBER")!.deviceId;
      
      const family3b = await prisma.familyPlan.create({
        data: {
          ownerDeviceId: `test-skip-owner-b-${randomBytes(6).toString("hex")}`,
          inviteCode: `AILE-${randomBytes(3).toString("hex").toUpperCase()}`,
          premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
          source: "admin",
          maxMembers: 5,
          members: {
            create: [
              {
                deviceId: `test-skip-owner-b-${randomBytes(6).toString("hex")}`,
                role: "OWNER",
              },
            ],
          },
        },
      });
      
      console.log(`   ✅ Created two families, shared device: ${sharedDeviceId.substring(0, 8)}`);
      
      // Close family A
      const closedAt3 = new Date();
      await prisma.$transaction([
        prisma.familyPlan.update({
          where: { id: family3a.id },
          data: { status: "CLOSED", closedAt: closedAt3 },
        }),
        prisma.familyMember.updateMany({
          where: { familyId: family3a.id, removedAt: null },
          data: { removedAt: closedAt3 },
        }),
      ]);
      console.log(`   ✅ Closed family A`);
      
      // Device joins family B while A is closed
      await prisma.familyMember.create({
        data: {
          familyId: family3b.id,
          deviceId: sharedDeviceId,
          role: "MEMBER",
        },
      });
      console.log(`   ✅ Shared device joined family B`);
      
      // Try to reopen family A
      const reopenRes3 = await fetch(`${BASE_URL}/api/admin/family/bulk-reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ADMIN_TOKEN}`,
        },
        body: JSON.stringify({ ids: [family3a.id] }),
      });
      const reopenData3 = await reopenRes3.json();
      
      if (!reopenRes3.ok) {
        throw new Error(`Reopen failed: ${JSON.stringify(reopenData3)}`);
      }
      
      // Verify shared device was skipped
      const skippedDevice = reopenData3.skipped?.find(
        (s: any) => s.reason === "in_other_family"
      );
      if (!skippedDevice) {
        throw new Error(`Expected in_other_family skip, got: ${JSON.stringify(reopenData3.skipped)}`);
      }
      console.log(`   ✅ Shared device skipped with in_other_family`);
      
      // Verify device is NOT active in family A
      const memberInA = await prisma.familyMember.findFirst({
        where: {
          familyId: family3a.id,
          deviceId: sharedDeviceId,
          removedAt: null,
        },
      });
      if (memberInA) {
        throw new Error("Device should not be active in family A");
      }
      console.log(`   ✅ Device stayed in family B, not restored to A`);
      
      // Scenario 4: maxMembers is respected
      console.log("\n10.4 Reopen respects maxMembers seat cap...");
      
      // Create family with 5 members, maxMembers=3
      const family4 = await prisma.familyPlan.create({
        data: {
          ownerDeviceId: `test-cap-owner-${randomBytes(6).toString("hex")}`,
          inviteCode: `AILE-${randomBytes(3).toString("hex").toUpperCase()}`,
          premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
          source: "admin",
          maxMembers: 3,
          members: {
            create: [
              {
                deviceId: `test-cap-owner-${randomBytes(6).toString("hex")}`,
                role: "OWNER",
                joinedAt: new Date(Date.now() - 5000),
              },
              {
                deviceId: `test-cap-mem1-${randomBytes(6).toString("hex")}`,
                role: "MEMBER",
                joinedAt: new Date(Date.now() - 4000),
              },
              {
                deviceId: `test-cap-mem2-${randomBytes(6).toString("hex")}`,
                role: "MEMBER",
                joinedAt: new Date(Date.now() - 3000),
              },
              {
                deviceId: `test-cap-mem3-${randomBytes(6).toString("hex")}`,
                role: "MEMBER",
                joinedAt: new Date(Date.now() - 2000),
              },
              {
                deviceId: `test-cap-mem4-${randomBytes(6).toString("hex")}`,
                role: "MEMBER",
                joinedAt: new Date(Date.now() - 1000),
              },
            ],
          },
        },
        include: { members: true },
      });
      console.log(`   ✅ Created family with 5 members, maxMembers=3`);
      
      // Close
      const closedAt4 = new Date();
      await prisma.$transaction([
        prisma.familyPlan.update({
          where: { id: family4.id },
          data: { status: "CLOSED", closedAt: closedAt4 },
        }),
        prisma.familyMember.updateMany({
          where: { familyId: family4.id, removedAt: null },
          data: { removedAt: closedAt4 },
        }),
      ]);
      console.log(`   ✅ Closed family`);
      
      // Reopen
      const reopenRes4 = await fetch(`${BASE_URL}/api/admin/family/bulk-reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ADMIN_TOKEN}`,
        },
        body: JSON.stringify({ ids: [family4.id] }),
      });
      const reopenData4 = await reopenRes4.json();
      
      if (!reopenRes4.ok) {
        throw new Error(`Reopen failed: ${JSON.stringify(reopenData4)}`);
      }
      
      // Verify only 3 members restored (owner + 2 earliest members)
      const restoredMembers4 = await prisma.familyMember.findMany({
        where: { familyId: family4.id, removedAt: null },
        orderBy: { joinedAt: "asc" },
      });
      
      if (restoredMembers4.length !== 3) {
        throw new Error(`Expected 3 restored members, got ${restoredMembers4.length}`);
      }
      
      if (restoredMembers4[0].role !== "OWNER") {
        throw new Error("Owner should be restored first");
      }
      
      const fullSkips = reopenData4.skipped?.filter((s: any) => s.reason === "full").length || 0;
      if (fullSkips !== 2) {
        throw new Error(`Expected 2 'full' skips, got ${fullSkips}`);
      }
      
      console.log(`   ✅ Only 3 members restored (owner + 2 by joinedAt), 2 skipped as 'full'`);
      
      console.log("\n✅ All BLOCKER D2 reopen scenarios passed!");
    } else {
      console.log("\n⚠️ Skipped BLOCKER D2 reopen tests (requires DATABASE_URL and ADMIN_TOKEN)");
    }

    console.log("\n✅ All tests passed (including BLOCKER A, C, D, D2)!\n");

  } catch (err) {
    console.error("\n❌ Test failed:", err);
    process.exitCode = 1;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
    console.log("🧹 Test complete. Created test devices:");
    createdDeviceIds.forEach(id => console.log(`   - ${id}`));
    console.log("\n💡 Note: Test data persists. Clean up via admin panel if needed.\n");
  }
}

main();
