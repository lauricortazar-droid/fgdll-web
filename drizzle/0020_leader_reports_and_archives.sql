ALTER TABLE `access_requests` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `directory_change_requests` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `announcement_reads` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `admin_inbox_reads` ADD `archived_at` text;--> statement-breakpoint
CREATE TABLE `leader_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_email` text NOT NULL,
	`reporter_name` text DEFAULT '' NOT NULL,
	`reporter_role` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`group_zone` text DEFAULT '' NOT NULL,
	`approximate_date` text DEFAULT '' NOT NULL,
	`narrative` text NOT NULL,
	`people_or_witnesses` text DEFAULT '' NOT NULL,
	`support_needed` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`admin_notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE INDEX `leader_reports_status_created_idx` ON `leader_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `leader_reports_reporter_idx` ON `leader_reports` (`reporter_email`,`created_at`);
