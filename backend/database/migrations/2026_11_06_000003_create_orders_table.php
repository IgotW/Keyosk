<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 32)
                ->storedAs("'ORD-' || lpad(id::text, greatest(6, length(id::text)), '0')")
                ->unique();
            $table->char('receipt_token', 64)->unique();
            $table->string('status', 16)->default('pending');
            $table->string('payment_method', 16);
            $table->string('payment_status', 16)->default('unpaid');
            $table->string('payment_reference', 64)->nullable();
            $table->bigInteger('total_cents');
            $table->timestampTz('paid_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index('created_at');
            $table->index(['status', 'created_at']);
            $table->index(['payment_status', 'created_at']);
        });

        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash', 'online'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid', 'paid'))");
        DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_total_cents_check CHECK (total_cents >= 0)');
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_online_paid_check CHECK (payment_method <> 'online' OR payment_status = 'paid')");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_online_reference_check CHECK (payment_method <> 'online' OR payment_reference IS NOT NULL)");
        DB::statement(<<<'SQL'
            ALTER TABLE orders ADD CONSTRAINT orders_paid_at_check CHECK (
                (payment_status = 'paid' AND paid_at IS NOT NULL)
                OR (payment_status = 'unpaid' AND paid_at IS NULL)
            )
            SQL);
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_order_number_format_check CHECK (order_number ~ '^ORD-[0-9]{6,}$')");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_receipt_token_format_check CHECK (receipt_token ~ '^[0-9a-f]{64}$')");
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
