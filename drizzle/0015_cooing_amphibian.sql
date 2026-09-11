CREATE TABLE `university_recognitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`folio` text NOT NULL,
	`sequence` integer NOT NULL,
	`program` text NOT NULL,
	`year` integer NOT NULL,
	`full_name` text NOT NULL,
	`conocer_folio` text DEFAULT '' NOT NULL,
	`sent_at` text,
	`printed_at` text,
	`delivered_at` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `university_recognitions_folio_idx` ON `university_recognitions` (`folio`);--> statement-breakpoint
CREATE UNIQUE INDEX `university_recognitions_year_sequence_idx` ON `university_recognitions` (`year`,`sequence`);--> statement-breakpoint
CREATE INDEX `university_recognitions_program_year_idx` ON `university_recognitions` (`program`,`year`);