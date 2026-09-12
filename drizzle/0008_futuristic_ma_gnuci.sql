CREATE TABLE `orientation_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_name` text NOT NULL,
	`whatsapp` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`relationship` text DEFAULT '' NOT NULL,
	`age_group` text DEFAULT 'unknown' NOT NULL,
	`help_type` text DEFAULT 'unsure' NOT NULL,
	`danger` text DEFAULT 'unsure' NOT NULL,
	`preferred_time` text DEFAULT '' NOT NULL,
	`consent_contact` integer DEFAULT false NOT NULL,
	`consent_privacy` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`assigned_center_id` integer,
	`admin_notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT 'system' NOT NULL,
	FOREIGN KEY (`assigned_center_id`) REFERENCES `rehabilitation_centers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `orientation_requests_status_idx` ON `orientation_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orientation_requests_center_idx` ON `orientation_requests` (`assigned_center_id`,`created_at`);