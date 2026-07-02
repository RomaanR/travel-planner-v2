// One-off script: clone a live Trip into a self-hosted "golden" sample record.
// Downloads each timeline item's Google photo once and stores it under public/sample/,
// so the /sample marketing page never depends on a Google photo_reference token again.
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config({ path: ".env.local" });
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_TRIP_ID = process.argv[2];
if (!SOURCE_TRIP_ID) {
  console.error("Usage: node scripts/clone-sample-trip.mjs <sourceTripId>");
  process.exit(1);
}

const prisma = new PrismaClient();
const apiKey = process.env.MAPS_SERVER_KEY;
const outDir = path.join(process.cwd(), "public", "sample");

async function downloadPhoto(photoReference, filename) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoReference}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photo fetch failed (${res.status}) for ${filename}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(path.join(outDir, filename), buf);
  return `/sample/${filename}`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const source = await prisma.trip.findUnique({ where: { id: SOURCE_TRIP_ID } });
  if (!source) throw new Error("Source trip not found");

  const data = JSON.parse(JSON.stringify(source.itineraryData));
  let counter = 0;

  for (const day of data.days ?? []) {
    for (const item of day.timeline ?? []) {
      if (item.photoReference) {
        counter++;
        const filename = `paris-${String(counter).padStart(2, "0")}.jpg`;
        console.log(`Downloading ${filename} for "${item.title}"...`);
        const localUrl = await downloadPhoto(item.photoReference, filename);
        item.photoUrl = localUrl;
        item.photoReference = undefined;
        delete item.photoReference;
      }
    }
  }

  const clone = await prisma.trip.create({
    data: {
      userId: source.userId,
      destination: source.destination,
      days: source.days,
      itineraryData: data,
    },
  });

  console.log("\nCloned sample trip created:", clone.id);
  console.log("Update SAMPLE_TRIP_ID in src/app/sample/page.tsx to this value.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
