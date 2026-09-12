CREATE TABLE `access_request_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`event_type` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`snapshot_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `access_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `access_request_events_request_idx` ON `access_request_events` (`request_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `portal_users` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `portal_users` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `portal_users` ADD `source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `portal_users` ADD `created_by` text;