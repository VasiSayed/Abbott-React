import React from "react";
import type { Expert } from "../utils/api";

type Props = { experts: Expert[] };

const groupOrder = ["Speaker", "Moderator", "Chairperson", "Chairpersons"]; // fallbacks
function groupExperts(experts: Expert[]) {
  const map = new Map<string, Expert[]>();
  for (const e of [...experts].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name)
  )) {
    const key = (e.role || "Experts").trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  // sort groups by common order then alpha
  const keys = Array.from(map.keys()).sort((a, b) => {
    const ia = groupOrder.indexOf(a);
    const ib = groupOrder.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
  return keys.map((k) => ({ title: k.toUpperCase(), items: map.get(k)! }));
}

export default function ExpertsGrid({ experts }: Props) {
  const groups = groupExperts(experts);
  if (!groups.length) return null;
  return (
    <div className="experts">
      {groups.map((g) => (
        <div key={g.title} className="expert-group">
          <div className="group-title">{g.title}</div>
          {g.items.map((e) => (
            <div className="expert-row" key={e.id}>
              <div className="avatar">
                {e.photo_url ? (
                  <img src={e.photo_url} alt={e.name} />
                ) : (
                  <div className="placeholder" />
                )}
              </div>
              <div className="bio">
                <div className="name">{e.name}</div>
                {e.description && <div className="desc">{e.description}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
