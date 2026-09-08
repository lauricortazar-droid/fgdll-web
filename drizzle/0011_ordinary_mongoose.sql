CREATE TABLE `university_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`resource_url` text NOT NULL,
	`resource_type` text DEFAULT 'material' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `university_programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `university_materials_program_order_idx` ON `university_materials` (`program_id`,`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `university_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`title` text NOT NULL,
	`video_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `university_programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `university_modules_program_order_idx` ON `university_modules` (`program_id`,`status`,`sort_order`);--> statement-breakpoint
CREATE TABLE `university_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`generation` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `university_programs_status_order_idx` ON `university_programs` (`status`,`sort_order`);