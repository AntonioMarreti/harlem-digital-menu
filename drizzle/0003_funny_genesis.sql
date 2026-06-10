CREATE TABLE "menu_item_availability" (
	"item_id" varchar(255) PRIMARY KEY NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
