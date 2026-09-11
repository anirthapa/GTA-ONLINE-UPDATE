export interface OfficialNewsItem {
  title: string;
  date: string;
  dateIso: string;
  summary: string;
  category: string;
  sourceUrl: string;
  image: string | null;
  imageAlt: string | null;
  tag: string;
}

// Curated from Rockstar's official GTA Online pages on 2026-09-11. Keep this
// list short and source-first so the front end remains useful even when the
// editorial database is waiting for its next scheduled sync.
export const OFFICIAL_GTA_NEWS: OfficialNewsItem[] = [
  {
    title: "Business Rivalries puts Los Santos businesses in the spotlight",
    date: "September 3, 2026",
    dateIso: "2026-09-03",
    summary:
      "Rockstar's September event focuses on Executives, Bikers, Gunrunners and Nightclub owners, with weekly challenges offering up to GTA$4M in extra rewards across the month.",
    category: "Events",
    sourceUrl: "https://www.rockstargames.com/gta-online?info=97535",
    image: null,
    imageAlt: null,
    tag: "LIVE EVENT",
  },
  {
    title: "Random Transform Races bring triple rewards and new vehicle chaos",
    date: "August 27, 2026",
    dateIso: "2026-08-27",
    summary:
      "Three new Known Unknown races and two Unknown Unknown races rotate players through land, sea and air vehicles, with 3X GTA$ and RP available in the event week.",
    category: "Events",
    sourceUrl:
      "https://www.rockstargames.com/newswire/article/o3921k3734ok35",
    image:
      "https://media-rockstargames-com.akamaized.net/tina-uploads/posts/o3921k3734ok35/3ba5f40fa2efa0cfb9b1edc192013773fcace605.jpg",
    imageAlt: "Rockstar Games artwork for GTA Online Random Transform Races",
    tag: "3X GTA$ & RP",
  },
  {
    title: "Brand Wars asked Los Santos to choose between Sprunk and eCola",
    date: "August 13, 2026",
    dateIso: "2026-08-13",
    summary:
      "The two-week Brand Wars event put Odd Jobs, Freemode Events and Hotring Circuit Series races at the center of a city-wide rivalry, with free branded gear and a Hotring Sabre available during the event.",
    category: "Events",
    sourceUrl:
      "https://www.rockstargames.com/newswire/article/9k2kok31k3a8k9/declare-your-allegiance-and-determine-who-owns-los-santos-in-the-brand",
    image:
      "https://media-rockstargames-com.akamaized.net/tina-uploads/posts/9k2kok31k3a8k9/46944605c1257bcb4dca1dbc4ffe515cd55cddda.jpg",
    imageAlt: "Rockstar Games artwork for the GTA Online Brand Wars event",
    tag: "BRAND WARS",
  },
  {
    title: "GTA+ members got early access to the Gallivanter Warden SUV",
    date: "August 13, 2026",
    dateIso: "2026-08-13",
    summary:
      "The new Gallivanter Warden arrived early for GTA+ members through The Vinewood Car Club, alongside the month's other membership benefits.",
    category: "GTA+",
    sourceUrl:
      "https://www.rockstargames.com/newswire/article/39a9kkko53o31k/gta-members-can-claim-the-new-gallivanter-warden-suv-for-free-one-week",
    image:
      "https://media-rockstargames-com.akamaized.net/tina-uploads/posts/39a9kkko53o31k/da8fa46580334d594820dff0a962a73ddc5eeac0.jpg",
    imageAlt: "Rockstar Games artwork for the Gallivanter Warden SUV",
    tag: "GTA+",
  },
  {
    title: "The Kortz Center Heist is now available in GTA Online",
    date: "July 14, 2026",
    dateIso: "2026-07-14",
    summary:
      "The new Kortz Center Heist sends crews after high-value art in a multi-stage score, expanding the heist lineup with a fresh Los Santos target.",
    category: "Heists",
    sourceUrl:
      "https://www.rockstargames.com/newswire/article/2525o93834o413/the-kortz-center-heist-now-available-in-gta-online",
    image:
      "https://media-rockstargames-com.akamaized.net/tina-uploads/posts/2525o93834o413/60801d3fc7ed87ffe1d32447e42f38a837ccdb9f.jpg",
    imageAlt: "Rockstar Games artwork for The Kortz Center Heist",
    tag: "NEW HEIST",
  },
];
