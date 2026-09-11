import { CarFront } from "lucide-react";
import {
  getVehicles,
  getWeeklyUpdate,
  getWeeklyOffers,
} from "@/services/public-data";
import { Breadcrumbs } from "@/components/editorial";
import { VehicleBrowser } from "@/components/vehicle-browser";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "GTA Online vehicle garage — prices, stats & weekly deals",
  description:
    "Find your next GTA Online vehicle. Compare images, prices, seats and tested top speeds, and browse current weekly discounts.",
  alternates: { canonical: "/gta-online/vehicles" },
};
export default async function Vehicles({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [vehicles, week, initial] = await Promise.all([
    getVehicles(),
    getWeeklyUpdate(),
    searchParams,
  ]);
  const offers = await getWeeklyOffers(week);
  return (
    <div className="container page-content">
      <Breadcrumbs
        items={[
          { name: "GTA Online", href: "/gta-online" },
          { name: "Vehicles", href: "/gta-online/vehicles" },
        ]}
      />
      <header className="edition-title">
        <div>
          <p className="eyebrow">THE LOS SANTOS GARAGE</p>
          <h1>
            Find your next obsession<span className="accent-text">.</span>
          </h1>
          <p>
            From everyday drivers to your next big purchase. Get to know every
            ride.
          </p>
        </div>
        <span className="garage-count">
          <CarFront size={24} />
          <strong>{vehicles.length}</strong> vehicles
        </span>
      </header>
      <VehicleBrowser vehicles={vehicles} offers={offers} initial={initial} />
    </div>
  );
}
