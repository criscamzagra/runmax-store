import { Migration } from "@mikro-orm/migrations"

export class Migration20260717000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "vendor" ADD COLUMN IF NOT EXISTS "pickup_address" TEXT NULL;`)
    this.addSql(`ALTER TABLE "vendor" ADD COLUMN IF NOT EXISTS "pickup_city" TEXT NULL;`)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "vendor" DROP COLUMN IF EXISTS "pickup_address";`)
    this.addSql(`ALTER TABLE "vendor" DROP COLUMN IF EXISTS "pickup_city";`)
  }
}
