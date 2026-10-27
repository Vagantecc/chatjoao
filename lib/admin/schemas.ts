// Validação do que o painel pode gravar em cada tabela editável.
import { z } from "zod";

const range = z.tuple([z.string().regex(/^\d{2}:\d{2}$/), z.string().regex(/^\d{2}:\d{2}$/)]);
const ranges = z.array(range);
const day = z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);

export const storeHoursSchema = z
  .object({
    week: z.partialRecord(day, ranges),
    holiday: ranges.optional(),
    seasonal: z.array(z.object({ months: z.array(z.number().int().min(1).max(12)), day, ranges })).optional(),
  })
  .nullable();

const url = z.string().url().refine((u) => /^https:\/\//.test(u), "use https://");
const optionalId = z.union([z.number().int(), z.literal(""), z.null()]).optional();

export const EDITABLE = {
  promo_rules: z.object({
    id: optionalId,
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "só letras minúsculas, números e hífen"),
    title: z.string().min(2),
    content: z.string().min(5),
    keywords: z.array(z.string()),
    sort_order: z.number().int(),
  }),
  stores: z.object({
    id: optionalId,
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    name: z.string().min(2),
    address: z.string().min(3),
    neighborhood: z.string().nullable(),
    city: z.string().min(2),
    cep: z.string().nullable(),
    lat: z.number().min(-34).max(5),
    lng: z.number().min(-74).max(-34),
    whatsapp: z.array(z.string()),
    phone: z.string().nullable(),
    hours: storeHoursSchema,
    active: z.boolean(),
  }),
  products: z.object({
    id: optionalId,
    name: z.string().min(2),
    category: z.string().min(2),
    subcategory: z.string().nullable(),
    brand: z.string().nullable(),
    price: z.number().positive(),
    link: url.refine((u) => new URL(u).hostname.endsWith("tumelero.com.br"), "o link precisa ser do site da Tumelero"),
    image_url: url.nullable(),
    keywords: z.array(z.string()),
    active: z.boolean(),
  }),
  ofertas_dia_t: z.object({
    id: optionalId,
    product_name: z.string().min(2),
    price: z.number().positive(),
    normal_price: z.number().positive().nullable(),
    link: url.refine((u) => new URL(u).hostname.endsWith("tumelero.com.br"), "o link precisa ser do site da Tumelero"),
    image_url: url.nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  holidays: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: z.string().min(2),
    scope: z.enum(["nacional", "estadual", "municipal"]),
    city: z.string().nullable(),
  }),
} as const;

export type EditableTable = keyof typeof EDITABLE;
export const isEditable = (t: string): t is EditableTable => t in EDITABLE;
