import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("drizzle/meta/0019_snapshot.json");
const targetPath = resolve("drizzle/meta/0020_snapshot.json");

if (existsSync(targetPath)) process.exit(0);
if (!existsSync(sourcePath)) throw new Error("No existe drizzle/meta/0019_snapshot.json");

const snapshot = JSON.parse(readFileSync(sourcePath, "utf8"));
const previousId = snapshot.id;
snapshot.prevId = previousId;
snapshot.id = "cf4fd315-e48c-4dc3-a4d2-c36b3f61c020";

const nullableText = (name) => ({
  name,
  type: "text",
  primaryKey: false,
  notNull: false,
  autoincrement: false,
});

for (const tableName of ["access_requests", "directory_change_requests", "announcement_reads", "admin_inbox_reads"]) {
  const table = snapshot.tables[tableName];
  if (!table) throw new Error(`No existe ${tableName} en el snapshot 0019`);
  table.columns.archived_at ??= nullableText("archived_at");
}

const textColumn = (name, { notNull = true, defaultValue } = {}) => ({
  name,
  type: "text",
  primaryKey: false,
  notNull,
  autoincrement: false,
  ...(defaultValue === undefined ? {} : { default: defaultValue }),
});

snapshot.tables.leader_reports = {
  name: "leader_reports",
  columns: {
    id: { name: "id", type: "text", primaryKey: true, notNull: true, autoincrement: false },
    reporter_email: textColumn("reporter_email"),
    reporter_name: textColumn("reporter_name", { defaultValue: "''" }),
    reporter_role: textColumn("reporter_role", { defaultValue: "''" }),
    phone: textColumn("phone", { defaultValue: "''" }),
    category: textColumn("category"),
    group_zone: textColumn("group_zone", { defaultValue: "''" }),
    approximate_date: textColumn("approximate_date", { defaultValue: "''" }),
    narrative: textColumn("narrative"),
    people_or_witnesses: textColumn("people_or_witnesses", { defaultValue: "''" }),
    support_needed: textColumn("support_needed"),
    status: textColumn("status", { defaultValue: "'received'" }),
    admin_notes: textColumn("admin_notes", { defaultValue: "''" }),
    created_at: textColumn("created_at", { defaultValue: "CURRENT_TIMESTAMP" }),
    updated_at: textColumn("updated_at", { defaultValue: "CURRENT_TIMESTAMP" }),
    archived_at: nullableText("archived_at"),
  },
  indexes: {
    leader_reports_status_created_idx: {
      name: "leader_reports_status_created_idx",
      columns: ["status", "created_at"],
      isUnique: false,
    },
    leader_reports_reporter_idx: {
      name: "leader_reports_reporter_idx",
      columns: ["reporter_email", "created_at"],
      isUnique: false,
    },
  },
  foreignKeys: {},
  compositePrimaryKeys: {},
  uniqueConstraints: {},
  checkConstraints: {},
};

writeFileSync(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log("Creado drizzle/meta/0020_snapshot.json a partir de 0019 + migración 0020.");
