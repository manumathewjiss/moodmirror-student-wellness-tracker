type ReflectBackdropProps = {
  variant: "sun" | "dew" | "ember" | "mist" | "garden" | "dawn" | "forest";
  className?: string;
};

/**
 * Soft, decorative nature layers (trees, leaves, mist) — pointer-events none.
 */
export default function ReflectBackdrop({ variant, className = "" }: ReflectBackdropProps) {
  const showTrees = variant === "forest" || variant === "garden" || variant === "dew";
  const extraTrees = variant === "forest";
  const showLeaves = variant === "garden" || variant === "dew" || variant === "sun" || variant === "dawn";
  const leafSparse = variant === "dew";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden opacity-[0.4] ${className}`}
      aria-hidden
    >
      <svg className="absolute -bottom-8 left-0 h-64 w-full text-emerald-800/30 md:h-80" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="reflect-hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <path fill="url(#reflect-hill)" d="M0,120 Q300,40 600,100 T1200,80 L1200,200 L0,200 Z" />
      </svg>

      {variant === "sun" && (
        <svg className="absolute right-[8%] top-8 h-40 w-40 text-amber-400/25 md:h-52 md:w-52" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="26" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="50"
              y1="50"
              x2={50 + 40 * Math.cos((deg * Math.PI) / 180)}
              y2={50 + 40 * Math.sin((deg * Math.PI) / 180)}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}

      {showTrees && (
        <div className="absolute bottom-0 left-0 right-0 text-emerald-700/35">
          <TreeIcon className="absolute bottom-0 left-[5%] h-[45%] w-[8%]" />
          <TreeIcon slim className="absolute bottom-0 left-[16%] h-[34%] w-[5%]" />
          <TreeIcon className="absolute bottom-0 right-[14%] h-[42%] w-[7%]" />
          <TreeIcon slim className="absolute bottom-0 right-[6%] h-[32%] w-[5%]" />
        </div>
      )}

      {extraTrees && (
        <div className="absolute bottom-0 left-0 right-0 text-green-900/28">
          <TreeIcon className="absolute bottom-0 left-[30%] h-[52%] w-[8%]" />
          <TreeIcon slim className="absolute bottom-0 left-[46%] h-[40%] w-[5%]" />
          <TreeIcon className="absolute bottom-0 left-[58%] h-[48%] w-[7%]" />
        </div>
      )}

      {(variant === "mist" || variant === "dew" || variant === "dawn") && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,rgba(255,255,255,0.07),transparent_55%)]" />
      )}

      {variant === "ember" && (
        <svg className="absolute bottom-20 left-[8%] h-36 w-36 text-rose-900/20" viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 95 C20 70 25 40 50 15 C75 40 80 70 50 95Z" />
        </svg>
      )}

      {variant === "dawn" && (
        <svg className="absolute left-[10%] top-14 h-28 w-28 text-teal-500/18" viewBox="0 0 60 60">
          <path fill="currentColor" d="M30 5 L35 22 L52 22 L38 32 L44 50 L30 40 L16 50 L22 32 L8 22 L25 22 Z" />
        </svg>
      )}

      {showLeaves && <LeafScatter sparse={leafSparse} floating={variant === "sun" || variant === "dawn"} />}
    </div>
  );
}

function TreeIcon({ className, slim }: { className?: string; slim?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 40 120" preserveAspectRatio="xMidYMax meet">
      <rect x="17" y="72" width={slim ? 5 : 6} height="48" fill="currentColor" opacity="0.45" rx="1" />
      <path
        fill="currentColor"
        opacity="0.4"
        d="M20 6 L40 78 L0 78 Z M20 26 L36 78 L4 78 Z"
      />
    </svg>
  );
}

function LeafScatter({ sparse, floating }: { sparse?: boolean; floating?: boolean }) {
  const n = sparse ? 8 : 14;
  return (
    <svg className="absolute inset-0 text-emerald-600/22" viewBox="0 0 400 320" preserveAspectRatio="none">
      {Array.from({ length: n }, (_, i) => {
        const cx = (i * 67 + 20) % 380;
        const cy = floating ? 30 + (i * 41) % 120 : 160 + (i * 37) % 140;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="12"
            ry="7"
            fill="currentColor"
            transform={`rotate(${i * 41} ${cx} ${cy})`}
          />
        );
      })}
    </svg>
  );
}
