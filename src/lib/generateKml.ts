import type { ItineraryResponse } from "@/types/itinerary";
import { normalizeDayPlan, isMealType } from "@/lib/itineraryUtils";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateKml(itinerary: ItineraryResponse): string {
  const dayFolders = (itinerary.days ?? []).map((rawDay) => {
    const day = normalizeDayPlan(rawDay);
    const items = day.timeline ?? [];

    const placemarks = items
      .filter((item) => item.coordinates?.lat && item.coordinates?.lng)
      .map((item, i) => {
        const label = isMealType(item.type)
          ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
          : (item.category ?? "Activity");
        const desc = [
          item.startTime ? `Time: ${item.startTime}` : "",
          item.description,
          item.duration ? `Duration: ${item.duration}` : "",
          item.rating !== undefined ? `Rating: ${item.rating.toFixed(1)}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        return `      <Placemark>
        <name>${esc(`${i + 1}. ${item.title}`)}</name>
        <description>${esc(desc)}</description>
        <styleUrl>#stop</styleUrl>
        <ExtendedData>
          <Data name="type"><value>${esc(label)}</value></Data>
        </ExtendedData>
        <Point>
          <coordinates>${item.coordinates.lng},${item.coordinates.lat},0</coordinates>
        </Point>
      </Placemark>`;
      });

    if (day.hiddenGemCoordinates?.lat && day.hiddenGemCoordinates?.lng && day.hiddenGem) {
      placemarks.push(`      <Placemark>
        <name>${esc(`★ Hidden Gem — Day ${day.day}`)}</name>
        <description>${esc(day.hiddenGem)}</description>
        <styleUrl>#gem</styleUrl>
        <Point>
          <coordinates>${day.hiddenGemCoordinates.lng},${day.hiddenGemCoordinates.lat},0</coordinates>
        </Point>
      </Placemark>`);
    }

    return `    <Folder>
      <name>${esc(`Day ${day.day}: ${day.theme}`)}</name>
      <open>1</open>
${placemarks.join("\n")}
    </Folder>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(itinerary.destination)} — TravalBee Itinerary</name>
    <description>${esc(itinerary.editorial ?? "")}</description>

    <Style id="stop">
      <IconStyle>
        <color>ff0c41c2</color>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon>
      </IconStyle>
    </Style>

    <Style id="gem">
      <IconStyle>
        <color>ff006959</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-stars.png</href></Icon>
      </IconStyle>
    </Style>

${dayFolders.join("\n")}
  </Document>
</kml>`;
}
