CREATE TABLE `admin_inbox_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_key` text NOT NULL,
	`user_email` text NOT NULL,
	`source_updated_at` text NOT NULL,
	`read_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_inbox_reads_item_user_idx` ON `admin_inbox_reads` (`item_key`,`user_email`);