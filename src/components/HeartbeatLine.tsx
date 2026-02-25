import { useEffect, useRef } from "react";

const HeartbeatLine = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    let offset = 0;
    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const draw = () => {
      ctx.clearRect(0, 0, w(), h());
      ctx.strokeStyle = "hsla(43, 96%, 50%, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const mid = h() / 2;
      const segLen = 120;

      for (let x = -segLen; x < w() + segLen; x++) {
        const pos = ((x + offset) % segLen + segLen) % segLen;
        let y = mid;

        if (pos > 50 && pos < 55) y = mid - 20;
        else if (pos > 55 && pos < 60) y = mid + 30;
        else if (pos > 60 && pos < 65) y = mid - 15;
        else if (pos > 65 && pos < 70) y = mid;

        if (x === -segLen) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // glow line
      ctx.strokeStyle = "hsla(43, 96%, 50%, 0.08)";
      ctx.lineWidth = 6;
      ctx.stroke();

      offset -= 0.5;
      requestAnimationFrame(draw);
    };

    const raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
    />
  );
};

export default HeartbeatLine;
