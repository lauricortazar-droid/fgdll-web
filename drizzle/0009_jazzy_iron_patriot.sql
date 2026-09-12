CREATE TABLE `ethics_report_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`status` text NOT NULL,
	`public_message` text DEFAULT '' NOT NULL,
	`private_note` text DEFAULT '' NOT NULL,
	`actor_email` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `ethics_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ethics_report_events_report_idx` ON `ethics_report_events` (`report_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ethics_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_folio` text NOT NULL,
	`tracking_secret_hash` text NOT NULL,
	`category` text NOT NULL,
	`group_zone` text DEFAULT '' NOT NULL,
	`approximate_date` text DEFAULT '' NOT NULL,
	`narrative` text NOT NULL,
	`people_or_witnesses` text DEFAULT '' NOT NULL,
	`support_needed` text NOT NULL,
	`contact_method` text DEFAULT 'none' NOT NULL,
	`safe_contact` text DEFAULT '' NOT NULL,
	`consent` integer NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`severity` text DEFAULT 'unclassified' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ethics_reports_public_folio_idx` ON `ethics_reports` (`public_folio`);--> statement-breakpoint
CREATE UNIQUE INDEX `ethics_reports_tracking_secret_idx` ON `ethics_reports` (`tracking_secret_hash`);--> statement-breakpoint
CREATE INDEX `ethics_reports_status_created_idx` ON `ethics_reports` (`status`,`created_at`);