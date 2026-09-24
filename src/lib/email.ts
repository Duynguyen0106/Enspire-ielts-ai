type MailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: MailInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info("[email:skip]", input.to, input.subject);
    return false;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "VietIELTS AI <noreply@vietielts.ai>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return true;
  } catch (e) {
    console.error("[email:error]", e);
    return false;
  }
}

export function welcomeEmailHtml(name: string) {
  return `<p>Xin chào ${name},</p><p>Chào mừng bạn đến VietIELTS AI. Hãy làm bài kiểm tra đầu vào để bắt đầu lộ trình.</p>`;
}

export function subscriptionEmailHtml(active: boolean) {
  return active
    ? `<p>Cảm ơn bạn đã nâng cấp Pro. Toàn bộ 9 level đã mở khóa.</p>`
    : `<p>Gói Pro của bạn đã kết thúc. Bạn vẫn có thể dùng gói Free.</p>`;
}
