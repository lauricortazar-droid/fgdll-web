CREATE TABLE `distribution_workspaces` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
