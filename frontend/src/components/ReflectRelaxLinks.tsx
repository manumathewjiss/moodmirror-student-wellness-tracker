function SpotifyGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.399.099-.801-.141-.891-.539-.099-.421.141-.78.54-.879 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.78-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
      />
    </svg>
  );
}

function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
      />
    </svg>
  );
}

type ReflectRelaxLinksProps = {
  spotifyUrl: string;
  youtubeUrl: string;
  panelClass: string;
  accentClass: string;
};

export default function ReflectRelaxLinks({
  spotifyUrl,
  youtubeUrl,
  panelClass,
  accentClass,
}: ReflectRelaxLinksProps) {
  const linkBase =
    "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunburst/80";

  return (
    <section
      className={`mb-10 rounded-2xl border px-5 py-5 md:px-6 md:py-6 ${panelClass}`}
      aria-labelledby="reflect-relax-heading"
    >
      <h2 id="reflect-relax-heading" className={`text-base font-semibold ${accentClass}`}>
        Pause &amp; unwind
      </h2>
      <p className="text-foreground-muted text-sm mt-1 mb-4 leading-relaxed">
        A playlist and a short talk—open in a new tab whenever you are ready.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkBase} border-[#1DB954]/40 bg-[#1DB954]/10 text-[#1ed760] hover:border-[#1DB954]/70 hover:bg-[#1DB954]/15`}
        >
          <SpotifyGlyph className="h-6 w-6 shrink-0" />
          <span className="text-left">
            <span className="block text-foreground text-sm font-semibold">Spotify playlist</span>
            <span className="block text-foreground-muted text-xs font-normal">Music for this mood</span>
          </span>
        </a>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkBase} border-red-500/40 bg-red-500/10 text-red-400 hover:border-red-500/70 hover:bg-red-500/15`}
        >
          <YouTubeGlyph className="h-6 w-6 shrink-0" />
          <span className="text-left">
            <span className="block text-foreground text-sm font-semibold">YouTube</span>
            <span className="block text-foreground-muted text-xs font-normal">Speech &amp; motivation</span>
          </span>
        </a>
      </div>
    </section>
  );
}
