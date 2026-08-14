import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const directoryGroups = sqliteTable("directory_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  zone: text("zone").notNull(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  leaderName: text("leader_name").notNull().default(""),
  subleaderName: text("subleader_name").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  email: text("email").notNull().default(""),
  facebook: text("facebook").notNull().default(""),
  address: text("address").notNull().default(""),
  mapsUrl: text("maps_url").notNull().default(""),
  schedules: text("schedules").notNull().default(""),
  status: text("status").notNull().default("active"),
  version: integer("version").notNull().default(1),
  verifiedAt: text("verified_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull().default("system"),
}, (table) => [
  uniqueIndex("directory_groups_zone_name_city_idx").on(table.zone, table.name, table.city),
]);

export const portalUsers = sqliteTable("portal_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull(),
  zone: text("zone"),
  groupId: integer("group_id").references(() => directoryGroups.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes").notNull().default(""),
  source: text("source").notNull().default("manual"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accessRequests = sqliteTable("access_requests", {
  id: text("id").primaryKey(),
  requesterEmail: text("requester_email").notNull(),
  requesterName: text("requester_name").notNull(),
  phone: text("phone").notNull().default(""),
  requestedRole: text("requested_role").notNull(),
  zone: text("zone"),
  groupId: integer("group_id").references(() => directoryGroups.id),
  groupName: text("group_name").notNull().default(""),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("pending"),
  reviewerEmail: text("reviewer_email"),
  reviewNote: text("review_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
});

export const accessRequestEvents = sqliteTable("access_request_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: text("request_id").notNull().references(() => accessRequests.id),
  actorEmail: text("actor_email").notNull(),
  eventType: text("event_type").notNull(),
  note: text("note").notNull().default(""),
  snapshotJson: text("snapshot_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("access_request_events_request_idx").on(table.requestId, table.createdAt),
]);

export const directoryChangeRequests = sqliteTable("directory_change_requests", {
  id: text("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => directoryGroups.id),
  groupVersion: integer("group_version").notNull(),
  requesterEmail: text("requester_email").notNull(),
  requesterName: text("requester_name").notNull(),
  requesterRole: text("requester_role").notNull(),
  status: text("status").notNull().default("pending"),
  originalJson: text("original_json").notNull(),
  proposedJson: text("proposed_json").notNull(),
  requesterNote: text("requester_note").notNull().default(""),
  reviewerEmail: text("reviewer_email"),
  reviewNote: text("review_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  detailsJson: text("details_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const contentSettings = sqliteTable("content_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const testimonyTopics = sqliteTable("testimony_topics", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("General"),
  intensity: text("intensity").notNull().default("Media"),
  moment: text("moment").notNull().default("Mitad"),
  objective: text("objective").notNull().default(""),
  anchor: text("anchor").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"),
  fileKey: text("file_key"),
  fileName: text("file_name").notNull().default(""),
  fileType: text("file_type").notNull().default(""),
  fileSize: integer("file_size").notNull().default(0),
  status: text("status").notNull().default("published"),
  origin: text("origin").notNull().default("upload"),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("testimony_topics_status_idx").on(table.status, table.category),
]);

export const leaderMaterials = sqliteTable("leader_materials", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("otros"),
  description: text("description").notNull().default(""),
  versionLabel: text("version_label").notNull().default(""),
  fileKey: text("file_key"),
  staticUrl: text("static_url"),
  previewUrl: text("preview_url"),
  fileName: text("file_name").notNull().default(""),
  fileType: text("file_type").notNull().default(""),
  fileSize: integer("file_size").notNull().default(0),
  status: text("status").notNull().default("published"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("leader_materials_status_idx").on(table.status, table.category, table.sortOrder),
]);

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull(),
  priority: text("priority").notNull().default("info"),
  audience: text("audience").notNull().default("all"),
  status: text("status").notNull().default("draft"),
  revision: integer("revision").notNull().default(1),
  createdBy: text("created_by").notNull(),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("announcements_status_idx").on(table.status, table.publishedAt),
]);

export const announcementReads = sqliteTable("announcement_reads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  announcementId: text("announcement_id").notNull().references(() => announcements.id),
  userEmail: text("user_email").notNull(),
  revision: integer("revision").notNull().default(1),
  readAt: text("read_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("announcement_reads_user_idx").on(table.announcementId, table.userEmail),
]);
