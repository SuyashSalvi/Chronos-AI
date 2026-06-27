import Image from "next/image";

const features = [
  {
    icon: "TL",
    title: "Timelines That Explain",
    body: "Move across centuries with filtered events, scenario context, and AI summaries that connect causes to consequences.",
  },
  {
    icon: "MP",
    title: "Historical Map Layers",
    body: "Explore empires, campaigns, cities, and shifting frontiers with GeoJSON points, routes, and territories.",
  },
  {
    icon: "RG",
    title: "Entity Relationship Graphs",
    body: "Trace how people, states, wars, capitals, dynasties, and institutions shaped one another over time.",
  },
  {
    icon: "AI",
    title: "Assisted Historical Reasoning",
    body: "Ask structured questions about causality, compare episodes, and surface evidence from trusted datasets.",
  },
];

const scenarios = [
  {
    name: "Roman Empire",
    period: "27 BCE - 476 CE",
    detail: "Expansion, succession, frontier pressure, civil wars, and imperial cities.",
  },
  {
    name: "Mongol Empire",
    period: "1206 - 1368",
    detail: "Campaign routes, khanates, trade corridors, sieges, and cultural exchange.",
  },
  {
    name: "World War I",
    period: "1914 - 1918",
    detail: "Alliances, fronts, battles, leaders, armistice terms, and geopolitical aftermath.",
  },
];

