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
import { completeOnboardingAction } from "@/app/actions/auth";
import {
  onboardingSchema,
  TARGET_BAND_OPTIONS,
  type OnboardingInput,
} from "@/lib/zod-schemas";
import { SKILL_LABELS_VI } from "@/lib/constants";

const skills = ["LISTENING", "READING", "WRITING", "SPEAKING"] as const;

type OnboardingFormProps = {
  defaultDisplayName?: string | null;
  defaultTargetBand?: number | null;
};

export function OnboardingForm({
  defaultDisplayName,
  defaultTargetBand,
}: OnboardingFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: defaultDisplayName ?? "",
      targetBand: defaultTargetBand ?? 6.0,
      weakSkills: [],
    },
  });

  function onSubmit(values: OnboardingInput) {
    const formData = new FormData();
    formData.set("displayName", values.displayName);
    formData.set("targetBand", String(values.targetBand));
    values.weakSkills.forEach((skill) => formData.append("weakSkills", skill));

    startTransition(async () => {
      const result = await completeOnboardingAction(undefined, formData);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên hiển thị</FormLabel>
              <FormControl>
                <Input placeholder="Tên của bạn" {...field} />
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
              <FormLabel>Mục tiêu band IELTS</FormLabel>
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

        <FormField
          control={form.control}
          name="weakSkills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kỹ năng bạn muốn cải thiện</FormLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {skills.map((skill) => {
                  const checked = field.value.includes(skill);
                  return (
                    <label
                      key={skill}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...field.value, skill]
                            : field.value.filter((s) => s !== skill);
                          field.onChange(next);
                        }}
                        className="size-4 rounded border"
                      />
                      <span>
                        {SKILL_LABELS_VI[skill]} ({skill.toLowerCase()})
                      </span>
                    </label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={pending} size="lg">
          {pending ? "Đang lưu..." : "Hoàn tất và vào Dashboard"}
        </Button>
      </form>
    </Form>
  );
}
