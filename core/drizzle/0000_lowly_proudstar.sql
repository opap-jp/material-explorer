CREATE TABLE `components` (
	`id` text PRIMARY KEY NOT NULL,
	`repository_id` text NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`blob_id` text,
	FOREIGN KEY (`repository_id`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_components_kind" CHECK("components"."kind" IN ('directory', 'file')),
	CONSTRAINT "ck_components_blob_id" CHECK(("components"."kind" = 'file') = ("components"."blob_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `ix_components_repository` ON `components` (`repository_id`);--> statement-breakpoint
CREATE INDEX `ix_components_blob` ON `components` (`blob_id`);--> statement-breakpoint
CREATE TABLE `progress` (
	`id` text PRIMARY KEY NOT NULL,
	`running` integer NOT NULL,
	`current` integer NOT NULL,
	`max` integer NOT NULL,
	`processing` text NOT NULL,
	`name` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`head_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `thumbnails` (
	`blob_id` text PRIMARY KEY NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL
);
