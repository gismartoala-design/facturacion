import { BusinessFeatureKey, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { UpdateBusinessSettingsInput } from "@/core/business/schemas";

export const DEFAULT_BUSINESS_SLUG = "default";

const DEFAULT_FEATURE_STATE: Record<BusinessFeatureKey, boolean> = {
  BILLING: true,
  QUOTES: true,
  POS: false,
};

const DEFAULT_BUSINESS_SELECT = {
  id: true,
  name: true,
  legalName: true,
  ruc: true,
  phone: true,
  email: true,
  address: true,
  slug: true,
  features: {
    select: {
      key: true,
      enabled: true,
    },
  },
  taxProfile: {
    select: {
      id: true,
      profileType: true,
      requiresElectronicBilling: true,
      allowsSalesNote: true,
      accountingRequired: true,
      environment: true,
      taxNotes: true,
      issuerId: true,
    },
  },
} satisfies Prisma.BusinessSelect;

export type BusinessContext = Prisma.BusinessGetPayload<{
  select: typeof DEFAULT_BUSINESS_SELECT;
}> & {
  enabledFeatures: BusinessFeatureKey[];
};

function toEnabledFeatures(features: Array<{ key: BusinessFeatureKey; enabled: boolean }>) {
  return features.filter((feature) => feature.enabled).map((feature) => feature.key);
}

function toBusinessContext(
  business: Prisma.BusinessGetPayload<{ select: typeof DEFAULT_BUSINESS_SELECT }>,
): BusinessContext {
  return {
    ...business,
    enabledFeatures: toEnabledFeatures(business.features),
  };
}

export function hasBusinessFeature(
  features: readonly string[] | readonly BusinessFeatureKey[] | undefined,
  feature: BusinessFeatureKey,
) {
  return Array.isArray(features) && features.includes(feature);
}

export async function ensureDefaultBusiness() {
  const business = await prisma.business.upsert({
    where: {
      slug: DEFAULT_BUSINESS_SLUG,
    },
    update: {
      isActive: true,
    },
    create: {
      name: "Negocio Principal",
      legalName: "Negocio Principal",
      slug: DEFAULT_BUSINESS_SLUG,
    },
    select: DEFAULT_BUSINESS_SELECT,
  });

  await Promise.all(
    Object.entries(DEFAULT_FEATURE_STATE).map(([key, enabled]) =>
      prisma.businessFeature.upsert({
        where: {
          businessId_key: {
            businessId: business.id,
            key: key as BusinessFeatureKey,
          },
        },
        update: {},
        create: {
          businessId: business.id,
          key: key as BusinessFeatureKey,
          enabled,
        },
      }),
    ),
  );

  await prisma.taxProfile.upsert({
    where: {
      businessId: business.id,
    },
    update: {},
    create: {
      businessId: business.id,
      profileType: "GENERAL",
      requiresElectronicBilling: true,
      allowsSalesNote: false,
    },
  });

  const refreshed = await prisma.business.findUnique({
    where: { id: business.id },
    select: DEFAULT_BUSINESS_SELECT,
  });

  if (!refreshed) {
    throw new Error("No se pudo inicializar negocio por defecto");
  }

  return toBusinessContext(refreshed);
}

export async function getBusinessContextById(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: DEFAULT_BUSINESS_SELECT,
  });

  if (!business) {
    throw new Error("Negocio no encontrado");
  }

  return toBusinessContext(business);
}

export async function updateBusinessSettings(
  businessId: string,
  input: UpdateBusinessSettingsInput,
) {
  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      name: input.name,
      legalName: input.legalName || null,
      ruc: input.ruc || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      taxProfile: {
        upsert: {
          update: {
            profileType: input.profileType,
            requiresElectronicBilling: input.requiresElectronicBilling,
            allowsSalesNote: input.allowsSalesNote,
            accountingRequired: input.accountingRequired,
            environment: input.environment,
            taxNotes: input.taxNotes || null,
          },
          create: {
            profileType: input.profileType,
            requiresElectronicBilling: input.requiresElectronicBilling,
            allowsSalesNote: input.allowsSalesNote,
            accountingRequired: input.accountingRequired,
            environment: input.environment,
            taxNotes: input.taxNotes || null,
          },
        },
      },
    },
    select: DEFAULT_BUSINESS_SELECT,
  });

  return toBusinessContext(business);
}
