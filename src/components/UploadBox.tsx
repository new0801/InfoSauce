import { useEffect, useRef } from "react";

type UploadBoxProps = {
  onFileSelect: (file: File | null) => void;
  resetKey?: number;
};

export default function UploadBox({
  onFileSelect,
  resetKey,
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [resetKey]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    onFileSelect(file);
  }

  return (
    <div className="glassmorphism rounded-2xl p-6">
      <label
        htmlFor="screenshot-upload"
        className="glassmorphism inline-block cursor-pointer rounded-full px-5 py-2 text-sm font-medium text-foreground transition-transform hover:scale-[1.03]"
      >
        Choose a file
      </label>

      <input
        ref={inputRef}
        id="screenshot-upload"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="sr-only"
      />

      <p className="mt-3 text-sm text-muted-foreground">
        Upload a screenshot you want to verify.
      </p>
    </div>
  );
}
