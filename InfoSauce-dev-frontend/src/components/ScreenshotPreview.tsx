"use client";

import { useEffect, useState } from "react";

type ScreenshotPreviewProps = {
  image: File;
};

export default function ScreenshotPreview({
  image,
}: ScreenshotPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(image);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

  return (
    <div className="glassmorphism mt-6 rounded-2xl p-4">
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        Preview
      </p>

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Uploaded screenshot preview"
          className="max-h-96 w-auto rounded-xl border border-white/20 object-contain"
        />
      )}

      <p className="mt-3 text-sm text-muted-foreground">
        {image.name}
      </p>
    </div>
  );
}
