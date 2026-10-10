import { useEffect, useRef } from "react";
import useWindowSize from "../hooks/useWindowSize";
import CanvasRender from "../puzzle_game/canvas_render";

function PuzzleCanvas() {
  const windowSize = useWindowSize();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRender | null>(null);

  useEffect(() => {
    if (canvasRef.current === null) {
      return;
    }

    rendererRef.current = new CanvasRender(canvasRef.current);
    rendererRef.current.render();

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={windowSize.width - 10}
      height={windowSize.height - 10}
      className="border-5 border-bold border-red-300"
    />
  );
}

export default PuzzleCanvas;
