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
      <QRCodeSVG value={barcode} size={size} />
      <span className="font-mono text-xs text-muted-foreground">{barcode}</span>
    </div>
  );
}
