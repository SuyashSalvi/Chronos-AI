import { NextResponse } from "next/server";
import { retrieveForQuestion } from "../../../../src/services/retrieval-engine";

export const dynamic = "force-dynamic";

type HistorianRequest = {
  scenarioId?: string;
  question?: string;
};

function buildAnswer(question: string, evidence: Array<{ title: string; year?: number | null; summary?: string | null }>): string {
  if (evidence.length === 0) {
    return `I could not find enough evidence in the current Chronos data to answer: "${question}".`;
  }

  const highlights = evidence
    .slice(0, 4)
    .map((item) => {
      const year = item.year !== null && item.year !== undefined ? ` (${item.year})` : "";
      return `${item.title}${year}`;
    })
    .join(", ");

  const summary = evidence.find((item) => item.summary)?.summary;

  return [
    `Based on the available Chronos evidence, the strongest relevant records are ${highlights}.`,
    summary ? `The key context is: ${summary}` : "The available records provide structured evidence, but not enough narrative detail for a fuller explanation yet.",
  ].join(" ");
}

export async function POST(request: Request) {
  const body = (await request.json()) as HistorianRequest;

  if (!body.scenarioId) {
    return NextResponse.json({ error: "Missing scenarioId" }, { status: 400 });
  }

  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const context = await retrieveForQuestion(body.question, body.scenarioId);
  const evidence = context.evidence.slice(0, 8).map((item) => ({
    type: item.type,
    id: item.id,
    title: item.title,
    year: item.year,
    summary: item.summary,
  }));

  if (evidence.length === 0) {
    return NextResponse.json(
      {
        answer: buildAnswer(body.question, evidence),
        evidence,
        sources: [],
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    answer: buildAnswer(body.question, evidence),
    evidence,
    sources: context.sources,
  });
}
