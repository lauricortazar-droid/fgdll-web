CREATE TABLE `monthly_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`zone` text NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`writings_json` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `monthly_experiences_month_idx` ON `monthly_experiences` (`month`,`status`,`zone`);