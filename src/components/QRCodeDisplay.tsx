import React from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 160 }) => {
  return <QRCodeSVG value={value} width={size} height={size} />;
};

export default QRCodeDisplay;
