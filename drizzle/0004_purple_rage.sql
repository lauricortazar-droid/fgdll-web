CREATE TABLE `group_registration_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_email` text NOT NULL,
	`requester_name` text DEFAULT '' NOT NULL,
	`requester_role` text NOT NULL,
	`zone` text NOT NULL,
	`proposed_json` text NOT NULL,
	`requester_note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_email` text,
	`review_note` text DEFAULT '' NOT NULL,
	`created_group_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`created_group_id`) REFERENCES `directory_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `group_registration_status_idx` ON `group_registration_requests` (`status`,`zone`,`created_at`);--> statement-breakpoint
CREATE INDEX `group_registration_requester_idx` ON `group_registration_requests` (`requester_email`,`created_at`);