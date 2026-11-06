<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name', 140);
            $table->smallInteger('quantity');
            $table->bigInteger('unit_price_cents');
            $table->bigInteger('line_total_cents');
            $table->timestampTz('created_at')->useCurrent();

            $table->unique(['order_id', 'product_id']);
            $table->index('product_id');
        });

        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity BETWEEN 1 AND 99)');
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_unit_price_check CHECK (unit_price_cents >= 0)');
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_line_total_check CHECK (line_total_cents = unit_price_cents * quantity)');
        DB::statement("ALTER TABLE order_items ADD CONSTRAINT order_items_product_name_check CHECK (btrim(product_name) <> '')");
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
