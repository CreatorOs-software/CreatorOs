import { z } from "zod";

const colorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).max(7);

export const avatarConfigSchema = z.object({
  sex: z.enum(["man", "woman"]),
  faceColor: colorSchema,
  earSize: z.enum(["small", "big"]),
  hairColor: colorSchema,
  hairStyle: z.enum(["normal", "thick", "mohawk", "womanLong", "womanShort"]),
  hairColorRandom: z.boolean().default(false),
  hatColor: colorSchema,
  hatStyle: z.enum(["none", "beanie", "turban"]),
  eyeStyle: z.enum(["circle", "oval", "smile"]),
  glassesStyle: z.enum(["none", "round", "square"]),
  noseStyle: z.enum(["short", "long", "round"]),
  mouthStyle: z.enum(["laugh", "smile", "peace"]),
  shirtStyle: z.enum(["hoody", "short", "polo"]),
  shirtColor: colorSchema,
  bgColor: colorSchema,
  isGradient: z.boolean().default(false),
  eyeBrowStyle: z.enum(["up", "upWoman"]).optional(),
}).strict();

export type AvatarConfig = z.infer<typeof avatarConfigSchema>;

export function parseAvatarConfig(value: unknown): AvatarConfig | null {
  const result = avatarConfigSchema.safeParse(value);
  return result.success ? result.data : null;
}
