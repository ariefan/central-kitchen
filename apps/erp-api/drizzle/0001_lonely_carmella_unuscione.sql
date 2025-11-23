ALTER TABLE "erp"."users" DROP CONSTRAINT "uq_user_tenant_email";--> statement-breakpoint
ALTER TABLE "erp"."users" ADD CONSTRAINT "uq_user_email" UNIQUE("email");