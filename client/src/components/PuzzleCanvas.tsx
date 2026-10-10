import { useEffect, useRef } from "react";
import CanvasRender from "../puzzle_game/canvas_render";

function PuzzleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current === null) {
      return;
    }

    const renderer = new CanvasRender(canvasRef.current);

    return () => {
      renderer.destroy();
    };
  }, []);

  return (
    <div className="h-dvh w-full border-5 border-red-300">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}

export default PuzzleCanvas;
