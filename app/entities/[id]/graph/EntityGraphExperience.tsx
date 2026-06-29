"use client";

import { useEffect, useMemo, useState } from "react";

type GraphNode = {
  id: string;
  name: string;
  entity_type: string;
  wikipedia_thumbnail?: string | null;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
};

type EntityGraphExperienceProps = {
  entityId: string;
};

export function EntityGraphExperience({ entityId }: EntityGraphExperienceProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [depth, setDepth] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGraph() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/entities/${entityId}/graph?depth=${depth}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Graph request failed");

        const payload = await response.json();
        if (active) {
          setNodes(Array.isArray(payload.nodes) ? payload.nodes : []);
          setEdges(Array.isArray(payload.edges) ? payload.edges : []);
        }
      } catch {
        if (active) {
          setNodes([]);
          setEdges([]);
          setError("Relationship graph is unavailable.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadGraph();

    return () => {
      active = false;
    };
  }, [depth, entityId]);

  const nodePositions = useMemo(() => {
    const centerX = 360;
    const centerY = 230;
    const radius = 170;
    const positions = new Map<string, { x: number; y: number }>();
    const centerIndex = nodes.findIndex((node) => node.id === entityId);
    const orderedNodes = centerIndex >= 0
      ? [nodes[centerIndex], ...nodes.filter((node) => node.id !== entityId)]
      : nodes;

    orderedNodes.forEach((node, index) => {
      if (index === 0) {
        positions.set(node.id, { x: centerX, y: centerY });
        return;
      }

      const angle = ((index - 1) / Math.max(orderedNodes.length - 1, 1)) * Math.PI * 2;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    return positions;
  }, [entityId, nodes]);

  return (
    <main className="min-h-screen bg-ink text-bone">
      <section className="border-b border-white/10 bg-[#171918] px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <a href={`/entities/${entityId}`} className="text-sm font-semibold uppercase tracking-[0.18em] text-brass">
              Entity Profile
            </a>
            <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">Relationship Graph</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-bone/66">
              Live graph data from `/api/entities/:id/graph`.
            </p>
          </div>
          <select
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
            className="h-11 border border-white/12 bg-[#101214] px-4 text-bone outline-none"
          >
            <option value={1}>Depth 1</option>
            <option value={2}>Depth 2</option>
            <option value={3}>Depth 3</option>
          </select>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        {isLoading ? <p className="text-bone/62">Loading graph...</p> : null}
        {error ? <p className="border border-ember/40 bg-ember/10 p-4 text-[#e99180]">{error}</p> : null}
        {!isLoading && !error ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="overflow-hidden border border-white/10 bg-[#101214]">
              <svg viewBox="0 0 720 460" className="h-[460px] w-full">
                {edges.map((edge) => {
                  const source = nodePositions.get(edge.source);
                  const target = nodePositions.get(edge.target);
                  if (!source || !target) return null;

                  return (
                    <g key={edge.id}>
                      <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgba(139,212,207,0.42)" strokeWidth="2" />
                      <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 8} fill="rgba(241,235,221,0.58)" fontSize="11" textAnchor="middle">
                        {edge.relationship_type}
                      </text>
                    </g>
                  );
                })}
                {nodes.map((node) => {
                  const position = nodePositions.get(node.id);
                  if (!position) return null;
                  const isCenter = node.id === entityId;

                  return (
                    <a key={node.id} href={`/entities/${node.id}`}>
                      <g>
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={isCenter ? 38 : 30}
                          fill={isCenter ? "rgba(198,154,84,0.92)" : "rgba(49,130,124,0.85)"}
                          stroke="rgba(241,235,221,0.45)"
                        />
                        <text x={position.x} y={position.y + 52} fill="rgb(241,235,221)" fontSize="12" textAnchor="middle">
                          {node.name.length > 20 ? `${node.name.slice(0, 20)}...` : node.name}
                        </text>
                      </g>
                    </a>
                  );
                })}
              </svg>
            </div>

            <aside className="border border-white/10 bg-[#171918] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/42">Graph Stats</p>
              <p className="mt-5 text-3xl font-semibold">{nodes.length}</p>
              <p className="mt-1 text-sm text-bone/52">nodes</p>
              <p className="mt-5 text-3xl font-semibold">{edges.length}</p>
              <p className="mt-1 text-sm text-bone/52">edges</p>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}
