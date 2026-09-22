export const SKILL_LABELS = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
} as const;

export const SKILL_LABELS_VI = {
  LISTENING: "Nghe",
  READING: "Đọc",
  WRITING: "Viết",
  SPEAKING: "Nói",
} as const;

export const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Lộ trình", href: "/levels", icon: "Route" },
  { title: "Bài học", href: "/lessons", icon: "BookOpen" },
  { title: "Luyện tập", href: "/practice", icon: "Dumbbell" },
  { title: "Writing", href: "/writing", icon: "PenLine" },
  { title: "Speaking", href: "/speaking", icon: "Mic" },
  { title: "Bài kiểm tra", href: "/tests", icon: "ClipboardCheck" },
  { title: "Kết quả", href: "/results", icon: "BarChart3" },
  { title: "Cài đặt", href: "/settings", icon: "Settings" },
] as const;
