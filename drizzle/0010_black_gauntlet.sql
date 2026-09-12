CREATE TABLE `university_center_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`director_email` text NOT NULL,
	`mobile_phone` text NOT NULL,
	`center_name` text NOT NULL,
	`diploma_version` text NOT NULL,
	`participant_names_json` text DEFAULT '[]' NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `university_center_batches_status_idx` ON `university_center_batches` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `university_certificate_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`mobile_phone` text NOT NULL,
	`group_name` text NOT NULL,
	`diploma_version` text NOT NULL,
	`payment_status` text NOT NULL,
	`request_type` text DEFAULT 'printing' NOT NULL,
	`status` text DEFAULT 'pending_validation' NOT NULL,
	`admin_notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `university_certificate_requests_status_idx` ON `university_certificate_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `university_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`mobile_phone` text DEFAULT '' NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`participant_type` text DEFAULT 'participant' NOT NULL,
	`diploma_version` text DEFAULT '2022' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text DEFAULT 'self_registration' NOT NULL,
	`created_by` text DEFAULT 'public-form' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `university_users_email_idx` ON `university_users` (`email`);--> statement-breakpoint
CREATE INDEX `university_users_status_version_idx` ON `university_users` (`status`,`diploma_version`);