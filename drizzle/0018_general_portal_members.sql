ALTER TABLE `portal_users` ADD `role_label` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `access_requests` ADD `requested_role_label` text DEFAULT '' NOT NULL;
