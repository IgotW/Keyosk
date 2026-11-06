<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_listing_only_returns_available_products_sorted_by_name(): void
    {
        Product::factory()->create(['name' => 'Zeta Burger', 'price_cents' => 900]);
        Product::factory()->create(['name' => 'Alpha Fries', 'price_cents' => 300]);
        Product::factory()->unavailable()->create(['name' => 'Hidden Shake', 'price_cents' => 400]);

        $response = $this->getJson('/api/v1/products');

        $response->assertOk()
            ->assertJsonPath('meta.currency', 'USD')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Alpha Fries')
            ->assertJsonPath('data.1.name', 'Zeta Burger')
            ->assertJsonMissing(['name' => 'Hidden Shake']);
    }

    public function test_public_listing_returns_an_empty_array_when_nothing_is_available(): void
    {
        Product::factory()->unavailable()->create();

        $this->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
