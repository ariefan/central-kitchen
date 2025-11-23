CREATE SCHEMA "erp";
--> statement-breakpoint
CREATE TABLE "erp"."accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" varchar(64),
	"line1" varchar(255) NOT NULL,
	"line2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"lat" numeric(10, 7),
	"lon" numeric(10, 7),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"alert_type" varchar(32) NOT NULL,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"product_id" uuid,
	"location_id" uuid,
	"reference_type" varchar(24),
	"reference_id" uuid,
	"threshold" numeric(16, 6),
	"current_value" numeric(16, 6),
	"is_read" boolean DEFAULT false NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"resolution_notes" text,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" numeric(16, 6) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"device_id" varchar(64),
	"channel" varchar(16) DEFAULT 'online',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."cost_layer_consumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layer_id" uuid NOT NULL,
	"ref_type" varchar(24) NOT NULL,
	"ref_id" uuid NOT NULL,
	"qty_out_base" numeric(18, 6) NOT NULL,
	"amount" numeric(16, 6) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."cost_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"lot_id" uuid,
	"qty_remaining_base" numeric(18, 6) NOT NULL,
	"unit_cost" numeric(16, 6) NOT NULL,
	"source_type" varchar(24) NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"auth_user_id" varchar(128),
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'external' NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"city" varchar(100),
	"payment_terms" integer,
	"credit_limit" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_customer_tenant_code" UNIQUE("tenant_id","code"),
	CONSTRAINT "uq_customer_tenant_auth" UNIQUE("tenant_id","auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "erp"."deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" varchar(64),
	"tracking_code" varchar(128),
	"fee" numeric(16, 2) DEFAULT '0' NOT NULL,
	"status" varchar(24) DEFAULT 'requested' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."doc_sequences" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"doc_type" varchar(24) NOT NULL,
	"period" varchar(10) NOT NULL,
	"location_id" uuid,
	"prefix" varchar(32),
	"next_number" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_docseq_tenant_type_period_loc" UNIQUE("tenant_id","doc_type","period","location_id")
);
--> statement-breakpoint
CREATE TABLE "erp"."drawer_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"kind" varchar(24) NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."goods_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goods_receipt_id" uuid NOT NULL,
	"purchase_order_item_id" uuid,
	"product_id" uuid NOT NULL,
	"lot_id" uuid,
	"quantity_ordered" numeric(16, 6),
	"quantity_received" numeric(16, 6) NOT NULL,
	"uom_id" uuid NOT NULL,
	"unit_cost" numeric(16, 6) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_gri_qty_pos" CHECK ("erp"."goods_receipt_items"."quantity_received" > 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"purchase_order_id" uuid,
	"location_id" uuid NOT NULL,
	"receipt_date" timestamp DEFAULT now() NOT NULL,
	"received_by" uuid,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_gr_tenant_no" UNIQUE("tenant_id","receipt_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(24) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"phone" varchar(50),
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_loc_tenant_code" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "erp"."lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"lot_no" varchar(100),
	"expiry_date" timestamp,
	"manufacture_date" timestamp,
	"received_date" timestamp DEFAULT now(),
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_lot_tenant_prod_loc_no" UNIQUE("tenant_id","product_id","location_id","lot_no")
);
--> statement-breakpoint
CREATE TABLE "erp"."loyalty_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."loyalty_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"ref_type" varchar(24) NOT NULL,
	"ref_id" uuid NOT NULL,
	"points_delta" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"location_id" uuid,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"channel" varchar(16),
	"start_at" timestamp,
	"end_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."modifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_delta" numeric(16, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."order_item_modifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"modifier_id" uuid NOT NULL,
	"price_delta" numeric(16, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"lot_id" uuid,
	"uom_id" uuid,
	"quantity" numeric(16, 6) NOT NULL,
	"unit_price" numeric(16, 2) NOT NULL,
	"tax_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(16, 2) NOT NULL,
	"prep_status" varchar(16) DEFAULT 'queued' NOT NULL,
	"station" varchar(32),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_order_qty_pos" CHECK ("erp"."order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid,
	"device_id" varchar(64),
	"channel" varchar(16) DEFAULT 'pos' NOT NULL,
	"type" varchar(16) DEFAULT 'take_away' NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"kitchen_status" varchar(16) DEFAULT 'open' NOT NULL,
	"table_no" varchar(16),
	"address_id" uuid,
	"subtotal" numeric(16, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"svc_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"tips_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"voucher_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_order_no" UNIQUE("tenant_id","order_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"tender" varchar(24) NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"reference" varchar(128),
	"change" numeric(16, 2) DEFAULT '0' NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "erp"."pos_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"device_id" varchar(64),
	"opened_by" uuid,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp,
	"float_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"expected_cash" numeric(16, 2) DEFAULT '0' NOT NULL,
	"actual_cash" numeric(16, 2) DEFAULT '0' NOT NULL,
	"variance" numeric(16, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."price_book_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_book_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"location_id" uuid,
	"price" numeric(16, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."price_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"channel" varchar(16),
	"start_at" timestamp,
	"end_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."product_modifier_groups" (
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "pk_product_modifier_group" PRIMARY KEY("product_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "erp"."product_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"uom_id" uuid NOT NULL,
	"pack_name" varchar(64),
	"to_base_factor" numeric(16, 6) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_pack_product_uom" UNIQUE("product_id","uom_id")
);
--> statement-breakpoint
CREATE TABLE "erp"."product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_name" varchar(128) NOT NULL,
	"price_differential" varchar(32) DEFAULT '0' NOT NULL,
	"barcode" varchar(255),
	"sku" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_variant_prod_name" UNIQUE("product_id","variant_name")
);
--> statement-breakpoint
CREATE TABLE "erp"."production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"recipe_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"planned_qty_base" numeric(16, 6) NOT NULL,
	"produced_qty_base" numeric(16, 6) DEFAULT '0' NOT NULL,
	"status" varchar(24) DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"created_by" uuid,
	"supervised_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_prod_tenant_no" UNIQUE("tenant_id","order_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"kind" varchar(24) NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"tax_category" varchar(32),
	"standard_cost" numeric(16, 6),
	"default_price" numeric(16, 2),
	"is_perishable" boolean DEFAULT false NOT NULL,
	"shelf_life_days" integer,
	"barcode" varchar(255),
	"image_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_product_tenant_sku" UNIQUE("tenant_id","sku")
);
--> statement-breakpoint
CREATE TABLE "erp"."promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"percent_off" numeric(5, 2),
	"product_id" uuid,
	"start_at" timestamp,
	"end_at" timestamp,
	"location_id" uuid,
	"channel" varchar(16),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(16, 6) NOT NULL,
	"uom_id" uuid NOT NULL,
	"unit_price" numeric(16, 6) NOT NULL,
	"discount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(6, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(16, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_poi_qty_pos" CHECK ("erp"."purchase_order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(16, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"shipping_cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"payment_terms" integer,
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_po_tenant_no" UNIQUE("tenant_id","order_number"),
	CONSTRAINT "ck_po_totals_nonneg" CHECK ("erp"."purchase_orders"."subtotal" >= 0 AND "erp"."purchase_orders"."tax_amount" >= 0 AND "erp"."purchase_orders"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."recipe_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty_base" numeric(16, 6) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_recipe_qty_pos" CHECK ("erp"."recipe_items"."qty_base" > 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"finished_product_id" uuid NOT NULL,
	"yield_qty_base" numeric(16, 6) NOT NULL,
	"instructions" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_recipe_code_ver" UNIQUE("tenant_id","code","version")
);
--> statement-breakpoint
CREATE TABLE "erp"."requisition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requisition_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"uom_id" uuid NOT NULL,
	"qty_requested" numeric(16, 6) NOT NULL,
	"qty_issued" numeric(16, 6) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_req_qtyreq_pos" CHECK ("erp"."requisition_items"."qty_requested" > 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"req_number" varchar(50) NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"requested_date" timestamp DEFAULT now() NOT NULL,
	"required_date" timestamp,
	"issued_date" timestamp,
	"delivered_date" timestamp,
	"requested_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_req_tenant_no" UNIQUE("tenant_id","req_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."return_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_id" uuid,
	"uom_id" uuid NOT NULL,
	"quantity" numeric(16, 6) NOT NULL,
	"unit_price" numeric(16, 2),
	"reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_return_qty_pos" CHECK ("erp"."return_order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."return_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"return_number" varchar(50) NOT NULL,
	"return_type" varchar(24) NOT NULL,
	"reference_type" varchar(24),
	"reference_id" uuid,
	"supplier_id" uuid,
	"customer_id" uuid,
	"location_id" uuid NOT NULL,
	"return_date" timestamp DEFAULT now() NOT NULL,
	"status" varchar(24) DEFAULT 'requested' NOT NULL,
	"reason" text NOT NULL,
	"total_amount" numeric(16, 2),
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_return_tenant_no" UNIQUE("tenant_id","return_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "erp"."stock_adjustment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_id" uuid,
	"uom_id" uuid NOT NULL,
	"qty_delta" numeric(16, 6) NOT NULL,
	"unit_cost" numeric(16, 6),
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adj_number" varchar(50) NOT NULL,
	"location_id" uuid NOT NULL,
	"reason" varchar(24) NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_adj_tenant_no" UNIQUE("tenant_id","adj_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."stock_count_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_id" uuid,
	"system_qty_base" numeric(16, 6) NOT NULL,
	"counted_qty_base" numeric(16, 6) NOT NULL,
	"variance_qty_base" numeric(16, 6) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."stock_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"count_number" varchar(50) NOT NULL,
	"location_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_count_tenant_no" UNIQUE("tenant_id","count_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."stock_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"lot_id" uuid,
	"txn_ts" timestamp DEFAULT now() NOT NULL,
	"type" varchar(16) NOT NULL,
	"qty_delta_base" numeric(18, 6) NOT NULL,
	"unit_cost" numeric(16, 6),
	"ref_type" varchar(24) NOT NULL,
	"ref_id" uuid NOT NULL,
	"note" text,
	"created_by" uuid,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "erp"."supplier_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_sku" varchar(100),
	"uom_id" uuid NOT NULL,
	"unit_price" numeric(16, 6) NOT NULL,
	"min_order_qty" numeric(16, 6),
	"lead_time_days" integer,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_supplier_product" UNIQUE("supplier_id","product_id"),
	CONSTRAINT "ck_supplier_unit_price_pos" CHECK ("erp"."supplier_products"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"city" varchar(100),
	"tax_id" varchar(100),
	"payment_terms" integer,
	"credit_limit" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_supplier_tenant_code" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "erp"."tax_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	CONSTRAINT "uq_taxcat" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "erp"."tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_code" varchar(32) NOT NULL,
	"rate_pct" numeric(6, 3) NOT NULL,
	"inclusive" boolean DEFAULT true NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp,
	"location_id" uuid
);
--> statement-breakpoint
CREATE TABLE "erp"."temperature_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"area" varchar(255),
	"temperature" numeric(6, 2) NOT NULL,
	"humidity" numeric(6, 2),
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"device_id" varchar(100),
	"is_alert" boolean DEFAULT false NOT NULL,
	"alert_reason" text,
	"recorded_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" varchar(128) NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_org_slug" UNIQUE("org_id","slug")
);
--> statement-breakpoint
CREATE TABLE "erp"."transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_id" uuid,
	"uom_id" uuid NOT NULL,
	"quantity" numeric(16, 6) NOT NULL,
	"qty_received" numeric(16, 6),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ck_xfer_qty_pos" CHECK ("erp"."transfer_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "erp"."transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transfer_number" varchar(50) NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"transfer_date" timestamp DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"requested_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp,
	"sent_by" uuid,
	"sent_at" timestamp,
	"received_by" uuid,
	"received_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_xfer_tenant_no" UNIQUE("tenant_id","transfer_number")
);
--> statement-breakpoint
CREATE TABLE "erp"."uom_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_uom_id" uuid NOT NULL,
	"to_uom_id" uuid NOT NULL,
	"factor" numeric(16, 6) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_conv_tenant_pair" UNIQUE("tenant_id","from_uom_id","to_uom_id")
);
--> statement-breakpoint
CREATE TABLE "erp"."uoms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" varchar(100) NOT NULL,
	"uom_type" varchar(20) NOT NULL,
	"symbol" varchar(20),
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_uom_tenant_code" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "erp"."user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "uq_user_location" UNIQUE("user_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "erp"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" varchar(128),
	"tenant_id" uuid,
	"name" text,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(50),
	"role" varchar(50),
	"location_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"metadata" jsonb,
	"username" varchar(255),
	"display_username" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "uq_user_tenant_email" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE "erp"."verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."voucher_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"amount_applied" numeric(16, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp"."vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"min_spend" numeric(16, 2),
	"usage_limit" integer,
	"usage_per_customer" integer,
	"start_at" timestamp,
	"end_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_voucher_code" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
ALTER TABLE "erp"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "erp"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "erp"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."alerts" ADD CONSTRAINT "alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."alerts" ADD CONSTRAINT "alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."alerts" ADD CONSTRAINT "alerts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "erp"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "erp"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "erp"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cost_layer_consumptions" ADD CONSTRAINT "cost_layer_consumptions_layer_id_cost_layers_id_fk" FOREIGN KEY ("layer_id") REFERENCES "erp"."cost_layers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cost_layers" ADD CONSTRAINT "cost_layers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cost_layers" ADD CONSTRAINT "cost_layers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cost_layers" ADD CONSTRAINT "cost_layers_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."cost_layers" ADD CONSTRAINT "cost_layers_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."deliveries" ADD CONSTRAINT "deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "erp"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."doc_sequences" ADD CONSTRAINT "doc_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."drawer_movements" ADD CONSTRAINT "drawer_movements_shift_id_pos_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "erp"."pos_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "erp"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "erp"."purchase_order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipts" ADD CONSTRAINT "goods_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "erp"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."goods_receipts" ADD CONSTRAINT "goods_receipts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."locations" ADD CONSTRAINT "locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."lots" ADD CONSTRAINT "lots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."lots" ADD CONSTRAINT "lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."lots" ADD CONSTRAINT "lots_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "erp"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "erp"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."menu_items" ADD CONSTRAINT "menu_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "erp"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."menu_items" ADD CONSTRAINT "menu_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."menu_items" ADD CONSTRAINT "menu_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "erp"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."menu_items" ADD CONSTRAINT "menu_items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."menus" ADD CONSTRAINT "menus_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."modifier_groups" ADD CONSTRAINT "modifier_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."modifiers" ADD CONSTRAINT "modifiers_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "erp"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "erp"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_id_modifiers_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "erp"."modifiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "erp"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "erp"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."order_items" ADD CONSTRAINT "order_items_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."order_items" ADD CONSTRAINT "order_items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."orders" ADD CONSTRAINT "orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "erp"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."orders" ADD CONSTRAINT "orders_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "erp"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "erp"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."pos_shifts" ADD CONSTRAINT "pos_shifts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."pos_shifts" ADD CONSTRAINT "pos_shifts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."price_book_items" ADD CONSTRAINT "price_book_items_price_book_id_price_books_id_fk" FOREIGN KEY ("price_book_id") REFERENCES "erp"."price_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."price_book_items" ADD CONSTRAINT "price_book_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."price_book_items" ADD CONSTRAINT "price_book_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "erp"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."price_book_items" ADD CONSTRAINT "price_book_items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."price_books" ADD CONSTRAINT "price_books_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "erp"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."product_packs" ADD CONSTRAINT "product_packs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."product_packs" ADD CONSTRAINT "product_packs_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."production_orders" ADD CONSTRAINT "production_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."production_orders" ADD CONSTRAINT "production_orders_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "erp"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."production_orders" ADD CONSTRAINT "production_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."products" ADD CONSTRAINT "products_base_uom_id_uoms_id_fk" FOREIGN KEY ("base_uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."promotions" ADD CONSTRAINT "promotions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."promotions" ADD CONSTRAINT "promotions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."promotions" ADD CONSTRAINT "promotions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "erp"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "erp"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."purchase_orders" ADD CONSTRAINT "purchase_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "erp"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."recipe_items" ADD CONSTRAINT "recipe_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."recipes" ADD CONSTRAINT "recipes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."recipes" ADD CONSTRAINT "recipes_finished_product_id_products_id_fk" FOREIGN KEY ("finished_product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."requisition_items" ADD CONSTRAINT "requisition_items_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "erp"."requisitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."requisition_items" ADD CONSTRAINT "requisition_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."requisition_items" ADD CONSTRAINT "requisition_items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."requisitions" ADD CONSTRAINT "requisitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."requisitions" ADD CONSTRAINT "requisitions_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."requisitions" ADD CONSTRAINT "requisitions_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_order_items" ADD CONSTRAINT "return_order_items_return_order_id_return_orders_id_fk" FOREIGN KEY ("return_order_id") REFERENCES "erp"."return_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_order_items" ADD CONSTRAINT "return_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_order_items" ADD CONSTRAINT "return_order_items_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_order_items" ADD CONSTRAINT "return_order_items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_orders" ADD CONSTRAINT "return_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_orders" ADD CONSTRAINT "return_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "erp"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_orders" ADD CONSTRAINT "return_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "erp"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."return_orders" ADD CONSTRAINT "return_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "erp"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_adjustment_id_stock_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "erp"."stock_adjustments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_count_lines" ADD CONSTRAINT "stock_count_lines_count_id_stock_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "erp"."stock_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_count_lines" ADD CONSTRAINT "stock_count_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_count_lines" ADD CONSTRAINT "stock_count_lines_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_counts" ADD CONSTRAINT "stock_counts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_counts" ADD CONSTRAINT "stock_counts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_ledger" ADD CONSTRAINT "stock_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_ledger" ADD CONSTRAINT "stock_ledger_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_ledger" ADD CONSTRAINT "stock_ledger_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."stock_ledger" ADD CONSTRAINT "stock_ledger_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "erp"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."supplier_products" ADD CONSTRAINT "supplier_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."supplier_products" ADD CONSTRAINT "supplier_products_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."tax_categories" ADD CONSTRAINT "tax_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."tax_rates" ADD CONSTRAINT "tax_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."tax_rates" ADD CONSTRAINT "tax_rates_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."temperature_logs" ADD CONSTRAINT "temperature_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."temperature_logs" ADD CONSTRAINT "temperature_logs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."transfer_items" ADD CONSTRAINT "transfer_items_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "erp"."transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."transfer_items" ADD CONSTRAINT "transfer_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "erp"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."transfer_items" ADD CONSTRAINT "transfer_items_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "erp"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."transfer_items" ADD CONSTRAINT "transfer_items_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."transfers" ADD CONSTRAINT "transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."transfers" ADD CONSTRAINT "transfers_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."transfers" ADD CONSTRAINT "transfers_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "erp"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."uom_conversions" ADD CONSTRAINT "uom_conversions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."uom_conversions" ADD CONSTRAINT "uom_conversions_from_uom_id_uoms_id_fk" FOREIGN KEY ("from_uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."uom_conversions" ADD CONSTRAINT "uom_conversions_to_uom_id_uoms_id_fk" FOREIGN KEY ("to_uom_id") REFERENCES "erp"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."uoms" ADD CONSTRAINT "uoms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."user_locations" ADD CONSTRAINT "user_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "erp"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."user_locations" ADD CONSTRAINT "user_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."user_locations" ADD CONSTRAINT "user_locations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "erp"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."users" ADD CONSTRAINT "users_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "erp"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "erp"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "erp"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "erp"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "erp"."vouchers" ADD CONSTRAINT "vouchers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "erp"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alert_type" ON "erp"."alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "idx_alert_priority" ON "erp"."alerts" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_cost_layer_cons" ON "erp"."cost_layer_consumptions" USING btree ("layer_id");--> statement-breakpoint
CREATE INDEX "idx_cost_layer_key" ON "erp"."cost_layers" USING btree ("tenant_id","product_id","location_id","lot_id");--> statement-breakpoint
CREATE INDEX "idx_drawer_shift" ON "erp"."drawer_movements" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "idx_gri_gr" ON "erp"."goods_receipt_items" USING btree ("goods_receipt_id");--> statement-breakpoint
CREATE INDEX "idx_gr_po" ON "erp"."goods_receipts" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_location_type" ON "erp"."locations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_lot_prod_loc_exp" ON "erp"."lots" USING btree ("product_id","location_id","expiry_date");--> statement-breakpoint
CREATE INDEX "idx_modgrp_name" ON "erp"."modifier_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_mod_group" ON "erp"."modifiers" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_item_mods" ON "erp"."order_item_modifiers" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_order_items" ON "erp"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_prep_status" ON "erp"."order_items" USING btree ("prep_status");--> statement-breakpoint
CREATE INDEX "idx_order_status" ON "erp"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_order_kitchen_status" ON "erp"."orders" USING btree ("kitchen_status");--> statement-breakpoint
CREATE INDEX "idx_payment_order" ON "erp"."payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_shift_loc" ON "erp"."pos_shifts" USING btree ("location_id","opened_at");--> statement-breakpoint
CREATE INDEX "idx_variant_display_order" ON "erp"."product_variants" USING btree ("product_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_prod_status" ON "erp"."production_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_product_kind" ON "erp"."products" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_product_name" ON "erp"."products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_poi_po" ON "erp"."purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_po_status" ON "erp"."purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_recipe_items_recipe" ON "erp"."recipe_items" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_req_items_req" ON "erp"."requisition_items" USING btree ("requisition_id");--> statement-breakpoint
CREATE INDEX "idx_req_status" ON "erp"."requisitions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_return_items" ON "erp"."return_order_items" USING btree ("return_order_id");--> statement-breakpoint
CREATE INDEX "idx_return_status" ON "erp"."return_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_adj_items" ON "erp"."stock_adjustment_items" USING btree ("adjustment_id");--> statement-breakpoint
CREATE INDEX "idx_count_lines" ON "erp"."stock_count_lines" USING btree ("count_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_prod_loc_ts" ON "erp"."stock_ledger" USING btree ("product_id","location_id","txn_ts");--> statement-breakpoint
CREATE INDEX "idx_ledger_ref" ON "erp"."stock_ledger" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_tenant" ON "erp"."stock_ledger" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_lot" ON "erp"."stock_ledger" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_name" ON "erp"."suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_temp_loc_time" ON "erp"."temperature_logs" USING btree ("location_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_temp_alert" ON "erp"."temperature_logs" USING btree ("is_alert");--> statement-breakpoint
CREATE INDEX "idx_tenant_org" ON "erp"."tenants" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_xfer_items" ON "erp"."transfer_items" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "idx_xfer_status" ON "erp"."transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_locations_user" ON "erp"."user_locations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_locations_location" ON "erp"."user_locations" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_user_auth" ON "erp"."users" USING btree ("auth_user_id");