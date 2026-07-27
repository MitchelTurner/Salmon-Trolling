/**
 * Dev/demo seed: one personal org, one boat, three rigs, and the shared gear catalog.
 * Ids are fixed ULIDs so the seed is idempotent under upsert.
 */
import {
  Delivery,
  GearKind,
  OrgKind,
  PrismaClient,
  Role,
} from '@prisma/client';

const prisma = new PrismaClient();

/** Fixed 26-char ids — stable across re-seeds. */
const ids = {
  org: '01JSEEDORG1000000000000000',
  user: '01JSEEDUSER100000000000000',
  membership: '01JSEEDMEM1000000000000000',
  boat: '01JSEEDBOAT100000000000000',
  charter: {
    org: '01JSEEDORGCHARTER0000000000',
    owner: '01JSEEDUSEROWNER00000000000',
    captain: '01JSEEDUSERCAPTAIN000000000',
    crew: '01JSEEDUSERCREW000000000000',
    memOwner: '01JSEEDMEMOWNER000000000000',
    memCaptain: '01JSEEDMEMCAPTAIN0000000000',
    memCrew: '01JSEEDMEMCREW0000000000000',
    boatA: '01JSEEDBOATCHARTA0000000000',
    boatB: '01JSEEDBOATCHARTB0000000000',
    assignCrewA: '01JSEEDASSIGNCREWA000000000',
  },
  gear: {
    hotspot11Green: '01JSEEDGFLASH1000000000000',
    meltonDodger: '01JSEEDGDODGE1000000000000',
    coyoteChartreuse: '01JSEEDGLURE01000000000000',
    squidHootchie: '01JSEEDGLURE02000000000000',
    tipfishHerring: '01JSEEDGBAIT01000000000000',
    cannonBall10: '01JSEEDGBALL01000000000000',
    deepSixDiver: '01JSEEDGDIVER1000000000000',
  },
  rigs: {
    downrigger: '01JSEEDRDOWNR1000000000000',
    diver: '01JSEEDRDIVER1000000000000',
    flatline: '01JSEEDRFLAT01000000000000',
  },
} as const;

const sharedCatalog = [
  {
    id: ids.gear.hotspot11Green,
    kind: GearKind.FLASHER,
    brand: 'Hot Spot',
    model: 'Flasher 11"',
    sizeLabel: '11 in',
    color: 'green UV',
    finish: 'uv',
    dragN: 8.5,
    dragSource: 'ESTIMATED',
  },
  {
    id: ids.gear.meltonDodger,
    kind: GearKind.DODGER,
    brand: 'Melton Tackle',
    model: 'S.W. Dodger',
    sizeLabel: '8 in',
    color: 'chrome',
    finish: 'chrome',
    dragN: 6.0,
    dragSource: 'ESTIMATED',
  },
  {
    id: ids.gear.coyoteChartreuse,
    kind: GearKind.LURE,
    brand: 'Coyote',
    model: 'Spoon',
    sizeLabel: '4.5 in',
    color: 'chartreuse',
    finish: 'painted',
    dragN: 0.4,
    dragSource: 'ESTIMATED',
  },
  {
    id: ids.gear.squidHootchie,
    kind: GearKind.LURE,
    brand: 'Silver Horde',
    model: 'Kingfisher Lite',
    sizeLabel: '4.5 in',
    color: 'green glow',
    finish: 'glow',
    dragN: 0.2,
    dragSource: 'ESTIMATED',
  },
  {
    id: ids.gear.tipfishHerring,
    kind: GearKind.BAIT,
    brand: 'Tippy Fishing',
    model: 'Cut-plug herring',
    sizeLabel: '6 in',
    color: 'natural',
    finish: 'natural',
    dragN: 0.3,
    dragSource: 'ESTIMATED',
  },
  {
    id: ids.gear.cannonBall10,
    kind: GearKind.BALL,
    brand: 'Cannon',
    model: 'Downrigger ball',
    sizeLabel: '10 lb',
    color: null,
    finish: null,
    dragN: null,
    dragSource: null,
  },
  {
    id: ids.gear.deepSixDiver,
    kind: GearKind.DIVER,
    brand: 'Luhr Jensen',
    model: 'Deep Six',
    sizeLabel: 'medium',
    color: 'chrome',
    finish: 'chrome',
    dragN: 12.0,
    dragSource: 'MANUFACTURER',
  },
] as const;

