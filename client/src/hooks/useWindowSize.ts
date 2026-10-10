import { useEffect, useState } from "react";
import type { Size } from "../types/game_types.ts";

function getWindowSize(): Size {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function useWindowSize() {
  const [windowSize, setWindowSize] = useState(getWindowSize());

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(getWindowSize());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export default useWindowSize;
