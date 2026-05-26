"use client";

import { QRCodeSVG } from "qrcode.react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WcQrModalProps {
  uri: string | null;
  onClose: () => void;
}

export function WcQrModal({ uri, onClose }: WcQrModalProps) {
  return (
    <Dialog open={!!uri} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Scan with mobile wallet</DialogTitle>
        </DialogHeader>
        {uri && (
          <div className="flex justify-center p-2">
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={uri} size={280} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
