import { parseVehicleProfile } from "../src/services/vehicle-profile";
// Read-only enrichment export. Input: JSON array of {slug, source_url}.
const input = JSON.parse(process.argv[2] || "[]") as Array<{
  slug: string;
  source_url: string;
}>;
const result = [];
for (let i = 0; i < input.length; i += 3) {
  result.push(
    ...(await Promise.all(
      input.slice(i, i + 3).map(async (row) => {
        const url = new URL(row.source_url);
        if (url.origin !== "https://www.gtabase.com")
          throw new Error("Only configured GTABase profiles are supported");
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok)
          throw new Error(`Profile request failed: ${response.status}`);
        return {
          ...parseVehicleProfile(await response.text(), response.url),
          slug: row.slug,
        };
      }),
    )),
  );
}
console.log(JSON.stringify(result));
