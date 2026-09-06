CREATE TABLE `center_directors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`center_id` integer NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`center_id`) REFERENCES `rehabilitation_centers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `center_directors_center_email_idx` ON `center_directors` (`center_id`,`email`);--> statement-breakpoint
CREATE INDEX `center_directors_email_idx` ON `center_directors` (`email`,`active`);--> statement-breakpoint
CREATE TABLE `center_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_type` text NOT NULL,
	`center_id` integer,
	`center_version` integer,
	`requester_email` text NOT NULL,
	`requester_name` text NOT NULL,
	`requester_phone` text DEFAULT '' NOT NULL,
	`proposed_json` text NOT NULL,
	`original_json` text DEFAULT '{}' NOT NULL,
	`requester_note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_email` text,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`center_id`) REFERENCES `rehabilitation_centers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `center_requests_status_idx` ON `center_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `center_requests_requester_idx` ON `center_requests` (`requester_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `center_requests_center_idx` ON `center_requests` (`center_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `rehabilitation_centers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`network` text DEFAULT 'Red Teocalli' NOT NULL,
	`state` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`whatsapp` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`maps_url` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`services` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rehabilitation_centers_name_city_idx` ON `rehabilitation_centers` (`name`,`city`);--> statement-breakpoint
CREATE INDEX `rehabilitation_centers_public_idx` ON `rehabilitation_centers` (`status`,`state`,`city`);--> statement-breakpoint
ALTER TABLE `portal_users` ADD `center_id` integer REFERENCES rehabilitation_centers(id);