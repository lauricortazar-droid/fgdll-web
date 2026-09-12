ALTER TABLE `university_center_batches` ADD `design_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `university_center_batches` ADD `sent_to_contact` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `university_certificate_requests` ADD `tasks_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `university_certificate_requests` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `university_certificate_requests` ADD `design_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `university_certificate_requests` ADD `sent_to_contact` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `university_users` ADD `design_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `university_users` ADD `sent_to_contact` integer DEFAULT false NOT NULL;