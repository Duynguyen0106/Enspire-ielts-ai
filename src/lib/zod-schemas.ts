import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(80, "Tên quá dài"),
  email: z.string().email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu cần ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Mật khẩu cần ít nhất 1 chữ số"),
});

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .min(2, "Tên hiển thị phải có ít nhất 2 ký tự")
    .max(80, "Tên hiển thị quá dài"),
  targetBand: z.coerce
    .number()
    .min(4, "Band tối thiểu là 4.0")
    .max(9, "Band tối đa là 9.0"),
  weakSkills: z
    .array(z.enum(["LISTENING", "READING", "WRITING", "SPEAKING"]))
    .min(1, "Chọn ít nhất một kỹ năng yếu"),
});

export const profileSettingsSchema = z.object({
  displayName: z
    .string()
    .min(2, "Tên hiển thị phải có ít nhất 2 ký tự")
    .max(80, "Tên hiển thị quá dài"),
  targetBand: z.coerce
    .number()
    .min(4, "Band tối thiểu là 4.0")
    .max(9, "Band tối đa là 9.0"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;

export const TARGET_BAND_OPTIONS = Array.from({ length: 11 }, (_, i) =>
  (4 + i * 0.5).toFixed(1)
);
