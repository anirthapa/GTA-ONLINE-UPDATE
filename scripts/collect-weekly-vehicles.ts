import {
  parseVehicleProfile,
  profileLinks,
} from "../src/services/vehicle-profile";

// Read-only collection. Review the output before importing into the database.
const url =
  "https://www.gtabase.com/gta-online/weekly-update-bonuses-discounts";
const names = [
  "S95",
  "Nimbus",
  "Vindicator",
  "Baller ST",
  "Cheetah Classic",
  "Vivanite",
  "Penumbra FF",
  "Patriot Stretch",
  "Shinobi",
  "Vortex",
  "Growler",
  "Defiler",
  "Aleutian",
  "Warrener HKR",
  "Rampant Rocket Tricycle",
];
const page = await fetch(url);
if (!page.ok) throw new Error(`Weekly source: ${page.status}`);
const links = profileLinks(await page.text(), url, names);
if (links.length !== names.length)
  throw new Error(`Resolved ${links.length}/${names.length} model links`);
const vehicles = [];
for (let i = 0; i < links.length; i += 3) {
  vehicles.push(
    ...(await Promise.all(
      links.slice(i, i + 3).map(async ({ alias, url }) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return {
          alias,
          ...parseVehicleProfile(await response.text(), response.url),
        };
      }),
    )),
  );
}
console.log(JSON.stringify(vehicles));
