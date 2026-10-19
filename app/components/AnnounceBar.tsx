import { Truck } from "lucide-react";
import { announcement } from "@/app/config/commerce";

/** Barra fina no topo com as condições comerciais (editável no painel; fallback no config). */
export function AnnounceBar({ text }: { text?: string } = {}) {
  const value = (text ?? announcement.text)?.trim();
  if (!announcement.enabled || !value) return null;
  return (
    <div className="announce-bar" role="note">
      <div className="container announce-bar__inner">
        <Truck size={15} aria-hidden="true" />
        <span>{value}</span>
      </div>
    </div>
  );
}
