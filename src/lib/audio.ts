import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

export function shouldUseLocalAudioStorage(): boolean {
  if (process.env.USE_LOCAL_AUDIO_STORAGE === "true") return true;
  return !(
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY
  );
}

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

export type StoredAudio = {
  url: string;
  storage: "s3" | "base64" | "data-url";
};

export async function storeAudio(input: {
  bytes: Buffer;
  contentType?: string;
  extension?: string;
}): Promise<StoredAudio> {
  const contentType = input.contentType ?? "audio/mpeg";
  const extension = input.extension ?? "mp3";

  if (shouldUseLocalAudioStorage()) {
    const base64 = input.bytes.toString("base64");
    return {
      url: `data:${contentType};base64,${base64}`,
      storage: "data-url",
    };
  }

  const key = `audio/${randomUUID()}.${extension}`;
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: input.bytes,
      ContentType: contentType,
    })
  );

  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, "");
  return {
    url: `${endpoint}/${process.env.S3_BUCKET}/${key}`,
    storage: "s3",
  };
}

export function decodeBase64Audio(data: string): Buffer {
  const cleaned = data.includes(",") ? data.split(",")[1]! : data;
  return Buffer.from(cleaned, "base64");
}

export function estimateFluencyFromTranscript(transcript: string): {
  wordsPerMinute: number;
  pauseCount: number;
  wordCount: number;
} {
  const words = transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const pauseCount = (transcript.match(/(\.\.\.|—|–|,|\.)/g) ?? []).length;
  // Assume ~90 seconds speaking for placement unless timed better later
  const minutes = 1.5;
  return {
    wordsPerMinute: Math.round(words.length / minutes),
    pauseCount,
    wordCount: words.length,
  };
}
