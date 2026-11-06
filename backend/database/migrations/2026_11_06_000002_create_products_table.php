<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 140);
            $table->text('description')->nullable();
            $table->bigInteger('price_cents');
            $table->string('image_url', 2048)->nullable();
            $table->boolean('is_available')->default(true);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['is_available', 'name']);
        });

        DB::statement("ALTER TABLE products ADD CONSTRAINT products_name_check CHECK (btrim(name) <> '')");
        DB::statement('ALTER TABLE products ADD CONSTRAINT products_price_cents_check CHECK (price_cents >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
