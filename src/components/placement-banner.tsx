import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlacementBanner() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-medium">Bạn chưa làm bài kiểm tra đầu vào</p>
          <p className="text-sm text-amber-800/80">
            Làm bài placement để nhận lộ trình cá nhân hóa phù hợp với trình độ hiện tại.
          </p>
        </div>
      </div>
      <Button render={<Link href="/placement" />} className="shrink-0">
        Làm bài kiểm tra
      </Button>
    </div>
  );
}
