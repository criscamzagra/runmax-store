import { Migration } from "@mikro-orm/migrations"

export class Migration20260605000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "vendor" (
        "id" TEXT NOT NULL,
        "company_name" TEXT NOT NULL,
        "nit" TEXT NOT NULL,
        "contact_name" TEXT NOT NULL,
        "contact_email" TEXT NOT NULL,
        "contact_phone" TEXT NULL,
        "description" TEXT NULL,
        "logo_url" TEXT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "fee_pct" REAL NOT NULL DEFAULT 15,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_nit" ON "vendor" ("nit");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_status" ON "vendor" ("status");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_deleted_at" ON "vendor" ("deleted_at");`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "vendor";`)
  }
}
