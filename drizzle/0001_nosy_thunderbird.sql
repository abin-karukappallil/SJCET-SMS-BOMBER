CREATE TABLE `rate_limit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`timestamp` integer NOT NULL
);
