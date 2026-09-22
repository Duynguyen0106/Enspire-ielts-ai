"use client";

export type VolumeEnvelope = {
  pauses: { startMs: number; endMs: number }[];
  avgVolume: number;
};

export type RecordingHandle = {
  stop: () => Promise<{ blob: Blob; durationSec: number; mimeType: string }>;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export async function startRecording(): Promise<RecordingHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome hoặc Edge."
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new Error(
      "Bạn đã từ chối quyền micro. Hãy mở cài đặt trình duyệt và cho phép micro cho trang này."
    );
  }

  const mimeType = pickMimeType();
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(250);

  return {
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, {
            type: recorder.mimeType || mimeType || "audio/webm",
          });
          resolve({
            blob,
            durationSec: (Date.now() - startedAt) / 1000,
            mimeType: blob.type,
          });
        };
        recorder.onerror = () => {
          stream.getTracks().forEach((t) => t.stop());
          reject(new Error("Ghi âm bị lỗi. Vui lòng thử lại."));
        };
        if (recorder.state !== "inactive") recorder.stop();
      }),
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function analyzeVolumeEnvelope(
  blob: Blob,
  silenceThreshold = 0.02,
  minPauseMs = 1500
): Promise<VolumeEnvelope> {
  try {
    const ctx = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audio = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audio.getChannelData(0);
    const sampleRate = audio.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05);
    let sum = 0;
    let count = 0;
    let silentStart: number | null = null;
    const pauses: { startMs: number; endMs: number }[] = [];

    for (let i = 0; i < channel.length; i += windowSize) {
      let peak = 0;
      for (let j = i; j < Math.min(i + windowSize, channel.length); j++) {
        peak = Math.max(peak, Math.abs(channel[j]!));
      }
      sum += peak;
      count += 1;
      const tMs = (i / sampleRate) * 1000;
      if (peak < silenceThreshold) {
        if (silentStart == null) silentStart = tMs;
      } else if (silentStart != null) {
        if (tMs - silentStart >= minPauseMs) {
          pauses.push({ startMs: Math.round(silentStart), endMs: Math.round(tMs) });
        }
        silentStart = null;
      }
    }
    if (silentStart != null) {
      const endMs = (channel.length / sampleRate) * 1000;
      if (endMs - silentStart >= minPauseMs) {
        pauses.push({
          startMs: Math.round(silentStart),
          endMs: Math.round(endMs),
        });
      }
    }
    await ctx.close();
    return { pauses, avgVolume: count ? sum / count : 0 };
  } catch {
    return { pauses: [], avgVolume: 0 };
  }
}