const timelineEvents = [
  ["44 BCE", "Assassination of Caesar", "Political fracture"],
  ["378", "Battle of Adrianople", "Military shock"],
  ["410", "Sack of Rome", "Symbolic rupture"],
  ["476", "Deposition of Romulus", "Western transition"],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-bone">
      <section className="relative min-h-[92vh] border-b border-white/10">
        <Image
          src="/chronos-hero.png"
          alt="Chronos AI historical map table with timeline and relationship overlays"
          fill
          priority
          sizes="100vw"
          className="hero-image-mask object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,18,20,0.96)_0%,rgba(16,18,20,0.78)_37%,rgba(16,18,20,0.22)_100%)]" />
        <div className="absolute inset-0 map-grid opacity-20" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3 font-semibold tracking-[0.18em] text-bone">
            <span className="grid h-9 w-9 place-items-center border border-brass/70 bg-ink/70 text-sm text-brass shadow-glow">
              C
            </span>
            CHRONOS AI
          </a>
          <div className="hidden items-center gap-8 text-sm text-bone/70 md:flex">
            <a className="transition hover:text-bone" href="#features">
              Features
            </a>
            <a className="transition hover:text-bone" href="#scenarios">
              Scenarios
            </a>
            <a className="transition hover:text-bone" href="#demo">
              Demo
            </a>
            <a className="transition hover:text-bone" href="/timeline">
              Timeline
            </a>
            <a className="transition hover:text-bone" href="/map">
              Map
            </a>
          </div>
        </nav>

        <div id="top" className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-6 pb-24 pt-20 lg:min-h-[72vh] lg:px-8">
          <p className="mb-5 w-fit border border-verdigris/50 bg-verdigris/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-verdigris">
            Historical Intelligence Platform
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-bone sm:text-6xl lg:text-7xl">
            Chronos AI
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-bone/76 sm:text-xl">
            Explore world history through interactive timelines, map layers, entity profiles,
            relationship graphs, and AI-assisted historical reasoning.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="#demo"
              className="inline-flex h-12 items-center justify-center border border-brass bg-brass px-6 text-sm font-semibold text-ink transition hover:bg-[#d6ad67]"
            >
              View demo preview
            </a>
            <a
              href="#scenarios"
              className="inline-flex h-12 items-center justify-center border border-bone/25 bg-bone/5 px-6 text-sm font-semibold text-bone transition hover:border-bone/55 hover:bg-bone/10"
            >
              Explore scenarios
            </a>
            <a
              href="/timeline"
              className="inline-flex h-12 items-center justify-center border border-verdigris/55 bg-verdigris/10 px-6 text-sm font-semibold text-[#9dd8d3] transition hover:bg-verdigris/18"
            >
              Open timeline
            </a>
            <a
              href="/map"
              className="inline-flex h-12 items-center justify-center border border-bone/25 bg-bone/5 px-6 text-sm font-semibold text-bone transition hover:border-bone/55 hover:bg-bone/10"
            >
              Open map
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#171918] px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brass">Core Experience</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-bone sm:text-4xl">
              A research-grade interface for moving through history.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="border border-white/10 bg-white/[0.035] p-6">
                <div className="grid h-11 w-11 place-items-center border border-verdigris/50 bg-verdigris/10 text-xs font-bold text-verdigris">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-bone">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-bone/65">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="scenarios" className="px-6 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-verdigris">Historical Scenarios</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Start with curated worlds. Scale to global datasets.
            </h2>
            <p className="mt-5 text-base leading-7 text-bone/68">
              Chronos is designed to begin with high-signal historical scenarios, then expand across
              Wikidata, Wikipedia, DBpedia, gazetteers, and geospatial sources.
            </p>
          </div>
          <div className="grid gap-4">
            {scenarios.map((scenario) => (
              <article
                key={scenario.name}
                className="grid gap-4 border border-white/10 bg-[#171918] p-5 sm:grid-cols-[180px_1fr]"
              >
                <div>
                  <p className="text-xl font-semibold text-bone">{scenario.name}</p>
                  <p className="mt-2 text-sm text-brass">{scenario.period}</p>
                </div>
                <p className="text-sm leading-6 text-bone/66">{scenario.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="bg-bone px-6 py-20 text-ink lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ember">Demo Preview</p>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
                Search an event, see its place, then follow its consequences.
              </h2>
            </div>
            <div className="flex gap-2 text-xs font-semibold text-ink/65">
              <span className="border border-ink/15 px-3 py-2">Timeline</span>
              <span className="border border-ink/15 px-3 py-2">Map</span>
              <span className="border border-ink/15 px-3 py-2">Graph</span>
            </div>
          </div>

          <div className="grid overflow-hidden border border-ink/15 bg-white shadow-2xl lg:grid-cols-[1fr_0.86fr]">
            <div className="min-h-[420px] border-b border-ink/10 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Scenario</p>
                  <p className="mt-1 text-lg font-semibold">Roman Empire</p>
                </div>
                <div className="border border-ink/15 px-3 py-2 text-sm font-semibold">27 BCE - 476 CE</div>
              </div>
              <div className="mt-8 space-y-5">
                {timelineEvents.map(([year, title, type]) => (
                  <div key={title} className="grid grid-cols-[86px_1fr] gap-4">
                    <p className="pt-1 text-sm font-bold text-ember">{year}</p>
                    <div className="border-l-2 border-verdigris pl-5">
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm text-ink/58">{type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[420px] overflow-hidden bg-[#d8c7a6] p-5">
              <div className="absolute inset-0 opacity-40 map-grid" />
              <div className="relative h-full border border-ink/15 bg-[#eadfc8]/82 p-5">
                <div className="absolute left-[18%] top-[34%] h-3 w-3 bg-ember" />
                <div className="absolute left-[54%] top-[48%] h-3 w-3 bg-verdigris" />
                <div className="absolute left-[69%] top-[22%] h-3 w-3 bg-brass" />
                <div className="absolute left-[18%] top-[35%] h-[2px] w-[38%] rotate-[18deg] bg-ink/30" />
                <div className="absolute left-[53%] top-[47%] h-[2px] w-[22%] -rotate-[42deg] bg-ink/30" />
                <div className="absolute bottom-5 left-5 right-5 border border-ink/15 bg-white/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/50">AI Context</p>
                  <p className="mt-2 text-sm leading-6 text-ink/72">
                    Adrianople links military reforms, Gothic displacement, imperial succession, and
                    the changing structure of Roman frontier defense.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 border-y border-white/10 py-14 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brass">Build the Historical Atlas</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
              Turn historical data into an explorable intelligence layer.
            </h2>
          </div>
          <a
            href="mailto:team@chronos.ai"
            className="inline-flex h-12 shrink-0 items-center justify-center border border-verdigris bg-verdigris px-6 text-sm font-semibold text-white transition hover:bg-[#4da5a2]"
          >
            Request early access
          </a>
        </div>
      </section>
    </main>
  );
}
