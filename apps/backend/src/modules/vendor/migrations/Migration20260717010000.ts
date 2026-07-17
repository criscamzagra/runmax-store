import { Migration } from "@mikro-orm/migrations"

export class Migration20260717010000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "vendor" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT FALSE;`)
    this.addSql(`ALTER TABLE "vendor" ADD COLUMN IF NOT EXISTS "email_verification_token" TEXT NULL;`)
    this.addSql(`ALTER TABLE "vendor" ADD COLUMN IF NOT EXISTS "email_verification_expires_at" TIMESTAMPTZ NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_email_verification_token" ON "vendor" ("email_verification_token");`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_vendor_email_verification_token";`)
    this.addSql(`ALTER TABLE "vendor" DROP COLUMN IF EXISTS "email_verified";`)
    this.addSql(`ALTER TABLE "vendor" DROP COLUMN IF EXISTS "email_verification_token";`)
    this.addSql(`ALTER TABLE "vendor" DROP COLUMN IF EXISTS "email_verification_expires_at";`)
  }
}
