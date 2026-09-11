import Link from "next/link";
import { ArrowUpRight, Gauge, Users } from "lucide-react";
import { MediaImage } from "./media-image";
import { money } from "@/lib/utils";
import type { Vehicle, VehicleOffer } from "@/services/types";

export function VehicleCard({
  vehicle,
  offer,
  archived = false,
}: {
  vehicle: Vehicle;
  offer?: VehicleOffer;
  archived?: boolean;
}) {
  return (
    <Link className="ride-card" href={`/gta-online/vehicles/${vehicle.slug}`}>
      <div className="ride-visual">
        <MediaImage
          src={vehicle.image}
          alt={vehicle.name}
          sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw"
        />
        {offer && (
          <span className="offer-chip">
            {offer.discount_percent != null
              ? `${offer.discount_percent}% OFF`
              : "SPECIAL OFFER"}
            {archived ? " · ENDED" : ""}
          </span>
        )}
        <span className="ride-class">{vehicle.vehicle_class}</span>
      </div>
      <div className="ride-copy">
        <p className="eyebrow">{vehicle.manufacturer || "GTA ONLINE"}</p>
        <h3>{vehicle.model_name || vehicle.name}</h3>
        <div className="ride-specs">
          <span>
            <Gauge size={15} />
            {vehicle.top_speed != null
              ? `${vehicle.top_speed} mph`
              : "Speed pending"}
          </span>
          <span>
            <Users size={15} />
            {vehicle.seats ?? "—"} seats
          </span>
        </div>
        <div className="ride-price">
          <div>
            <small>
              {offer
                ? archived
                  ? "Event price"
                  : "This week"
                : "Standard price"}
            </small>
            <strong>{money(offer?.sale_price ?? vehicle.price)}</strong>
            {offer?.sale_price != null &&
              vehicle.price != null &&
              vehicle.price > offer.sale_price && (
                <del>{money(vehicle.price)}</del>
              )}
          </div>
          <span className="ride-open" aria-label="View vehicle details">
            <ArrowUpRight size={20} />
          </span>
        </div>
        {offer && offer.sale_price == null && (
          <p className="muted">{offer.discount_text}</p>
        )}
      </div>
    </Link>
  );
}