async function main(): Promise<void> {
  const org = await prisma.org.upsert({
    where: { id: ids.org },
    create: {
      id: ids.org,
      name: 'Personal',
      kind: OrgKind.PERSONAL,
    },
    update: {
      name: 'Personal',
      kind: OrgKind.PERSONAL,
    },
  });

  await prisma.user.upsert({
    where: { id: ids.user },
    create: {
      id: ids.user,
      email: 'angler@example.com',
      displayName: 'Demo Angler',
    },
    update: {
      email: 'angler@example.com',
      displayName: 'Demo Angler',
    },
  });

  await prisma.membership.upsert({
    where: { orgId_userId: { orgId: ids.org, userId: ids.user } },
    create: {
      id: ids.membership,
      orgId: ids.org,
      userId: ids.user,
      role: Role.OWNER,
    },
    update: {
      role: Role.OWNER,
    },
  });

  await prisma.boat.upsert({
    where: { id: ids.boat },
    create: {
      id: ids.boat,
      orgId: org.id,
      name: 'Northern Light',
      hasPaddleWheel: true,
      hasN2K: false,
      hasProbe: false,
    },
    update: {
      name: 'Northern Light',
      hasPaddleWheel: true,
    },
  });

  for (const item of sharedCatalog) {
    await prisma.gearItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        orgId: null,
        kind: item.kind,
        brand: item.brand,
        model: item.model,
        sizeLabel: item.sizeLabel,
        color: item.color,
        finish: item.finish,
        dragN: item.dragN,
        dragSource: item.dragSource,
      },
      update: {
        orgId: null,
        kind: item.kind,
        brand: item.brand,
        model: item.model,
        sizeLabel: item.sizeLabel,
        color: item.color,
        finish: item.finish,
        dragN: item.dragN,
        dragSource: item.dragSource,
      },
    });
  }

  await prisma.rig.upsert({
    where: { id: ids.rigs.downrigger },
    create: {
      id: ids.rigs.downrigger,
      orgId: org.id,
      name: 'DR green flasher + coyote',
      delivery: Delivery.DOWNRIGGER,
      deliveryConfig: {
        type: 'DOWNRIGGER',
        cableOut: 30,
        ballMass: 4.5359237,
        ballShape: 'sphere',
        cableDiameter: 0.0009,
        releaseHeight: 1.2,
      },
      mainlineType: 'mono',
      mainlineDiaM: 0.00045,
      attractorId: ids.gear.hotspot11Green,
      lureId: ids.gear.coyoteChartreuse,
      leaderLengthM: 1.5,
      stackPosition: 0,
    },
    update: {
      name: 'DR green flasher + coyote',
      delivery: Delivery.DOWNRIGGER,
      attractorId: ids.gear.hotspot11Green,
      lureId: ids.gear.coyoteChartreuse,
    },
  });

  await prisma.rig.upsert({
    where: { id: ids.rigs.diver },
    create: {
      id: ids.rigs.diver,
      orgId: org.id,
      name: 'Deep Six + hootchie',
      delivery: Delivery.DIVER,
      deliveryConfig: {
        type: 'DIVER',
        model: 'Deep Six',
        size: 'medium',
        settingIndex: 2,
        lineOut: 45,
        addedWeight: 0,
      },
      mainlineType: 'braid',
      mainlineDiaM: 0.0003,
      attractorId: ids.gear.meltonDodger,
      lureId: ids.gear.squidHootchie,
      leaderLengthM: 1.2,
      stackPosition: 0,
    },
    update: {
      name: 'Deep Six + hootchie',
      delivery: Delivery.DIVER,
      attractorId: ids.gear.meltonDodger,
      lureId: ids.gear.squidHootchie,
    },
  });

  await prisma.rig.upsert({
    where: { id: ids.rigs.flatline },
    create: {
      id: ids.rigs.flatline,
      orgId: org.id,
      name: 'Flatline herring',
      delivery: Delivery.FLATLINE,
      deliveryConfig: {
        type: 'FLATLINE',
        lineOut: 25,
      },
      mainlineType: 'mono',
      mainlineDiaM: 0.0005,
      attractorId: null,
      lureId: ids.gear.tipfishHerring,
      leaderLengthM: 2.0,
      stackPosition: 0,
    },
    update: {
      name: 'Flatline herring',
      delivery: Delivery.FLATLINE,
      lureId: ids.gear.tipfishHerring,
    },
  });

  // Multi-boat charter org: owner + captain + deckhand on boat A (no billing for crew).
  const charter = await prisma.org.upsert({
    where: { id: ids.charter.org },
    create: {
      id: ids.charter.org,
      name: 'Misty Fjords Charters',
      kind: OrgKind.CHARTER,
    },
    update: {
      name: 'Misty Fjords Charters',
      kind: OrgKind.CHARTER,
    },
  });

  await prisma.user.upsert({
    where: { id: ids.charter.owner },
    create: {
      id: ids.charter.owner,
      email: 'owner@mistyfjords.example',
      displayName: 'Charter Owner',
    },
    update: { displayName: 'Charter Owner' },
  });
  await prisma.user.upsert({
    where: { id: ids.charter.captain },
    create: {
      id: ids.charter.captain,
      email: 'captain@mistyfjords.example',
      displayName: 'Captain',
    },
    update: { displayName: 'Captain' },
  });
  await prisma.user.upsert({
    where: { id: ids.charter.crew },
    create: {
      id: ids.charter.crew,
      email: 'deck@mistyfjords.example',
      displayName: 'Deckhand',
    },
    update: { displayName: 'Deckhand' },
  });

  await prisma.membership.upsert({
    where: {
      orgId_userId: { orgId: charter.id, userId: ids.charter.owner },
    },
    create: {
      id: ids.charter.memOwner,
      orgId: charter.id,
      userId: ids.charter.owner,
      role: Role.OWNER,
    },
    update: { role: Role.OWNER },
  });
  await prisma.membership.upsert({
    where: {
      orgId_userId: { orgId: charter.id, userId: ids.charter.captain },
    },
    create: {
      id: ids.charter.memCaptain,
      orgId: charter.id,
      userId: ids.charter.captain,
      role: Role.CAPTAIN,
    },
    update: { role: Role.CAPTAIN },
  });
  await prisma.membership.upsert({
    where: {
      orgId_userId: { orgId: charter.id, userId: ids.charter.crew },
    },
    create: {
      id: ids.charter.memCrew,
      orgId: charter.id,
      userId: ids.charter.crew,
      role: Role.CREW,
    },
    update: { role: Role.CREW },
  });

  await prisma.boat.upsert({
    where: { id: ids.charter.boatA },
    create: {
      id: ids.charter.boatA,
      orgId: charter.id,
      name: 'Northern Light',
      hasPaddleWheel: true,
      hasN2K: true,
      hasProbe: false,
    },
    update: { name: 'Northern Light' },
  });
  await prisma.boat.upsert({
    where: { id: ids.charter.boatB },
    create: {
      id: ids.charter.boatB,
      orgId: charter.id,
      name: 'Sea Bear',
      hasPaddleWheel: false,
      hasN2K: false,
      hasProbe: false,
    },
    update: { name: 'Sea Bear' },
  });

  await prisma.boatAssignment.upsert({
    where: {
      boatId_userId: {
        boatId: ids.charter.boatA,
        userId: ids.charter.crew,
      },
    },
    create: {
      id: ids.charter.assignCrewA,
      orgId: charter.id,
      boatId: ids.charter.boatA,
      userId: ids.charter.crew,
      active: true,
    },
    update: { active: true },
  });

  const [gearCount, rigCount, charterBoats] = await Promise.all([
    prisma.gearItem.count({ where: { orgId: null } }),
    prisma.rig.count({ where: { orgId: org.id } }),
    prisma.boat.count({ where: { orgId: charter.id } }),
  ]);

  console.log(
    `Seeded personal org ${org.id}: 1 boat, ${rigCount} rigs, ${gearCount} shared gear items`,
  );
  console.log(
    `Seeded charter org ${charter.id}: ${charterBoats} boats, owner/captain/crew (crew on Northern Light)`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
