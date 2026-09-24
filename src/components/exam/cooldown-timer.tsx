"use client";

import { useEffect, useState } from "react";

type CooldownTimerProps = {
  until: string | Date;
};

export function CooldownTimer({ until }: CooldownTimerProps) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const target = new Date(until).getTime();
    const tick = () => {
      const ms = Math.max(0, target - Date.now());
      const totalMin = Math.ceil(ms / 60_000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [until]);

  return <span>Thi lại sau {label}</span>;
}
