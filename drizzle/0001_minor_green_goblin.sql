CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_name_unique" ON "service_categories" USING btree ("name");
--> statement-breakpoint
INSERT INTO "service_categories" ("name") SELECT DISTINCT trim("category") FROM "services" WHERE trim("category") <> '' ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "last_name" text;--> statement-breakpoint
UPDATE "members" SET "first_name"=split_part("name",' ',1),"last_name"=trim(regexp_replace("name",'^[^ ]+','')) WHERE "first_name" IS NULL OR "last_name" IS NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "plan_type" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "entitlements" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "included_services" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "service_limits" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_service_categories_name_fk" FOREIGN KEY ("category") REFERENCES "public"."service_categories"("name") ON DELETE restrict ON UPDATE no action;
