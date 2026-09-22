import { ExamRunner } from "@/components/exam/exam-runner";

type Props = { params: Promise<{ attemptId: string }> };

export default async function ExamRunPage({ params }: Props) {
  const { attemptId } = await params;
  return <ExamRunner attemptId={attemptId} />;
}
