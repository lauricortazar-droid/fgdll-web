CREATE TABLE `announcement_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`announcement_id` text NOT NULL,
	`user_email` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`read_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `announcement_reads_user_idx` ON `announcement_reads` (`announcement_id`,`user_email`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`priority` text DEFAULT 'info' NOT NULL,
	`audience` text DEFAULT 'all' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `announcements_status_idx` ON `announcements` (`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `content_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leader_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'otros' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`version_label` text DEFAULT '' NOT NULL,
	`file_key` text,
	`static_url` text,
	`preview_url` text,
	`file_name` text DEFAULT '' NOT NULL,
	`file_type` text DEFAULT '' NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leader_materials_status_idx` ON `leader_materials` (`status`,`category`,`sort_order`);--> statement-breakpoint
CREATE TABLE `testimony_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`intensity` text DEFAULT 'Media' NOT NULL,
	`moment` text DEFAULT 'Mitad' NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`anchor` text DEFAULT '' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`file_key` text,
	`file_name` text DEFAULT '' NOT NULL,
	`file_type` text DEFAULT '' NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`origin` text DEFAULT 'upload' NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `testimony_topics_status_idx` ON `testimony_topics` (`status`,`category`);