"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "scale-75",
    md: "",
    lg: "scale-125",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`wave-loader ${sizeMap[size]}`} aria-label="Loading">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      {text && (
        <p className="text-sm text-[#666666]">{text}</p>
      )}
    </div>
  );
}

