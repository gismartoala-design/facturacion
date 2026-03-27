import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";

const GCS_LOGO_BUCKET = process.env.GCS_LOGO_BUCKET?.trim() || null;
const LEGACY_LOCAL_LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

type StoredBusinessLogo = {
  logoStorageKey: string;
  logoUrl: string;
};

type BusinessLogoAsset = {
  bytes: Buffer;
  contentType: string;
};

function buildBusinessLogoStorageKey(businessId: string) {
  return `business-logos/${businessId}/logo.png`;
}

function buildLocalLogoPath(storageKey: string) {
  return path.join(process.cwd(), "public", storageKey);
}

async function getGoogleAccessToken() {
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    {
      headers: {
        "Metadata-Flavor": "Google",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("No se pudo obtener credenciales de Google Cloud desde Cloud Run");
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google Cloud no devolvio access token para el logo");
  }

  return payload.access_token;
}

async function uploadToGoogleCloudStorage(
  storageKey: string,
  bytes: Buffer,
  contentType: string,
) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(GCS_LOGO_BUCKET as string)}/o?uploadType=media&name=${encodeURIComponent(storageKey)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body: new Uint8Array(bytes),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo subir el logo a Cloud Storage: ${detail}`);
  }
}

async function downloadFromGoogleCloudStorage(storageKey: string) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(GCS_LOGO_BUCKET as string)}/o/${encodeURIComponent(storageKey)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo descargar el logo desde Cloud Storage: ${detail}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") || "image/png",
  } satisfies BusinessLogoAsset;
}

async function storeLogoLocally(storageKey: string, bytes: Buffer) {
  const absolutePath = buildLocalLogoPath(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

async function readLogoLocally(storageKey: string) {
  const absolutePath = buildLocalLogoPath(storageKey);
  if (!existsSync(absolutePath)) {
    return null;
  }

  return {
    bytes: await readFile(absolutePath),
    contentType: "image/png",
  } satisfies BusinessLogoAsset;
}

export function buildBusinessLogoUrl(version?: number | null) {
  return version
    ? `/api/v1/business/logo?v=${version}`
    : "/api/v1/business/logo";
}

export async function storeBusinessLogo(params: {
  businessId: string;
  bytes: Buffer;
  contentType: string;
}) {
  const storageKey = buildBusinessLogoStorageKey(params.businessId);

  if (GCS_LOGO_BUCKET) {
    await uploadToGoogleCloudStorage(storageKey, params.bytes, params.contentType);
  } else {
    await storeLogoLocally(storageKey, params.bytes);
  }

  await prisma.business.update({
    where: { id: params.businessId },
    data: {
      logoStorageKey: storageKey,
    },
  });

  return {
    logoStorageKey: storageKey,
    logoUrl: buildBusinessLogoUrl(Date.now()),
  } satisfies StoredBusinessLogo;
}

export async function getBusinessLogoAsset(
  logoStorageKey: string | null | undefined,
) {
  if (logoStorageKey) {
    return GCS_LOGO_BUCKET
      ? downloadFromGoogleCloudStorage(logoStorageKey)
      : readLogoLocally(logoStorageKey);
  }

  if (!existsSync(LEGACY_LOCAL_LOGO_PATH)) {
    return null;
  }

  return {
    bytes: await readFile(LEGACY_LOCAL_LOGO_PATH),
    contentType: "image/png",
  } satisfies BusinessLogoAsset;
}
