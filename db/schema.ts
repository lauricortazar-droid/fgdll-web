import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const directoryGroups = sqliteTable(
  "directory_groups",
  {
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
    sessionTypes: text("session_types").notNull().default(""),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    verifiedAt: text("verified_at"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default("system"),
  },
  (table) => [
    uniqueIndex("directory_groups_zone_name_city_idx").on(
      table.zone,
      table.name,
      table.city,
    ),
  ],
);

export const rehabilitationCenters = sqliteTable(
  "rehabilitation_centers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    network: text("network").notNull().default("Red Teocalli"),
    state: text("state").notNull().default(""),
    city: text("city").notNull().default(""),
    address: text("address").notNull().default(""),
    responsibleName: text("responsible_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    whatsapp: text("whatsapp").notNull().default(""),
    email: text("email").notNull().default(""),
    website: text("website").notNull().default(""),
    mapsUrl: text("maps_url").notNull().default(""),
    description: text("description").notNull().default(""),
    services: text("services").notNull().default(""),
    status: text("status").notNull().default("published"),
    version: integer("version").notNull().default(1),
    verifiedAt: text("verified_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default("system"),
  },
  (table) => [
    uniqueIndex("rehabilitation_centers_name_city_idx").on(
      table.name,
      table.city,
    ),
    index("rehabilitation_centers_public_idx").on(
      table.status,
      table.state,
      table.city,
    ),
  ],
);

export const portalUsers = sqliteTable("portal_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull(),
  zone: text("zone"),
  groupId: integer("group_id").references(() => directoryGroups.id),
  centerId: integer("center_id").references(() => rehabilitationCenters.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes").notNull().default(""),
  source: text("source").notNull().default("manual"),
  createdBy: text("created_by"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const centerRequests = sqliteTable(
  "center_requests",
  {
    id: text("id").primaryKey(),
    requestType: text("request_type").notNull(),
    centerId: integer("center_id").references(() => rehabilitationCenters.id),
    centerVersion: integer("center_version"),
    requesterEmail: text("requester_email").notNull(),
    requesterName: text("requester_name").notNull(),
    requesterPhone: text("requester_phone").notNull().default(""),
    proposedJson: text("proposed_json").notNull(),
    originalJson: text("original_json").notNull().default("{}"),
    requesterNote: text("requester_note").notNull().default(""),
    status: text("status").notNull().default("pending"),
    reviewerEmail: text("reviewer_email"),
    reviewNote: text("review_note").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
  },
  (table) => [
    index("center_requests_status_idx").on(table.status, table.createdAt),
    index("center_requests_requester_idx").on(
      table.requesterEmail,
      table.createdAt,
    ),
    index("center_requests_center_idx").on(table.centerId, table.createdAt),
  ],
);

export const centerDirectors = sqliteTable(
  "center_directors",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    centerId: integer("center_id")
      .notNull()
      .references(() => rehabilitationCenters.id),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    approvedBy: text("approved_by").notNull(),
    approvedAt: text("approved_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("center_directors_center_email_idx").on(
      table.centerId,
      table.email,
    ),
    index("center_directors_email_idx").on(table.email, table.active),
  ],
);

export const orientationRequests = sqliteTable(
  "orientation_requests",
  {
    id: text("id").primaryKey(),
    requesterName: text("requester_name").notNull(),
    whatsapp: text("whatsapp").notNull(),
    city: text("city").notNull().default(""),
    relationship: text("relationship").notNull().default(""),
    ageGroup: text("age_group").notNull().default("unknown"),
    helpType: text("help_type").notNull().default("unsure"),
    danger: text("danger").notNull().default("unsure"),
    preferredTime: text("preferred_time").notNull().default(""),
    consentContact: integer("consent_contact", { mode: "boolean" })
      .notNull()
      .default(false),
    consentPrivacy: integer("consent_privacy", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status").notNull().default("new"),
    assignedCenterId: integer("assigned_center_id").references(
      () => rehabilitationCenters.id,
    ),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default("system"),
  },
  (table) => [
    index("orientation_requests_status_idx").on(table.status, table.createdAt),
    index("orientation_requests_center_idx").on(
      table.assignedCenterId,
      table.createdAt,
    ),
  ],
);

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
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
});

export const accessRequestEvents = sqliteTable(
  "access_request_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    requestId: text("request_id")
      .notNull()
      .references(() => accessRequests.id),
    actorEmail: text("actor_email").notNull(),
    eventType: text("event_type").notNull(),
    note: text("note").notNull().default(""),
    snapshotJson: text("snapshot_json").notNull().default("{}"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("access_request_events_request_idx").on(
      table.requestId,
      table.createdAt,
    ),
  ],
);

export const directoryChangeRequests = sqliteTable(
  "directory_change_requests",
  {
    id: text("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => directoryGroups.id),
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
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
  },
);

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  detailsJson: text("details_json").notNull().default("{}"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const contentSettings = sqliteTable("content_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const testimonyTopics = sqliteTable(
  "testimony_topics",
  {
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
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("testimony_topics_status_idx").on(table.status, table.category),
  ],
);

export const leaderMaterials = sqliteTable(
  "leader_materials",
  {
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
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("leader_materials_status_idx").on(
      table.status,
      table.category,
      table.sortOrder,
    ),
  ],
);

export const announcements = sqliteTable(
  "announcements",
  {
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
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("announcements_status_idx").on(table.status, table.publishedAt),
  ],
);

export const announcementReads = sqliteTable(
  "announcement_reads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcements.id),
    userEmail: text("user_email").notNull(),
    revision: integer("revision").notNull().default(1),
    readAt: text("read_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("announcement_reads_user_idx").on(
      table.announcementId,
      table.userEmail,
    ),
  ],
);

export const monthlyExperiences = sqliteTable(
  "monthly_experiences",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    zone: text("zone").notNull(),
    title: text("title").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    location: text("location").notNull().default(""),
    writingsJson: text("writings_json").notNull().default("[]"),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("published"),
    createdBy: text("created_by").notNull().default("system"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("monthly_experiences_month_idx").on(
      table.month,
      table.status,
      table.zone,
    ),
  ],
);

export const groupRegistrationRequests = sqliteTable(
  "group_registration_requests",
  {
    id: text("id").primaryKey(),
    requesterEmail: text("requester_email").notNull(),
    requesterName: text("requester_name").notNull().default(""),
    requesterRole: text("requester_role").notNull(),
    zone: text("zone").notNull(),
    proposedJson: text("proposed_json").notNull(),
    requesterNote: text("requester_note").notNull().default(""),
    status: text("status").notNull().default("pending"),
    reviewerEmail: text("reviewer_email"),
    reviewNote: text("review_note").notNull().default(""),
    createdGroupId: integer("created_group_id").references(
      () => directoryGroups.id,
    ),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text("reviewed_at"),
  },
  (table) => [
    index("group_registration_status_idx").on(
      table.status,
      table.zone,
      table.createdAt,
    ),
    index("group_registration_requester_idx").on(
      table.requesterEmail,
      table.createdAt,
    ),
  ],
);

export const ethicsReports = sqliteTable(
  "ethics_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicFolio: text("public_folio").notNull(),
    trackingSecretHash: text("tracking_secret_hash").notNull(),
    category: text("category").notNull(),
    groupZone: text("group_zone").notNull().default(""),
    approximateDate: text("approximate_date").notNull().default(""),
    narrative: text("narrative").notNull(),
    peopleOrWitnesses: text("people_or_witnesses").notNull().default(""),
    supportNeeded: text("support_needed").notNull(),
    contactMethod: text("contact_method").notNull().default("none"),
    safeContact: text("safe_contact").notNull().default(""),
    consent: integer("consent", { mode: "boolean" }).notNull(),
    status: text("status").notNull().default("received"),
    severity: text("severity").notNull().default("unclassified"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ethics_reports_public_folio_idx").on(table.publicFolio),
    uniqueIndex("ethics_reports_tracking_secret_idx").on(table.trackingSecretHash),
    index("ethics_reports_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const ethicsReportEvents = sqliteTable(
  "ethics_report_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reportId: integer("report_id").notNull().references(() => ethicsReports.id),
    eventType: text("event_type").notNull(),
    status: text("status").notNull(),
    publicMessage: text("public_message").notNull().default(""),
    privateNote: text("private_note").notNull().default(""),
    actorEmail: text("actor_email").notNull().default("system"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ethics_report_events_report_idx").on(table.reportId, table.createdAt),
  ],
);

export const universityUsers = sqliteTable(
  "university_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    mobilePhone: text("mobile_phone").notNull().default(""),
    organization: text("organization").notNull().default(""),
    participantType: text("participant_type").notNull().default("participant"),
    diplomaVersion: text("diploma_version").notNull().default("2022"),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("self_registration"),
    createdBy: text("created_by").notNull().default("public-form"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("university_users_email_idx").on(table.email),
    index("university_users_status_version_idx").on(table.status, table.diplomaVersion),
  ],
);

export const universityCenterBatches = sqliteTable(
  "university_center_batches",
  {
    id: text("id").primaryKey(),
    directorEmail: text("director_email").notNull(),
    mobilePhone: text("mobile_phone").notNull(),
    centerName: text("center_name").notNull(),
    diplomaVersion: text("diploma_version").notNull(),
    participantNamesJson: text("participant_names_json").notNull().default("[]"),
    participantCount: integer("participant_count").notNull().default(0),
    status: text("status").notNull().default("received"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("university_center_batches_status_idx").on(table.status, table.createdAt)],
);

export const universityCertificateRequests = sqliteTable(
  "university_certificate_requests",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    mobilePhone: text("mobile_phone").notNull(),
    groupName: text("group_name").notNull(),
    diplomaVersion: text("diploma_version").notNull(),
    paymentStatus: text("payment_status").notNull(),
    requestType: text("request_type").notNull().default("printing"),
    status: text("status").notNull().default("pending_validation"),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default("system"),
  },
  (table) => [index("university_certificate_requests_status_idx").on(table.status, table.createdAt)],
);

export const universityPrograms = sqliteTable(
  "university_programs",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    generation: text("generation").notNull().default(""),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by").notNull().default("system"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("university_programs_status_order_idx").on(table.status, table.sortOrder)],
);

export const universityModules = sqliteTable(
  "university_modules",
  {
    id: text("id").primaryKey(),
    programId: text("program_id").notNull().references(() => universityPrograms.id),
    title: text("title").notNull(),
    videoUrl: text("video_url").notNull().default(""),
    status: text("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by").notNull().default("system"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("university_modules_program_order_idx").on(table.programId, table.status, table.sortOrder)],
);

export const universityMaterials = sqliteTable(
  "university_materials",
  {
    id: text("id").primaryKey(),
    programId: text("program_id").references(() => universityPrograms.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    resourceUrl: text("resource_url").notNull(),
    resourceType: text("resource_type").notNull().default("material"),
    status: text("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by").notNull().default("system"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("university_materials_program_order_idx").on(table.programId, table.status, table.sortOrder)],
);
