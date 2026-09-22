"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "@/app/actions/auth";
import {
  profileSettingsSchema,
  TARGET_BAND_OPTIONS,
  type ProfileSettingsInput,
} from "@/lib/zod-schemas";

type SettingsFormProps = {
  displayName: string;
  targetBand: number;
};

export function SettingsForm({ displayName, targetBand }: SettingsFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      displayName,
      targetBand,
    },
  });

  function onSubmit(values: ProfileSettingsInput) {
    const formData = new FormData();
    formData.set("displayName", values.displayName);
    formData.set("targetBand", String(values.targetBand));

    startTransition(async () => {
      const result = await updateProfileAction(undefined, formData);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success("Đã cập nhật hồ sơ");
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-lg space-y-4"
      >
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên hiển thị</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetBand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mục tiêu band</FormLabel>
              <FormControl>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={String(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                >
                  {TARGET_BAND_OPTIONS.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Form>
  );
}
