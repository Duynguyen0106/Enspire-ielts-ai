"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SettingsForm } from "@/components/auth/settings-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  displayName: string;
  targetBand: number;
  plan: string;
  periodEnd: string | null;
  email: string;
};

const TABS = ["profile", "billing", "notifications", "danger"] as const;

export function SettingsTabsClient(props: Props) {
  const search = useSearchParams();
  const initial = search.get("tab");
  const [tab, setTab] = useState<(typeof TABS)[number]>(
    TABS.includes(initial as (typeof TABS)[number])
      ? (initial as (typeof TABS)[number])
      : "profile"
  );
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (search.get("success") === "1") {
      setTab("billing");
      setMsg("Thanh toán thành công! Gói Pro sẽ kích hoạt trong giây lát.");
    }
  }, [search]);

  async function portal() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const json = (await res.json()) as { url?: string; error?: string };
    if (json.url) window.location.href = json.url;
    else setMsg(json.error ?? "Portal error");
  }

  async function exportData() {
    const res = await fetch("/api/account/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vietielts-data.json";
    a.click();
  }

  async function deleteAccount() {
    if (!confirm("Xóa tài khoản? Hành động này không thể hoàn tác ngay.")) return;
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) window.location.href = "/";
    else setMsg("Không xóa được tài khoản.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={
              tab === t
                ? "rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm text-white"
                : "rounded-md border px-3 py-1.5 text-sm"
            }
            onClick={() => setTab(t)}
          >
            {t === "profile"
              ? "Hồ sơ"
              : t === "billing"
                ? "Thanh toán"
                : t === "notifications"
                  ? "Thông báo"
                  : "Nguy hiểm"}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ</CardTitle>
            <CardDescription>
              Cập nhật tên hiển thị và mục tiêu band IELTS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              displayName={props.displayName}
              targetBand={props.targetBand}
            />
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void exportData()}
            >
              Tải dữ liệu của tôi (JSON)
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "billing" ? (
        <Card>
          <CardHeader>
            <CardTitle>Thanh toán</CardTitle>
            <CardDescription>
              Gói hiện tại: <strong>{props.plan}</strong>
              {props.periodEnd
                ? ` · gia hạn ${new Date(props.periodEnd).toLocaleDateString("vi-VN")}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {props.plan === "FREE" ? (
              <Button render={<Link href="/pricing" />}>Nâng cấp Pro</Button>
            ) : (
              <Button onClick={() => void portal()}>Quản lý thanh toán</Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "notifications" ? (
        <Card>
          <CardHeader>
            <CardTitle>Thông báo</CardTitle>
            <CardDescription>
              Email tiến độ tuần sẽ gửi tới {props.email} khi Resend được cấu
              hình. Bạn có thể tắt trong tương lai tại đây.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {tab === "danger" ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Vùng nguy hiểm</CardTitle>
            <CardDescription>
              Xóa mềm tài khoản. Dữ liệu sẽ bị purge sau 30 ngày.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => void deleteAccount()}>
              Xóa tài khoản
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
    </div>
  );
}
