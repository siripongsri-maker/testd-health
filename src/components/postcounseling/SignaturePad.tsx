import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

/**
 * Lightweight canvas signature pad (mouse + touch).
 * Emits a PNG data URL through `onChange` (null when cleared).
 */
export default function SignaturePad({
  onChange,
  height = 160,
  labelClear = "ล้างลายเซ็น",
  hint,
}: {
  onChange: (dataUrl: string | null) => void;
  height?: number;
  labelClear?: string;
  hint?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, [height]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dirty.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) {
      setHasInk(true);
      onChange(canvasRef.current!.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="space-y-1">
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: "none" }}
        className="w-full rounded-xl border-2 border-dashed bg-background"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{hint}</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={clear} disabled={!hasInk}>
          <Eraser className="h-3 w-3 mr-1" />
          {labelClear}
        </Button>
      </div>
    </div>
  );
}
