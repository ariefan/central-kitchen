-- Migration: Add transfer integration to requisitions
-- Purpose: Link requisitions to transfers and track issue status

-- Add transferId column to link requisitions to transfers
ALTER TABLE "erp"."requisitions" 
ADD COLUMN "transfer_id" uuid REFERENCES "erp"."transfers"("id") ON DELETE SET NULL;

-- Add issueStatus column to track fulfillment status
ALTER TABLE "erp"."requisitions" 
ADD COLUMN "issue_status" varchar(24) NOT NULL DEFAULT 'pending';

-- Add indexes for performance
CREATE INDEX "idx_req_transfer" ON "erp"."requisitions"("transfer_id");
CREATE INDEX "idx_req_issue_status" ON "erp"."requisitions"("issue_status");

-- Add check constraint for issue_status values
ALTER TABLE "erp"."requisitions" 
ADD CONSTRAINT "ck_req_issue_status" 
CHECK ("issue_status" IN ('pending', 'partial', 'fully_issued'));

-- Update existing requisitions to have default issue_status
UPDATE "erp"."requisitions" 
SET "issue_status" = 'pending' 
WHERE "issue_status" IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN "erp"."requisitions"."transfer_id" IS 'Reference to the transfer created from this requisition';
COMMENT ON COLUMN "erp"."requisitions"."issue_status" IS 'Status of requisition fulfillment: pending, partial, or fully_issued';