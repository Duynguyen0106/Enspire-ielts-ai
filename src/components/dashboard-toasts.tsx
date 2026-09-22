"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function DashboardToasts({ placementDone }: { placementDone: boolean }) {
  useEffect(() => {
    if (placementDone) {
      toast.message("Bạn đã hoàn thành bài kiểm tra đầu vào.");
    }
  }, [placementDone]);

  return null;
}
