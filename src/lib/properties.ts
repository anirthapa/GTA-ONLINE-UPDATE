export type PropertyGroup = 'SAFEHOUSES' | 'BUSINESSES' | 'OPERATIONS' | 'SPECIALIST';

export interface PropertyEntry {
  slug: string;
  title: string;
  group: PropertyGroup;
  groupLabel: string;
  update: string;
  released: string;
  releasedIso: string;
  availableFrom: string;
  basePrice: string;
  capacity: string;
  summary: string;
  bestFor: string;
  benefits: string[];
  buyGuide: string[];
  image: string;
  imageAlt: string;
  mediaSource: string;
  mapNote: string;
  source: string;
  sourceLabel: string;
}

const source = 'https://www.gtabase.com/gta-online/property-types/';

export const PROPERTY_ENTRIES: PropertyEntry[] = [
  {
    slug: 'mansions', title: 'Mansions', group: 'SAFEHOUSES', groupLabel: 'Safehouse', update: 'A Safehouse in the Hills', released: 'December 10, 2025', releasedIso: '2025-12-10', availableFrom: 'Prix Luxury Real Estate', basePrice: 'From GTA$11,500,000', capacity: 'Luxury safehouse + Art Studio option',
    summary: 'The endgame safehouse class: large custom residences with an AI concierge, high-end amenities and the Art Studio expansion used to host the Kortz Center Heist.', bestFor: 'Players with a deep bankroll who want the newest solo-heist base and a premium home.',
    benefits: ['Host the Kortz Center Heist after adding the Art Studio', 'AI Assistant supports personal and professional tasks', 'Custom rooms, vehicles, security and lifestyle upgrades', 'Functions as a high-end spawn point and crew base'],
    buyGuide: ['Buy a mansion through Prix Luxury Real Estate', 'Add the Art Studio if you want to host the Kortz Center Heist', 'Treat the base price and upgrades as separate costs before purchasing'],
    image: '/images/properties/real/mansions.jpg', imageAlt: 'Real GTA Online screenshot representing the Mansions property class', mediaSource: 'https://www.gtabase.com/properties/gta-online/types/mansions', mapNote: 'Mansions occupy premium Los Santos neighborhoods. Use the city map to compare the three locations before committing to a view or route.', source, sourceLabel: 'GTA Online property types guide via GTA Base',
  },
  {
    slug: 'apartments', title: 'Apartments', group: 'SAFEHOUSES', groupLabel: 'Safehouse', update: 'Game Launch', released: 'October 1, 2013', releasedIso: '2013-10-01', availableFrom: 'Dynasty 8 Real Estate', basePrice: 'GTA$80,000–500,000+', capacity: '2–10 vehicle garage by tier',
    summary: 'The foundational home class. Apartments provide personal quarters, a garage and—at high-end level—the planning room for the original apartment heists.', bestFor: 'New players who need a home, garage and access to the classic heist chain.',
    benefits: ['Set a spawn point and access wardrobe, shower and sleeping', 'High-End apartments unlock the original Heist planning room', 'Garage capacity depends on the apartment tier', 'Useful as a low-cost base before buying an operation'],
    buyGuide: ['Buy through Dynasty 8 Real Estate', 'Choose High-End if heist hosting matters', 'Compare garage capacity and location, not just the price'],
    image: '/images/properties/real/apartments.jpg', imageAlt: 'Real GTA Online screenshot of a high-end apartment interior', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/apartments', mapNote: 'High-End apartments are spread across Los Santos. A central location shortens early setup drives, but the planning room is the key purchase decision.', source, sourceLabel: 'Apartments guide via GTA Base',
  },
  {
    slug: 'garages', title: 'Garages', group: 'SAFEHOUSES', groupLabel: 'Vehicle storage', update: 'Game Launch', released: 'October 1, 2013', releasedIso: '2013-10-01', availableFrom: 'Dynasty 8 Garage', basePrice: 'GTA$25,000–150,000', capacity: '2, 6 or 10 vehicles by tier',
    summary: 'Dedicated vehicle storage for players who need garage slots without paying for living space or a business operation.', bestFor: 'Collectors expanding storage on a focused budget.',
    benefits: ['Adds personal vehicle slots', 'Can be used as a spawn location', 'Includes radio and TV', 'Lower cost than buying a business property'],
    buyGuide: ['Shop through Dynasty 8 Garage', 'Use the capacity filter first', 'Buy a full safehouse instead if you also need heist access or personal quarters'],
    image: '/images/properties/real/garages.jpg', imageAlt: 'Real GTA Online screenshot of a high-end vehicle garage', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/garages', mapNote: 'Garage locations are a convenience choice. Favor an area near your usual businesses or vehicle work rather than paying for a distant aesthetic.', source, sourceLabel: 'Garages guide via GTA Base',
  },
  {
    slug: 'galaxy-super-yacht', title: 'Galaxy Super Yacht', group: 'SPECIALIST', groupLabel: 'Lifestyle asset', update: 'Executives and Other Criminals', released: 'December 15, 2015', releasedIso: '2015-12-15', availableFrom: 'DockTease', basePrice: 'GTA$6,000,000–10,000,000', capacity: 'Personal yacht with watercraft',
    summary: 'A mobile luxury base with a full set of A Superyacht Life missions, boat access and a customizable presence on the coast.', bestFor: 'Veteran players who want lifestyle content and a movable maritime base.',
    benefits: ['Unlocks A Superyacht Life missions', 'Stores and spawns selected watercraft', 'Customizable yacht position and styling', 'Acts as a high-end social and spawn location'],
    buyGuide: ['Buy through DockTease', 'Select the yacht model and optional upgrades carefully', 'Remember it is a lifestyle asset, not a primary business income engine'],
    image: '/images/properties/real/galaxy-super-yacht.jpg', imageAlt: 'Real GTA Online screenshot of the Galaxy Super Yacht', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/galaxy-super-yacht', mapNote: 'The yacht can be repositioned offshore. The Los Santos atlas is useful for understanding the coastline and mission travel rather than a fixed property commute.', source, sourceLabel: 'Galaxy Super Yacht guide via GTA Base',
  },
  {
    slug: 'executive-offices', title: 'Executive Offices', group: 'OPERATIONS', groupLabel: 'Business base', update: 'Further Adventures in Finance and Felony', released: 'June 7, 2016', releasedIso: '2016-06-07', availableFrom: 'Dynasty 8 Executive', basePrice: 'GTA$1,000,000–4,000,000', capacity: 'CEO organization hub',
    summary: 'The CEO command center for Special Cargo and Vehicle Cargo. Office location and garage floors can scale with a growing criminal organization.', bestFor: 'Players building a serious cargo operation and wanting CEO access.',
    benefits: ['Register as a CEO and access SecuroServ work', 'Launch Special Cargo and Vehicle Cargo businesses', 'Optional office garages and custom office upgrades', 'Office assistant and organization management terminal'],
    buyGuide: ['Buy through Dynasty 8 Executive', 'Pick a location based on warehouse routes and garage plans', 'Buy a Cargo Warehouse next if you want the office to generate money'],
    image: '/images/properties/real/executive-offices.jpg', imageAlt: 'Real GTA Online screenshot of an Executive Office', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/offices', mapNote: 'Office locations sit in the city core. Use the atlas to compare the drive to your intended cargo warehouses and airport routes.', source, sourceLabel: 'Executive Offices guide via GTA Base',
  },
  {
    slug: 'executive-office-garages', title: 'Executive Office Garages', group: 'SAFEHOUSES', groupLabel: 'Vehicle storage', update: 'Further Adventures in Finance and Felony', released: 'June 7, 2016', releasedIso: '2016-06-07', availableFrom: 'Office renovation menu', basePrice: 'Upgrade pricing varies', capacity: 'Up to 60 vehicles across 3 floors',
    summary: 'Multi-floor vehicle storage attached to an Executive Office, with workshop options and room for a serious collection.', bestFor: 'CEO players who want their garage and business command center in one place.',
    benefits: ['Adds up to three office garage floors', 'Large-scale personal vehicle storage', 'Optional custom auto shop and vehicle access', 'Convenient office-to-garage travel loop'],
    buyGuide: ['Own an Executive Office first', 'Add floors from the office renovation screen', 'Budget for storage expansions separately from the office purchase'],
    image: '/images/properties/real/executive-office-garages.jpg', imageAlt: 'Real GTA Online screenshot of an Executive Office Garage', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/office-garages', mapNote: 'Office garages share the office map location. Their value is convenience and capacity, so compare the office commute before adding floors.', source, sourceLabel: 'Office Garages guide via GTA Base',
  },
  {
    slug: 'special-cargo-warehouses', title: 'Special Cargo Warehouses', group: 'BUSINESSES', groupLabel: 'Cargo business', update: 'Further Adventures in Finance and Felony', released: 'June 7, 2016', releasedIso: '2016-06-07', availableFrom: 'SecuroServ / CEO office', basePrice: 'GTA$250,000–3,500,000', capacity: '16, 42 or 111 crates per warehouse',
    summary: 'CEO warehouses hold Special Cargo crates for sourcing and sell missions. Larger warehouses offer better sale scale but demand more working capital.', bestFor: 'Active CEO players who like sourcing and selling on their own schedule.',
    benefits: ['Source and sell Special Cargo', 'Large warehouses support high-value stock runs', 'Warehouses can be managed from the CEO office', 'Cargo also contributes to some Nightclub warehouse production'],
    buyGuide: ['Own an Executive Office', 'Buy a small, medium or large warehouse through the office laptop', 'Choose routes that keep sourcing and selling travel manageable'],
    image: '/images/properties/real/special-cargo-warehouses.jpg', imageAlt: 'Real GTA Online screenshot of a Special Cargo Warehouse', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/warehouses', mapNote: 'Warehouse location changes how much time is spent on sourcing and sales. Use the atlas to avoid a scattered route network.', source, sourceLabel: 'Special Cargo Warehouses guide via GTA Base',
  },
  {
    slug: 'vehicle-warehouses', title: 'Vehicle Warehouses', group: 'BUSINESSES', groupLabel: 'Cargo business', update: 'Import/Export', released: 'December 13, 2016', releasedIso: '2016-12-13', availableFrom: 'SecuroServ / CEO office', basePrice: 'From GTA$1,500,000', capacity: '40 special vehicles',
    summary: 'The Import/Export property for stealing, storing and exporting high-end cars, plus access to Special Vehicle Work.', bestFor: 'Active drivers who want a direct sell loop with a useful vehicle roster.',
    benefits: ['Store and export sourced vehicles', 'Unlocks Special Vehicle Work', 'High-end vehicle rotation supports efficient sourcing', 'Useful bridge between CEO work and a personal vehicle collection'],
    buyGuide: ['Own an Executive Office', 'Buy a Vehicle Warehouse from the office laptop', 'Prioritize a central location if you plan to repeat source-and-sell cycles'],
    image: '/images/properties/real/vehicle-warehouses.jpg', imageAlt: 'Real GTA Online screenshot of a Vehicle Warehouse', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/vehicle-warehouses', mapNote: 'Vehicle warehouses are fixed city locations. Compare the warehouse-to-customs and warehouse-to-sale routes before buying.', source, sourceLabel: 'Vehicle Warehouses guide via GTA Base',
  },
  {
    slug: 'mc-clubhouses', title: 'MC Clubhouses', group: 'OPERATIONS', groupLabel: 'Business base', update: 'Bikers', released: 'October 4, 2016', releasedIso: '2016-10-04', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$200,000–495,000', capacity: 'Motorcycle Club hub',
    summary: 'The Motorcycle Club base that unlocks biker businesses, contracts and a custom clubhouse workshop.', bestFor: 'Players planning to run multiple biker businesses or use motorcycles as their main operation.',
    benefits: ['Register as an MC President', 'Buy and manage five MC businesses', 'Unlock clubhouse contracts and a bike workshop', 'Choose optional customizations and sleeping quarters'],
    buyGuide: ['Buy a clubhouse through Maze Bank Foreclosures', 'Pick a location near your intended MC businesses', 'Do not overspend on cosmetics before buying a profitable business'],
    image: '/images/properties/real/mc-clubhouses.jpg', imageAlt: 'Real GTA Online screenshot of an MC Clubhouse boardroom', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/mc-clubhouses', mapNote: 'Clubhouses are a management hub, so a central city or highway location reduces travel between biker businesses.', source, sourceLabel: 'MC Clubhouses guide via GTA Base',
  },
  {
    slug: 'mc-businesses', title: 'MC Businesses', group: 'BUSINESSES', groupLabel: 'Biker businesses', update: 'Bikers', released: 'October 4, 2016', releasedIso: '2016-10-04', availableFrom: 'Open Road laptop in an MC Clubhouse', basePrice: 'GTA$650,000–975,000 each', capacity: 'Five business types',
    summary: 'The biker production network: Cocaine Lockup, Meth Lab, Counterfeit Cash, Weed Farm and Document Forgery Office.', bestFor: 'Nightclub owners who want feeder businesses, or players building a broad passive-production network.',
    benefits: ['Produce stock from supplies and sell it', 'Five business types with different costs and value', 'Active businesses feed Nightclub technicians', 'Upgrades improve production and security'],
    buyGuide: ['Own an MC Clubhouse', 'Buy a business through the Open Road laptop', 'Prioritize Cocaine, Meth and Counterfeit Cash before lower-value options'],
    image: '/images/properties/real/mc-businesses.jpg', imageAlt: 'Real GTA Online screenshot of an MC Meth Lab business', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/mc-businesses', mapNote: 'MC businesses sit across city and desert sites. Use the atlas to compare supply, resupply and sale distances before buying several.', source, sourceLabel: 'MC Businesses guide via GTA Base',
  },
  {
    slug: 'bunkers', title: 'Bunkers', group: 'BUSINESSES', groupLabel: 'Weapons business', update: 'Gunrunning', released: 'June 13, 2017', releasedIso: '2017-06-13', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$1,165,000–2,375,000', capacity: 'Weapon research + stock production',
    summary: 'A weapons facility that turns supplies into sellable stock, unlocks research and supports the Mobile Operations Center.', bestFor: 'Players who want passive production plus research for weaponized upgrades.',
    benefits: ['Manufacture and sell weapons stock', 'Research weaponized vehicles and upgrades', 'Unlock Mobile Operations Center access', 'Staff can be assigned between production and research'],
    buyGuide: ['Buy a bunker through Maze Bank Foreclosures', 'Favor Chumash or Farmhouse for practical sale routes', 'Buy staff and equipment upgrades before cosmetic extras'],
    image: '/images/properties/real/bunkers.jpg', imageAlt: 'Real GTA Online screenshot of a Gunrunning Bunker', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/bunkers', mapNote: 'Bunker placement matters. Coastal or southern locations generally reduce the longest Los Santos sale drives compared with far-north options.', source, sourceLabel: 'Bunkers guide via GTA Base',
  },
  {
    slug: 'hangars', title: 'Hangars', group: 'OPERATIONS', groupLabel: 'Aircraft base', update: 'Smuggler’s Run', released: 'August 29, 2017', releasedIso: '2017-08-29', availableFrom: 'Maze Bank Foreclosures', basePrice: 'From GTA$1,200,000', capacity: 'Aircraft storage + Air Freight Cargo',
    summary: 'An aircraft base and Air Freight Cargo operation with workshop options, Fort Zancudo access and a large aircraft collection.', bestFor: 'Pilots, aircraft collectors and players who want military-base access.',
    benefits: ['Store and customize aircraft', 'Run Air Freight Cargo missions', 'Fort Zancudo hangars offer base access without a wanted level', 'Optional workshop and living quarters'],
    buyGuide: ['Buy through Maze Bank Foreclosures', 'Choose Fort Zancudo for access or LSIA for city convenience', 'Buy the aircraft workshop only if you will use aircraft customization'],
    image: '/images/properties/real/hangars.jpg', imageAlt: 'Real GTA Online screenshot of a Smuggler’s Run Hangar with aircraft', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/hangars', mapNote: 'The atlas makes the LSIA-versus-Fort-Zancudo choice obvious: one is central to Los Santos, the other is closer to northern operations and military access.', source, sourceLabel: 'Hangars guide via GTA Base',
  },
  {
    slug: 'facilities', title: 'Facilities', group: 'OPERATIONS', groupLabel: 'Heist base', update: 'The Doomsday Heist', released: 'December 12, 2017', releasedIso: '2017-12-12', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$1,250,000–2,950,000', capacity: 'Doomsday Heist base + 7-car garage',
    summary: 'The underground operations base for hosting all three Doomsday Heist acts, with orbital, Avenger and weaponized-vehicle upgrades.', bestFor: 'Two-to-four-player crews who want the Doomsday Heist and advanced military hardware.',
    benefits: ['Host The Doomsday Heist', 'Store and operate the Avenger', 'Optional orbital cannon and security room', 'Garage space for specialized vehicles'],
    buyGuide: ['Buy through Maze Bank Foreclosures', 'Choose a location based on access to the city and your Doomsday crew', 'Treat the Avenger and orbital cannon as separate major purchases'],
    image: '/images/properties/real/facilities.jpg', imageAlt: 'Real GTA Online screenshot inside a Facility garage', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/facilities', mapNote: 'Facilities are spread from the city edge to Paleto Bay. A southern location saves time on most Doomsday prep travel.', source, sourceLabel: 'Facilities guide via GTA Base',
  },
  {
    slug: 'nightclubs', title: 'Nightclubs', group: 'BUSINESSES', groupLabel: 'Business hub', update: 'After Hours', released: 'July 24, 2018', releasedIso: '2018-07-24', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$1,080,000–1,700,000', capacity: 'Popularity safe + 5 warehouse technicians',
    summary: 'A popularity business and warehouse hub that consolidates product from other businesses into one sale operation.', bestFor: 'Established owners with Bunker, MC, Cargo or Hangar feeder businesses.',
    benefits: ['Safe income from nightclub popularity', 'Warehouse technicians accrue multiple product types', 'Terrorbyte can be stored and used from the nightclub', 'Sell consolidated stock through one delivery operation'],
    buyGuide: ['Buy through Maze Bank Foreclosures', 'Choose a central location with practical delivery routes', 'Hire technicians and connect feeder businesses before judging warehouse output'],
    image: '/images/properties/real/nightclubs.jpg', imageAlt: 'Real GTA Online screenshot of a Nightclub interior', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/nightclubs', mapNote: 'Nightclub location affects delivery convenience. A central Los Santos site is usually easier to live with than a remote beach or desert location.', source, sourceLabel: 'Nightclubs guide via GTA Base',
  },
  {
    slug: 'arena-workshop', title: 'Arena Workshop', group: 'SPECIALIST', groupLabel: 'Vehicle workshop', update: 'Arena War', released: 'December 11, 2018', releasedIso: '2018-12-11', availableFrom: 'Maze Bank Foreclosures', basePrice: 'From GTA$995,000', capacity: 'Arena vehicles + workshop',
    summary: 'The specialist workshop for Arena War vehicles, weaponized conversions and a large set of mechanical upgrades.', bestFor: 'Players who enjoy custom combat vehicles and Arena War progression.',
    benefits: ['Customize Arena War vehicles', 'Unlock vehicle workshop upgrades and weapon mechanics', 'Optional personal garage and spectator features', 'Access to Arena War career content'],
    buyGuide: ['Buy through Maze Bank Foreclosures', 'Add the Weapons Expert or Benny’s Mechanic based on your vehicle plans', 'Keep a separate budget for conversion and weapon costs'],
    image: '/images/properties/real/arena-workshop.jpg', imageAlt: 'Real GTA Online screenshot of the Arena Workshop', mediaSource: 'https://www.gtabase.com/gta-online/properties/arena-war-workshop', mapNote: 'The Arena Workshop is at Maze Bank Arena in South Los Santos. The atlas helps plan quick routes to vehicle testing and city garages.', source, sourceLabel: 'Arena Workshop guide via GTA Base',
  },
  {
    slug: 'diamond-casino-penthouse', title: 'Diamond Casino Penthouse', group: 'SAFEHOUSES', groupLabel: 'Safehouse', update: 'The Diamond Casino & Resort', released: 'July 23, 2019', releasedIso: '2019-07-23', availableFrom: 'The Diamond Casino & Resort', basePrice: 'From GTA$1,500,000', capacity: 'Luxury suite + optional rooms',
    summary: 'A customizable casino suite with access to Casino Story missions, management privileges and a premium spawn location.', bestFor: 'Players who want casino story content, a luxury suite and access to casino features.',
    benefits: ['Unlock Casino Story missions', 'Optional garage, private dealer, arcade games and media room', 'Access to casino management content', 'Set the Penthouse as a spawn location'],
    buyGuide: ['Purchase through the Diamond Casino website', 'Buy only the rooms you will use', 'Do not confuse Penthouse ownership with Arcade ownership—the Arcade hosts the Casino Heist'],
    image: '/images/properties/real/diamond-casino-penthouse.jpg', imageAlt: 'Real GTA Online screenshot of the Diamond Casino Penthouse', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/master-penthouse-the-diamond', mapNote: 'The Penthouse is in Vinewood at the Casino. Use the city atlas to plan nearby Arcade, Nightclub and central-city routes.', source, sourceLabel: 'Diamond Casino Penthouse guide via GTA Base',
  },
  {
    slug: 'retro-arcades', title: 'Retro Arcades', group: 'OPERATIONS', groupLabel: 'Heist base', update: 'The Diamond Casino Heist', released: 'December 12, 2019', releasedIso: '2019-12-12', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$1,235,000–2,530,000', capacity: 'Casino Heist planning + machines',
    summary: 'The planning base for The Diamond Casino Heist, with arcade machines, a basement command center and optional Master Control Terminal.', bestFor: 'Crews replaying the Casino Heist or owners who want one terminal for multiple businesses.',
    benefits: ['Host The Diamond Casino Heist', 'Generate small passive arcade income', 'Optional Master Control Terminal', 'Basement supports a Terrorbyte and Drone Station upgrades'],
    buyGuide: ['Buy through Maze Bank Foreclosures after meeting Lester', 'Choose a location near the Casino or your usual city routes', 'Add the Master Control Terminal only after you own multiple operations'],
    image: '/images/properties/real/retro-arcades.jpg', imageAlt: 'Real GTA Online screenshot of a Retro Arcade used for the Casino Heist', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/arcade-property', mapNote: 'Arcade placement is a convenience decision. The atlas helps compare the drive to the Casino, which you will repeat throughout the heist chain.', source, sourceLabel: 'Retro Arcades guide via GTA Base',
  },
  {
    slug: 'auto-shops', title: 'Auto Shops', group: 'BUSINESSES', groupLabel: 'Vehicle business', update: 'Los Santos Tuners', released: 'July 20, 2021', releasedIso: '2021-07-20', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$1,670,000–1,920,000', capacity: 'Contracts + customer vehicle bays',
    summary: 'A vehicle business with robbery-style Contracts, customer car service, Exotic Exports and practical tuning unlocks.', bestFor: 'Players who prefer active solo-friendly vehicle work.',
    benefits: ['Launch six multi-mission Auto Shop Contracts', 'Service and deliver customer vehicles', 'Unlock discounted vehicle modifications', 'Optional staff, lifts, living quarters and car lift upgrades'],
    buyGuide: ['Visit the LS Car Meet and meet Mimi', 'Buy through Maze Bank Foreclosures', 'Choose a central location to make Contract and customer deliveries shorter'],
    image: '/images/properties/real/auto-shops.jpg', imageAlt: 'Real GTA Online screenshot of an Auto Shop', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/auto-shops', mapNote: 'Auto Shop locations are city-focused. Use the atlas to compare Contract starts, customer deliveries and nearby vehicle modification routes.', source, sourceLabel: 'Auto Shops guide via GTA Base',
  },
  {
    slug: 'celebrity-solutions-agency', title: 'Celebrity Solutions Agency', group: 'OPERATIONS', groupLabel: 'Mission base', update: 'The Contract', released: 'December 15, 2021', releasedIso: '2021-12-15', availableFrom: 'Dynasty 8 Executive', basePrice: 'GTA$2,010,000–2,830,000', capacity: 'VIP Contract base + vehicle workshop',
    summary: 'Franklin’s Agency base for The Contract, Security Contracts, Payphone Hits and a set of useful vehicle and weapon services.', bestFor: 'Solo players who want repeatable mission income and a flexible all-rounder property.',
    benefits: ['Launch The Dr. Dre VIP Contract', 'Run Security Contracts and Payphone Hits', 'Optional vehicle workshop for Imani Tech', 'Armory provides weapon upgrades and loadout access'],
    buyGuide: ['Watch the introductory cutscene at the LS Golf Club', 'Buy through Dynasty 8 Executive', 'Add the Armory and Vehicle Workshop if you want the Agency’s strongest utility'],
    image: '/images/properties/real/celebrity-solutions-agency.jpg', imageAlt: 'Real GTA Online screenshot of the Celebrity Solutions Agency', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/the-agency', mapNote: 'Agency locations are all in Los Santos. A central site helps with Security Contract and Payphone Hit travel, while the cheapest site is still functional.', source, sourceLabel: 'Agency guide via GTA Base',
  },
  {
    slug: 'salvage-yards', title: 'Salvage Yards', group: 'BUSINESSES', groupLabel: 'Vehicle business', update: 'The Chop Shop', released: 'December 12, 2023', releasedIso: '2023-12-12', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$1,620,000–2,690,000', capacity: 'Salvage bays + Tow Truck work',
    summary: 'A vehicle theft and dismantling operation built around Salvage Yard Robberies, tow jobs and rotating high-value vehicles.', bestFor: 'Players who want varied vehicle jobs with solo-friendly robberies.',
    benefits: ['Launch Salvage Yard Robberies', 'Tow vehicles for active income', 'Salvage and sell recovered vehicles', 'Optional staff, storage and vehicle lift upgrades'],
    buyGuide: ['Buy through Maze Bank Foreclosures after meeting Yusuf Amir', 'Choose a location that fits your preferred city route', 'Add the Tow Truck and staff only after learning the robbery loop'],
    image: '/images/properties/real/salvage-yards.jpg', imageAlt: 'Real GTA Online screenshot of a Salvage Yard', mediaSource: 'https://www.gtabase.com/gta-online/property-types/salvage-yards', mapNote: 'Salvage Yard locations range across Los Santos and Blaine County. Use the atlas to compare tow-job density and robbery travel.', source, sourceLabel: 'Salvage Yards guide via GTA Base',
  },
  {
    slug: 'bail-enforcement-offices', title: 'Bail Enforcement Offices', group: 'BUSINESSES', groupLabel: 'Mission base', update: 'Bottom Dollar Bounties', released: 'June 25, 2024', releasedIso: '2024-06-25', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$1,650,000–2,620,000', capacity: 'Bail office + bounty board',
    summary: 'A bounty-hunting office for Most Wanted targets, standard bounties and a small passive safe once upgrades are added.', bestFor: 'Players who enjoy target pursuit missions and changing combat scenarios.',
    benefits: ['Launch Most Wanted targets', 'Run standard bounty missions', 'Optional agents increase passive safe income', 'Optional Armory and personal quarters'],
    buyGuide: ['Buy through Maze Bank Foreclosures', 'Select a city location that keeps bounty routes manageable', 'Recruit agents and buy the Armory only after testing the activity'],
    image: '/images/properties/real/bail-enforcement-offices.jpg', imageAlt: 'Real GTA Online screenshot of a Bottom Dollar Bail Enforcement Office', mediaSource: 'https://www.gtabase.com/gta-online/property-types/bottom-dollar-bail-enforcement', mapNote: 'Bail targets can span the whole state. A central office reduces average travel across Los Santos and Blaine County.', source, sourceLabel: 'Bail Enforcement Offices guide via GTA Base',
  },
  {
    slug: 'darnell-bros-garment-factory', title: 'Darnell Bros Garment Factory', group: 'OPERATIONS', groupLabel: 'Mission base', update: 'A Safehouse in the Hills', released: 'December 10, 2025', releasedIso: '2025-12-10', availableFrom: 'Maze Bank Foreclosures', basePrice: 'GTA$2,350,000', capacity: 'FIB Files base + planning room',
    summary: 'The garment factory base for FIB Files, a replayable set of infiltration missions with a planning board and specialist prep work.', bestFor: 'Solo players who want structured infiltration missions and a new city operations base.',
    benefits: ['Launch the FIB Files mission series', 'Plan repeatable infiltration operations', 'Access specialist prep and support options', 'Provides a dedicated spawn and mission base'],
    buyGuide: ['Complete the introduction to A Safehouse in the Hills', 'Buy the factory through Maze Bank Foreclosures', 'Learn the prep board before spending on optional upgrades'],
    image: '/images/properties/real/darnell-bros-garment-factory.jpg', imageAlt: 'Real GTA Online screenshot of the Darnell Bros Garment Factory', mediaSource: 'https://www.gtabase.com/properties/gta-online/darnell-bros-garment-factory', mapNote: 'The factory is a city operation. Use the atlas to plan the approach from your safehouse and the repeat FIB File locations.', source, sourceLabel: 'Darnell Bros Garment Factory guide via GTA Base',
  },
  {
    slug: 'money-fronts-businesses', title: 'Money Fronts Businesses', group: 'BUSINESSES', groupLabel: 'Business network', update: 'Money Fronts', released: 'June 17, 2026', releasedIso: '2026-06-17', availableFrom: 'Money Fronts / Maze Bank Foreclosures', basePrice: 'Varies by front; upgrades extra', capacity: 'Car Wash + two linked fronts',
    summary: 'A laundering network built from a Car Wash and connected fronts, adding legitimate-looking operations and new mission loops to the business portfolio.', bestFor: 'Established players who want newer solo-friendly business content and a network that complements existing operations.',
    benefits: ['Run the Hands On Car Wash front', 'Unlock linked Smoke on the Water and Higgins Helitours fronts', 'Launch Money Laundering missions and related activities', 'Use the network to support newer weekly business rotations'],
    buyGuide: ['Complete the Money Fronts introduction', 'Buy the Car Wash first, then evaluate linked front purchases', 'Treat each front as part of a network rather than a standalone passive business'],
    image: '/images/properties/real/money-fronts-businesses.jpg', imageAlt: 'Real GTA Online screenshot representing the Money Fronts business network', mediaSource: 'https://www.gtabase.com/properties/gta-online/types/money-fronts', mapNote: 'The fronts are spread around Los Santos. Use the atlas to plan a loop between the Car Wash, Smoke on the Water and Higgins Helitours.', source, sourceLabel: 'Money Fronts guide via GTA Base',
  },
  {
    slug: 'large-vehicle-properties', title: 'Large Vehicle Properties', group: 'SPECIALIST', groupLabel: 'Mobile operations', update: 'Multiple updates', released: '2016–2020', releasedIso: '2016-12-13', availableFrom: 'Warstock Cache & Carry', basePrice: 'GTA$1,225,000–3,450,000+', capacity: 'Mobile command, aircraft or submarine',
    summary: 'The mobile operations class: Mobile Operations Center, Avenger, Terrorbyte and Kosatka, each built around a different service or progression path.', bestFor: 'Players whose next purchase is a vehicle-based workshop, command center or Cayo Perico base.',
    benefits: ['Mobile Operations Center supports bunker-linked operations', 'Avenger provides aircraft command and workshop functions', 'Terrorbyte manages several businesses and Oppressor Mk II upgrades', 'Kosatka hosts The Cayo Perico Heist'],
    buyGuide: ['Match the purchase to your current business network', 'Buy the Kosatka first if solo heist income is the priority', 'Budget for vehicle-specific workshops and upgrades separately'],
    image: '/images/properties/real/large-vehicle-properties.jpg', imageAlt: 'Real GTA Online screenshot of a large mobile operations vehicle', mediaSource: 'https://www.gtabase.com/grand-theft-auto-v/guides/property-types/command-centers', mapNote: 'Mobile assets move around the map, but their support missions still use Los Santos routes. The atlas is most useful for planning bunker, nightclub and Cayo staging.', source, sourceLabel: 'Large Vehicle Properties guide via GTA Base',
  },
];

export const PROPERTY_GROUPS: { key: 'ALL' | PropertyGroup; label: string; count: number }[] = [
  { key: 'ALL', label: `All properties · ${PROPERTY_ENTRIES.length}`, count: PROPERTY_ENTRIES.length },
  { key: 'SAFEHOUSES', label: 'Safehouses & storage', count: PROPERTY_ENTRIES.filter((property) => property.group === 'SAFEHOUSES').length },
  { key: 'BUSINESSES', label: 'Businesses', count: PROPERTY_ENTRIES.filter((property) => property.group === 'BUSINESSES').length },
  { key: 'OPERATIONS', label: 'Operations', count: PROPERTY_ENTRIES.filter((property) => property.group === 'OPERATIONS').length },
  { key: 'SPECIALIST', label: 'Specialist assets', count: PROPERTY_ENTRIES.filter((property) => property.group === 'SPECIALIST').length },
];
