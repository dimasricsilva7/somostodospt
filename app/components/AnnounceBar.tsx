import { Truck } from "lucide-react";
import { announcement } from "@/app/config/commerce";

/** Barra fina no topo com as condições comerciais (frete grátis + prazo). */
export function AnnounceBar() {
  if (!announcement.enabled || !announcement.text) return null;
  return (
    <div className="announce-bar" role="note">
      <div className="container announce-bar__inner">
        <Truck size={15} aria-hidden="true" />
        <span>{announcement.text}</span>
      </div>
    </div>
  );
}
