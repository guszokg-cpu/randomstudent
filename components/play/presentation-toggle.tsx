"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PresentationToggle({ className = "" }: { className?: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setFullscreen(Boolean(document.fullscreenElement));
    handleChange();
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  return (
    <Button
      type="button"
      variant={fullscreen ? "warning" : "light"}
      className={`glow-soft ${className}`}
      onClick={() => void toggleFullscreen()}
    >
      {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      {fullscreen ? "ออกจากเต็มจอ" : "โหมดนำเสนอ"}
    </Button>
  );
}
