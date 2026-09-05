export type PublicGroup = {
  id: number;
  publicCode: string;
  zone: string;
  name: string;
  city: string;
  whatsapp: string;
  facebook: string;
  address: string;
  mapsUrl: string;
  schedules: string;
  sessionTypes: string;
  status: string;
  verifiedAt: string | null;
};

export const zoneMeta: Record<string, { code: string; icon: string; line: string }> = {
  Jaguar: { code: "JAG", icon: "J", line: "Fuerza y servicio" },
  "Tiburón": { code: "TIB", icon: "T", line: "Determinación" },
  "Delfín": { code: "DEL", icon: "D", line: "Renacimiento" },
  "Colibrí": { code: "COL", icon: "C", line: "Transformación" },
  "Águila": { code: "AGU", icon: "A", line: "Visión elevada" },
};

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function groupHref(group: PublicGroup) {
  return `/grupos/${slugify(group.name)}-${group.id}`;
}

export function zoneHref(zone: string) {
  return `/zonas/${slugify(zone)}`;
}

export function whatsappHref(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.length === 10 ? "52" : ""}${digits}`;
}

export function locationParts(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return { city: "Sin ciudad registrada", state: "Sin especificar" };
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const stateRules: Array<[RegExp, string]> = [
    [/yucatan|merida|valladolid|tizimin|ticul|sotuta|uman|kanasin|acanceh|conkal|chicxulub|cholul|tixkokob|huni|huhí|espita|ixil|homun|piste|timucuy|temax|tixpeual/, "Yucatán"],
    [/quintana|q\.?\s*roo|qroo|cancun|tulum|cozumel|chetumal|playa del carmen|felipe carrillo/, "Quintana Roo"],
    [/campeche|champoton|ciudad del carmen|cd del carmen/, "Campeche"],
    [/durango|gomez palacio|lerdo/, "Durango"],
    [/coahuila|torreon|matamoros/, "Coahuila"],
    [/veracruz|poza rica/, "Veracruz"],
    [/morelos|miacatlan/, "Morelos"],
    [/estado de mexico|toluca|malinalco|tenango del valle/, "Estado de México"],
    [/ciudad de mexico|cdmx/, "Ciudad de México"],
  ];
  const state = stateRules.find(([pattern]) => pattern.test(normalized))?.[1]
    ?? (parts.length > 1 ? parts.at(-1) : "Sin especificar")
    ?? "Sin especificar";
  return { city: parts[0], state };
}

export function verificationLabel(value: string | null) {
  if (!value) return "Pendiente de verificación";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.valueOf())) return "Verificado";
  return `Verificado ${date.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}`;
}
