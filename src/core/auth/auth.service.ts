import bcrypt from "bcryptjs";
import { z } from "zod";

import { ensureDefaultBusiness } from "@/core/business/business.service";
import { prisma } from "@/lib/prisma";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "SELLER"]).default("SELLER"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "SELLER"]).optional(),
}).refine(
  (input) => Object.values(input).some((value) => value !== undefined),
  "Debes enviar al menos un campo para actualizar",
);

const userSelect = {
  id: true,
  businessId: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      business: {
        include: {
          features: {
            select: {
              key: true,
              enabled: true,
            },
          },
          taxProfile: {
            select: {
              profileType: true,
              requiresElectronicBilling: true,
              allowsSalesNote: true,
              issuerId: true,
            },
          },
        },
      },
    },
  });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

export async function createUser(rawInput: unknown) {
  const input = createUserSchema.parse(rawInput);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("El email ya esta registrado");
  const business = await ensureDefaultBusiness();
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      businessId: business.id,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: userSelect,
  });
}

export async function listUsers() {
  return prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "asc" } });
}

export async function countUsers() {
  return prisma.user.count();
}

export async function updateUser(id: string, rawInput: unknown) {
  const input = updateUserSchema.parse(rawInput);

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });

  if (!existingUser) throw new Error("Usuario no encontrado");

  if (input.email && input.email !== existingUser.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailOwner && emailOwner.id !== id) {
      throw new Error("El email ya esta registrado");
    }
  }

  if (existingUser.role === "ADMIN" && input.role === "SELLER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("No se puede cambiar el rol del ultimo administrador");
    }
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;

  return prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
    },
    select: userSelect,
  });
}

export async function deleteUser(id: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!existingUser) throw new Error("Usuario no encontrado");

  if (existingUser.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("No se puede eliminar el ultimo administrador");
    }
  }

  return prisma.user.delete({
    where: { id },
    select: userSelect,
  });
}
