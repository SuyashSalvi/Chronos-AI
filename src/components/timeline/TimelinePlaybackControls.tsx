"use client";

type TimelinePlaybackControlsProps = {
  isPlaying: boolean;
  activeIndex: number;
  totalEvents: number;
  speed: number;
  isPrefetching: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSpeedChange: (speed: number) => void;
  onScrub: (index: number) => void;
};

const playbackSpeeds = [0.5, 1, 1.5, 2];

export function TimelinePlaybackControls({
  isPlaying,
  activeIndex,
  totalEvents,
  speed,
  isPrefetching,
  onPlayPause,
  onPrevious,
  onNext,
  onSpeedChange,
  onScrub,
}: TimelinePlaybackControlsProps) {
  const currentPosition = totalEvents === 0 ? 0 : activeIndex + 1;

  return (
    <section className="border-b border-white/10 bg-[#111718] p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#91d9d4]">Playback</p>
          <p className="mt-1 text-sm text-bone/62">
            Scene {currentPosition.toLocaleString()} of {totalEvents.toLocaleString()}
            {isPrefetching ? <span className="text-bone/42"> · Loading next window</span> : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={totalEvents === 0 || activeIndex === 0}
            className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-bone disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous event"
            title="Previous event"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={onPlayPause}
            disabled={totalEvents === 0}
            className="h-10 min-w-24 border border-brass/70 bg-brass/12 px-4 text-sm font-semibold text-[#f0c879] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={totalEvents === 0 || activeIndex >= totalEvents - 1}
            className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[0.04] text-bone disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next event"
            title="Next event"
          >
            {">"}
          </button>

          <div className="flex items-center border border-white/15 bg-white/[0.03]">
            {playbackSpeeds.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSpeedChange(item)}
                className={`h-10 min-w-14 border-r border-white/10 px-3 text-sm font-semibold last:border-r-0 ${
                  speed === item ? "bg-verdigris/22 text-[#91d9d4]" : "text-bone/58"
                }`}
              >
                {item}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalEvents - 1)}
          value={Math.min(activeIndex, Math.max(0, totalEvents - 1))}
          disabled={totalEvents === 0}
          onChange={(event) => onScrub(Number(event.target.value))}
          className="h-2 w-full accent-brass disabled:opacity-40"
          aria-label="Timeline playback position"
        />
        <span className="text-sm font-semibold text-bone/58">
          {Math.round(totalEvents === 0 ? 0 : ((activeIndex + 1) / totalEvents) * 100)}%
        </span>
      </div>
    </section>
  );
}
