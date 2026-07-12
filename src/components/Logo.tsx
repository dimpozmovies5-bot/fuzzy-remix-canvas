export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  return (
    <div className="flex items-center gap-2">
      <img
        src="https://i.postimg.cc/Fs2nssw-m/logo.png"
        alt="LUO CINEMA"
        className={size === "sm" ? "w-8 h-8" : size === "md" ? "w-10 h-10" : size === "lg" ? "w-12 h-12" : "w-16 h-16"}
      />
      <span className={`font-bold gradient-text ${sizeClasses[size]}`}>
        LUO CINEMA
      </span>
    </div>
  );
}
