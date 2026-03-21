import { BusinessFeatureKey, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { UpdateBusinessSettingsInput } from "@/core/business/schemas";

export const DEFAULT_BUSINESS_SLUG = "default";
const DEFAULT_DOCUMENT_ISSUER_CODE = "MAIN";

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
  documentIssuers: {
    select: {
      id: true,
      code: true,
      name: true,
      legalName: true,
      ruc: true,
      environment: true,
      active: true,
      series: {
        select: {
          id: true,
          documentType: true,
          establishmentCode: true,
          emissionPointCode: true,
          nextSequence: true,
          active: true,
        },
        orderBy: [{ establishmentCode: "asc" }, { emissionPointCode: "asc" }],
      },
    },
    orderBy: {
      code: "asc",
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

async function ensureDefaultDocumentSetup(params: {
  businessId: string;
  businessName: string;
  legalName?: string | null;
  ruc?: string | null;
  environment?: string | null;
  preferredIssuerId?: string | null;
}) {
  let issuer =
    params.preferredIssuerId
      ? await prisma.documentIssuer.findFirst({
          where: {
            id: params.preferredIssuerId,
            businessId: params.businessId,
            active: true,
          },
        })
      : null;

  if (!issuer) {
    issuer = await prisma.documentIssuer.upsert({
      where: {
        businessId_code: {
          businessId: params.businessId,
          code: DEFAULT_DOCUMENT_ISSUER_CODE,
        },
      },
      update: {
        active: true,
        name: params.businessName,
        legalName: params.legalName || params.businessName,
        ruc: params.ruc || null,
        environment: params.environment || "PRUEBAS",
      },
      create: {
        businessId: params.businessId,
        code: DEFAULT_DOCUMENT_ISSUER_CODE,
        name: params.businessName,
        legalName: params.legalName || params.businessName,
        ruc: params.ruc || null,
        environment: params.environment || "PRUEBAS",
      },
    });
  }

  await prisma.documentSeries.upsert({
    where: {
      issuerId_documentType_establishmentCode_emissionPointCode: {
        issuerId: issuer.id,
        documentType: "INVOICE",
        establishmentCode: "001",
        emissionPointCode: "001",
      },
    },
    update: {
      active: true,
    },
    create: {
      issuerId: issuer.id,
      documentType: "INVOICE",
      establishmentCode: "001",
      emissionPointCode: "001",
      nextSequence: 1,
      active: true,
    },
  });

  await prisma.taxProfile.upsert({
    where: {
      businessId: params.businessId,
    },
    update: {
      issuerId: issuer.id,
      environment: params.environment || "PRUEBAS",
    },
    create: {
      businessId: params.businessId,
      profileType: "GENERAL",
      requiresElectronicBilling: true,
      allowsSalesNote: false,
      environment: params.environment || "PRUEBAS",
      issuerId: issuer.id,
    },
  });
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

  await ensureDefaultDocumentSetup({
    businessId: business.id,
    businessName: business.name,
    legalName: business.legalName,
    ruc: business.ruc,
    environment: business.taxProfile?.environment,
    preferredIssuerId: business.taxProfile?.issuerId,
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

  await ensureDefaultDocumentSetup({
    businessId: business.id,
    businessName: business.name,
    legalName: business.legalName,
    ruc: business.ruc,
    environment: business.taxProfile?.environment,
    preferredIssuerId: business.taxProfile?.issuerId,
  });

  const refreshed = await prisma.business.findUnique({
    where: { id: businessId },
    select: DEFAULT_BUSINESS_SELECT,
  });

  if (!refreshed) {
    throw new Error("Negocio no encontrado");
  }

  return toBusinessContext(refreshed);
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

  await ensureDefaultDocumentSetup({
    businessId: business.id,
    businessName: business.name,
    legalName: business.legalName,
    ruc: business.ruc,
    environment: business.taxProfile?.environment,
    preferredIssuerId: business.taxProfile?.issuerId,
  });

  const issuerId = business.taxProfile?.issuerId;

  if (issuerId) {
    await prisma.documentIssuer.update({
      where: { id: issuerId },
      data: {
        code: input.issuerCode || DEFAULT_DOCUMENT_ISSUER_CODE,
        name: input.issuerName || input.name,
        legalName: input.legalName || input.name,
        ruc: input.ruc || null,
        environment: input.environment,
        active: true,
      },
    });

    const currentSeries = await prisma.documentSeries.findFirst({
      where: {
        issuerId,
        documentType: "INVOICE",
        active: true,
      },
      orderBy: [{ establishmentCode: "asc" }, { emissionPointCode: "asc" }],
      select: { id: true },
    });

    if (currentSeries) {
      await prisma.documentSeries.update({
        where: { id: currentSeries.id },
        data: {
          establishmentCode: input.invoiceEstablishmentCode || "001",
          emissionPointCode: input.invoiceEmissionPointCode || "001",
          nextSequence: input.invoiceNextSequence,
          active: true,
        },
      });
    } else {
      await prisma.documentSeries.create({
        data: {
          issuerId,
          documentType: "INVOICE",
          establishmentCode: input.invoiceEstablishmentCode || "001",
          emissionPointCode: input.invoiceEmissionPointCode || "001",
          nextSequence: input.invoiceNextSequence,
          active: true,
        },
      });
    }
  }

  const refreshed = await prisma.business.findUnique({
    where: { id: businessId },
    select: DEFAULT_BUSINESS_SELECT,
  });

  if (!refreshed) {
    throw new Error("Negocio no encontrado");
  }

  return toBusinessContext(refreshed);
}
