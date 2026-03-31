import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Pen } from "lucide-react";

export interface SignaturePadHandle {
  /** Returns a base64 PNG data URL, or null if canvas is blank */
  getDataUrl: () => string | null;
  /** Clears the canvas */
  clear: () => void;
  /** Returns true if the user has drawn anything */
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  /** Called whenever the user lifts the pen (stroke end) */
  onChange?: (isEmpty: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onChange, disabled = false, className = "" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [empty, setEmpty] = useState(true);
    const strokeCount = useRef(0);

    const getCtx = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      return ctx;
    };

    const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ("touches" in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const startDrawing = useCallback(
      (e: MouseEvent | TouchEvent) => {
        if (disabled) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const pos = getPos(e, canvas);
        if (!pos) return;
        isDrawing.current = true;
        lastPos.current = pos;
        const ctx = getCtx();
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1a2e";
        ctx.fill();
      },
      [disabled]
    );

    const draw = useCallback(
      (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current || disabled) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const pos = getPos(e, canvas);
        if (!pos || !lastPos.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
      },
      [disabled]
    );

    const stopDrawing = useCallback(() => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      lastPos.current = null;
      strokeCount.current += 1;
      setEmpty(false);
      onChange?.(false);
    }, [onChange]);

    // Resize canvas to match display size on mount and window resize
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Save existing drawing
      const imageData = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        if (imageData) ctx.putImageData(imageData, 0, 0);
      }
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      resizeCanvas();

      // Mouse events
      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", stopDrawing);
      canvas.addEventListener("mouseleave", stopDrawing);

      // Touch events
      canvas.addEventListener("touchstart", startDrawing, { passive: false });
      canvas.addEventListener("touchmove", draw, { passive: false });
      canvas.addEventListener("touchend", stopDrawing);

      window.addEventListener("resize", resizeCanvas);

      return () => {
        canvas.removeEventListener("mousedown", startDrawing);
        canvas.removeEventListener("mousemove", draw);
        canvas.removeEventListener("mouseup", stopDrawing);
        canvas.removeEventListener("mouseleave", stopDrawing);
        canvas.removeEventListener("touchstart", startDrawing);
        canvas.removeEventListener("touchmove", draw);
        canvas.removeEventListener("touchend", stopDrawing);
        window.removeEventListener("resize", resizeCanvas);
      };
    }, [startDrawing, draw, stopDrawing, resizeCanvas]);

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokeCount.current = 0;
      setEmpty(true);
      onChange?.(true);
    }, [onChange]);

    const getDataUrl = useCallback((): string | null => {
      const canvas = canvasRef.current;
      if (!canvas || empty) return null;
      return canvas.toDataURL("image/png");
    }, [empty]);

    const isEmptyFn = useCallback(() => empty, [empty]);

    useImperativeHandle(ref, () => ({ getDataUrl, clear, isEmpty: isEmptyFn }), [
      getDataUrl,
      clear,
      isEmptyFn,
    ]);

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div
          className={`relative rounded-lg border-2 bg-white overflow-hidden ${
            disabled
              ? "border-muted cursor-not-allowed opacity-60"
              : empty
              ? "border-dashed border-amber-300 cursor-crosshair"
              : "border-solid border-green-400 cursor-crosshair"
          }`}
          style={{ height: 180 }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ touchAction: "none" }}
          />
          {empty && !disabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <Pen className="w-6 h-6 text-amber-300 mb-1" />
              <p className="text-xs text-amber-400 font-medium">Sign here</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {empty ? "Draw your signature above" : "Signature captured — clear to redo"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={disabled || empty}
            className="h-7 px-2 text-xs gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </Button>
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
export default SignaturePad;
