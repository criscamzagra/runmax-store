import { Migration } from "@mikro-orm/migrations"

export class Migration20261006000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "vendor" ADD COLUMN IF NOT EXISTS "pickup_neighborhood" TEXT NULL;`)
    this.addSql(`ALTER TABLE "vendor" ADD COLUMN IF NOT EXISTS "pickup_reference" TEXT NULL;`)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "vendor" DROP COLUMN IF EXISTS "pickup_neighborhood";`)
    this.addSql(`ALTER TABLE "vendor" DROP COLUMN IF EXISTS "pickup_reference";`)
  }
}
