import { QRCodeSVG } from "qrcode.react";

interface QrCodeProps {
  barcode: string;
  size?: number;
  className?: string;
}

// Renders a batch barcode as a scannable QR code with the raw text below it.
export function QrCode({ barcode, size = 96, className }: QrCodeProps) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ""}`}>
      {/* marginSize draws the quiet zone in the code's own white rect instead
          of relying on the page background - without it, dark mode's dark
          background leaves no real border and scanners can't lock onto it. */}
      <QRCodeSVG value={barcode} size={size} marginSize={2} />
      <span className="font-mono text-xs text-muted-foreground">{barcode}</span>
    </div>
  );
}
