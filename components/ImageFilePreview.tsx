"use client";

import { useEffect, useState } from "react";

interface ImageFilePreviewProps {
  file: File | null;
  label: string;
}

export function ImageFilePreview({ file, label }: ImageFilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl) return null;

  return (
    <div
      role="img"
      aria-label={label}
      className="aspect-video w-full max-w-sm rounded-md border bg-muted bg-cover bg-center"
      style={{ backgroundImage: `url(${previewUrl})` }}
    />
  );
}
