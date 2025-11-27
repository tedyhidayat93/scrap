"use client";

import { useEffect, useState } from "react";

export default function TerminalPreloader() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full inset-0 animate-pulse rounded-lg flex backdrop-blur-lg items-center justify-center bg-primary/80">
      <div className="text-cyan-300 text-shadow-accent font-mono text-lg">
        <span>Analyzing{dots}</span>
      </div>
    </div>
  );
}
