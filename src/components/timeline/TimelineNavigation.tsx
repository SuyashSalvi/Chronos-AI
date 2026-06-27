"use client";

type TimelineNavigationProps = {
  firstYear?: number;
  lastYear?: number;
  onJumpStart: () => void;
  onJumpEnd: () => void;
};

function formatYear(year?: number) {
  if (year === undefined) {
    return "No events";
  }

  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

export function TimelineNavigation({
  firstYear,
  lastYear,
  onJumpStart,
  onJumpEnd,
}: TimelineNavigationProps) {
  return (
    <footer className="flex flex-col gap-3 border-t border-white/10 bg-[#171918] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-bone/62">
        Range: <span className="font-semibold text-bone">{formatYear(firstYear)}</span>
        {" to "}
        <span className="font-semibold text-bone">{formatYear(lastYear)}</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onJumpStart}
          className="h-10 border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-bone/76"
        >
          Earliest
        </button>
        <button
          type="button"
          onClick={onJumpEnd}
          className="h-10 border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-bone/76"
        >
          Latest
        </button>
      </div>
    </footer>
  );
}
