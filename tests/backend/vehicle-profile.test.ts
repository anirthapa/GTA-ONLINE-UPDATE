import { describe, expect, it } from "vitest";
import {
  parseVehicleProfile,
  profileLinks,
} from "../../src/services/vehicle-profile";
const base =
  "https://www.gtabase.com/gta-online/weekly-update-bonuses-discounts";
describe("canonical vehicle profiles", () => {
  it("matches exact reported model names, never special variants", () => {
    const links = profileLinks(
      `<a href="/vehicles/grand-theft-auto-v/cheetah-classic-widebody">LSCM Cheetah Classic</a><a href="/grand-theft-auto-v/vehicles/cheetah-classic">Cheetah Classic</a><a href="https://evil.example/vehicles/grand-theft-auto-v/s95">S95</a><a href="http://[invalid">S95</a>`,
      base,
      ["Cheetah Classic", "S95"],
    );
    expect(links).toEqual([
      {
        alias: "Cheetah Classic",
        url: "https://www.gtabase.com/grand-theft-auto-v/vehicles/cheetah-classic",
      },
    ]);
  });
  it("parses source stats and factual imagery without invented missing values", () => {
    const fields = {
      "Vehicle Class": "Sports",
      "Model ID": "s95",
      Manufacturer: "Karin",
      "GTA Online Price": "$1,995,000",
      Seats: "2",
      "Top Speed": "115.50 mph (185.88 km/h)",
      Drivetrain: "RWD",
    };
    const html =
      '<h1>Karin S95</h1><meta property="og:image" content="/images/gta-5/vehicles/s95.jpg">' +
      Object.entries(fields)
        .map(
          ([key, value]) =>
            `<div><span class="field-label">${key}</span><span class="field-value">${value}</span></div>`,
        )
        .join("");
    expect(parseVehicleProfile(html, base)).toMatchObject({
      name: "Karin S95",
      model_name: "S95",
      manufacturer: "Karin",
      price: 1995000,
      top_speed: 115.5,
      seats: 2,
      trade_price: null,
      features: [],
      specifications: fields,
      image: "https://www.gtabase.com/images/gta-5/vehicles/s95.jpg",
    });
    expect(() => parseVehicleProfile("<h1>Missing source</h1>", base)).toThrow(
      "Incomplete vehicle profile",
    );
  });
});
