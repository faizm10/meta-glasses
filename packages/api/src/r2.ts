import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * R2 access for the control plane: presigning and object metadata only.
 * Bytes never flow through here (ARCHITECTURE.md R3).
 */

let _client: S3Client | undefined;
let _bucket: string | undefined;

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

function r2(): { client: S3Client; bucket: string } {
  if (!r2Configured()) {
    throw new Error("R2 is not configured — see .env.example at the repo root");
  }
  _client ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  _bucket ??= process.env.R2_BUCKET!;
  return { client: _client, bucket: _bucket };
}

/** One-hour presigned PUT for a direct browser upload. */
export async function presignUpload(key: string, mime: string): Promise<string> {
  const { client, bucket } = r2();
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mime }),
    { expiresIn: 3600 },
  );
}

/** Returns the stored object's size, or null if it doesn't exist. */
export async function headObjectBytes(key: string): Promise<number | null> {
  const { client, bucket } = r2();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = r2();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
