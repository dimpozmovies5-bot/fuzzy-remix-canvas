import { X, Download } from "lucide-react";
import { useState } from "react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  title: string;
  poster?: string;
}

export function VideoPlayerModal({ isOpen, onClose, videoUrl, title }: VideoPlayerModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !videoUrl) return null;

  const getEmbedUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch?.[1]) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }
    }
    return url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
      <div className="relative w-full max-w-6xl mx-4">
        <button onClick={onClose} className="absolute -top-10 right-0 text-foreground hover:text-accent transition">
          <X className="w-6 h-6" />
        </button>

        <div className="relative w-full bg-background rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={getEmbedUrl(videoUrl)}
            className="absolute top-0 left-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ border: "none" }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <h3 className="text-foreground font-semibold text-sm">{title}</h3>
        </div>
      </div>
    </div>
  );
}
