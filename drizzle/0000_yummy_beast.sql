CREATE TABLE `access_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_email` text NOT NULL,
	`requester_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`requested_role` text NOT NULL,
	`zone` text,
	`group_id` integer,
	`group_name` text DEFAULT '' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_email` text,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`group_id`) REFERENCES `directory_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `directory_change_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` integer NOT NULL,
	`group_version` integer NOT NULL,
	`requester_email` text NOT NULL,
	`requester_name` text NOT NULL,
	`requester_role` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`original_json` text NOT NULL,
	`proposed_json` text NOT NULL,
	`requester_note` text DEFAULT '' NOT NULL,
	`reviewer_email` text,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`group_id`) REFERENCES `directory_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `directory_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`zone` text NOT NULL,
	`name` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`leader_name` text DEFAULT '' NOT NULL,
	`subleader_name` text DEFAULT '' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`facebook` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`maps_url` text DEFAULT '' NOT NULL,
	`schedules` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`verified_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `directory_groups_zone_name_city_idx` ON `directory_groups` (`zone`,`name`,`city`);--> statement-breakpoint
CREATE TABLE `portal_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text NOT NULL,
	`zone` text,
	`group_id` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `directory_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_users_email_unique` ON `portal_users` (`email`);