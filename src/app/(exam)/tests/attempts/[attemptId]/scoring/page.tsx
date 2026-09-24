import { ScoringClient } from "@/components/exam/scoring-client";

type Props = { params: Promise<{ attemptId: string }> };

export default async function ScoringPage({ params }: Props) {
  const { attemptId } = await params;
  return <ScoringClient attemptId={attemptId} />;
}
