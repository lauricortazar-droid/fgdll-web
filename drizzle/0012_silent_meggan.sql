ALTER TABLE `university_center_batches` ADD `request_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `university_certificate_requests` ADD `request_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `university_users` ADD `request_notes` text DEFAULT '' NOT NULL;