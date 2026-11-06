<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProductTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->admin()->create());
    }

    public function test_admin_list_includes_unavailable_products(): void
    {
        Product::factory()->create(['name' => 'Available']);
        Product::factory()->unavailable()->create(['name' => 'Unavailable']);

        $this->getJson('/api/v1/admin/products')
            ->assertOk()
            ->assertJsonPath('meta.currency', 'USD')
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['name' => 'Unavailable']);
    }

    public function test_admin_can_create_a_product(): void
    {
        $response = $this->postJson('/api/v1/admin/products', [
            'name' => 'New Burger',
            'description' => 'Tasty',
            'price_cents' => 950,
            'image_url' => 'https://example.com/burger.jpg',
            'is_available' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'New Burger')
            ->assertJsonPath('data.price_cents', 950)
            ->assertJsonPath('data.is_available', true);

        $this->assertDatabaseHas('products', ['name' => 'New Burger', 'price_cents' => 950]);
    }

    public function test_product_validation_rejects_invalid_data(): void
    {
        $this->postJson('/api/v1/admin/products', [
            'name' => '   ',
            'price_cents' => -1,
            'image_url' => 'not-a-url',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'price_cents', 'image_url']);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_admin_can_update_a_product_and_toggle_availability(): void
    {
        $product = Product::factory()->create([
            'name' => 'Old Name',
            'price_cents' => 500,
            'is_available' => true,
        ]);

        $this->patchJson("/api/v1/admin/products/{$product->id}", [
            'name' => 'New Name',
            'price_cents' => 750,
            'is_available' => false,
        ])->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.price_cents', 750)
            ->assertJsonPath('data.is_available', false);
    }

    public function test_deleting_a_product_preserves_order_item_snapshots(): void
    {
        $product = Product::factory()->create(['name' => 'Snapshot Burger', 'price_cents' => 800]);

        $order = $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated();

        $this->deleteJson("/api/v1/admin/products/{$product->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => Order::firstOrFail()->id,
            'product_id' => null,
            'product_name' => 'Snapshot Burger',
            'unit_price_cents' => 800,
            'quantity' => 2,
            'line_total_cents' => 1600,
        ]);
    }

    public function test_missing_product_returns_generic_not_found(): void
    {
        $this->getJson('/api/v1/admin/products/999999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Not found.');
    }
}
