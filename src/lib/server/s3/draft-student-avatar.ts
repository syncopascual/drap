import assert, { strictEqual } from 'node:assert/strict';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { assertPayloadSize, assertSecureGoogleCdnUrl, normalizeImageContentType } from './util';
import { s3 } from './client';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const DRAFT_AVATAR_BUCKET = 'draft-student-avatar';

async function putDraftAvatarObject(
  objectKey: string,
  contentType: string,
  bytes: Uint8Array<ArrayBuffer>,
) {
  const normalizedContentType = normalizeImageContentType(contentType);
  assertPayloadSize(bytes.byteLength, MAX_AVATAR_BYTES);
  await s3.send(
    new PutObjectCommand({
      Bucket: DRAFT_AVATAR_BUCKET,
      Key: objectKey,
      Body: bytes,
      ContentType: normalizedContentType,
    }),
  );
}

export async function getDraftAvatarObject(objectKey: string) {
  return await s3.send(
    new GetObjectCommand({
      Bucket: DRAFT_AVATAR_BUCKET,
      Key: objectKey,
    }),
  );
}

export async function deleteDraftAvatarObject(objectKey: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: DRAFT_AVATAR_BUCKET,
      Key: objectKey,
    }),
  );
}

export async function uploadDraftAvatarFromGoogleProfile(
  objectKey: string,
  avatarUrl: string,
  http: typeof fetch,
) {
  const url = assertSecureGoogleCdnUrl(avatarUrl);
  const response = await http(url);
  assert(response.ok, `failed to download google avatar: ${response.status}`);

  const contentType = response.headers.get('Content-Type');
  assert(contentType !== null, 'google avatar response missing content type');
  const normalizedContentType = normalizeImageContentType(contentType);

  const contentLength = response.headers.get('Content-Length');
  assert(contentLength !== null, 'google avatar response missing content length');

  const expectedSize = Number.parseInt(contentLength, 10);
  assertPayloadSize(expectedSize, MAX_AVATAR_BYTES);

  const bytes = await response.bytes();
  strictEqual(bytes.byteLength, expectedSize, 'google avatar response content length mismatch');

  await putDraftAvatarObject(objectKey, normalizedContentType, bytes);
}

export async function uploadDraftAvatarOverride(objectKey: string, file: File) {
  const normalizedContentType = normalizeImageContentType(file.type);
  assertPayloadSize(file.size, MAX_AVATAR_BYTES);

  const bytes = new Uint8Array(await file.arrayBuffer());
  await putDraftAvatarObject(objectKey, normalizedContentType, bytes);
}
