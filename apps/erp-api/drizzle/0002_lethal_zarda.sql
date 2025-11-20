CREATE TABLE "erp"."user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "uq_user_location" UNIQUE("user_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "erp"."user_locations" ADD CONSTRAINT "user_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "erp"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."user_locations" ADD CONSTRAINT "user_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."user_locations" ADD CONSTRAINT "user_locations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "erp"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_locations_user" ON "erp"."user_locations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_locations_location" ON "erp"."user_locations" USING btree ("location_id");