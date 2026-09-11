import { load } from "cheerio";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
export function profileLinks(html: string, pageUrl: string, names: string[]) {
  const $ = load(html);
  const wanted = new Set(names.map((name) => clean(name).toLowerCase()));
  const found = new Map<string, string>();
  $("a[href]").each((_, el) => {
    const name = clean($(el).text());
    try {
      const url = new URL($(el).attr("href")!, pageUrl);
      if (
        wanted.has(name.toLowerCase()) &&
        url.hostname === "www.gtabase.com" &&
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        /\/(grand-theft-auto-v\/vehicles|vehicles\/grand-theft-auto-v)\/[^/]+$/.test(
          url.pathname,
        )
      )
        found.set(name, url.href);
    } catch {
      /* Ignore malformed source links. */
    }
  });
  return [...found].map(([alias, url]) => ({ alias, url }));
}

export function parseVehicleProfile(html: string, url: string) {
  const $ = load(html);
  const specs: Record<string, string> = {};
  $(".field-label").each((_, el) => {
    const key = clean($(el).text());
    const value = clean($(el).siblings(".field-value").text());
    if (value && value.length <= 300) specs[key] = value;
  });
  const name = clean($("h1").first().text());
  if (!name || !specs["Vehicle Class"] || !specs["Model ID"])
    throw new Error(`Incomplete vehicle profile: ${url}`);
  const imageUrls = [
    $('link[rel="preload"][as="image"]').attr("href"),
    $('meta[property="og:image"]').attr("content"),
    ...$("a[href]")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter((href) => /\.(jpg|webp|avif|png)$/i.test(href)),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new URL(value, url))
    .filter(
      (image) =>
        image.protocol === "https:" &&
        image.hostname === "www.gtabase.com" &&
        /vehicles|gta5-database/.test(image.pathname),
    );
  const gallery = [
    ...new Set(
      imageUrls.map((image) => {
        image.hash = "";
        return image.href;
      }),
    ),
  ].slice(0, 5);
  const fullSize = gallery.find(
    (image) => image.endsWith("-1080.jpg") && !image.includes("-action-"),
  );
  if (fullSize) {
    gallery.splice(gallery.indexOf(fullSize), 1);
    gallery.unshift(fullSize);
  }
  if (!gallery.length) throw new Error(`No factual vehicle image: ${url}`);
  const numeric = (key: string) => {
    const match = specs[key]?.replaceAll(",", "").match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const manufacturer = specs.Manufacturer || null;
  const modelName =
    manufacturer && name.startsWith(manufacturer + " ")
      ? name.slice(manufacturer.length + 1)
      : name;
  const added = Date.parse(
    specs["Release Date"] ? `${specs["Release Date"]} 00:00:00 UTC` : "",
  );
  return {
    slug: name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    name,
    model_name: modelName,
    manufacturer,
    vehicle_class: specs["Vehicle Class"],
    price: numeric("GTA Online Price"),
    trade_price: numeric("Trade Price"),
    top_speed: numeric("Top Speed"),
    seats: numeric("Seats"),
    retailer: specs.Acquisition || null,
    image: gallery[0],
    gallery,
    specifications: specs,
    description:
      `${name} is a ${specs["Vehicle Class"].toLowerCase()} vehicle${manufacturer ? ` manufactured by ${manufacturer}` : ""}. ${specs["Based on (Real Life)"] ? `Its design takes inspiration from the ${specs["Based on (Real Life)"]}.` : ""}`.trim(),
    source_url: url,
    verified_at: new Date().toISOString(),
    is_seed: false,
    features: (specs["Vehicle Features"] || "")
      .split(",")
      .map(clean)
      .filter(Boolean),
    added_at: Number.isFinite(added) ? new Date(added).toISOString() : null,
    confidence_score: 85,
  };
}
