<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_order_is_created_unpaid_with_server_computed_totals(): void
    {
        $burger = Product::factory()->create(['name' => 'Classic Burger', 'price_cents' => 850]);
        $fries = Product::factory()->create(['name' => 'Fries', 'price_cents' => 350]);

        $response = $this->postJson('/api/v1/orders', [
            'items' => [
                ['product_id' => $burger->id, 'quantity' => 2, 'unit_price_cents' => 1],
                ['product_id' => $fries->id, 'quantity' => 1],
            ],
            'payment_method' => 'cash',
            'total_cents' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_method', 'cash')
            ->assertJsonPath('data.payment_status', 'unpaid')
            ->assertJsonPath('data.payment_reference', null)
            ->assertJsonPath('data.total_cents', 2050)
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonPath('data.items.0.product_name', 'Classic Burger')
            ->assertJsonPath('data.items.0.unit_price_cents', 850)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.line_total_cents', 1700)
            ->assertJsonPath('data.items.1.line_total_cents', 350);

        $this->assertMatchesRegularExpression('/^ORD-\d{6,}$/', $response->json('data.order_number'));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $response->json('data.receipt_token'));

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_items', 2);
    }

    public function test_mock_online_order_is_paid_immediately_with_a_reference(): void
    {
        $product = Product::factory()->create(['price_cents' => 500]);

        $response = $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'online',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.payment_method', 'online')
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.total_cents', 500);

        $this->assertStringStartsWith('MOCK-', $response->json('data.payment_reference'));
        $this->assertNotNull($response->json('data.paid_at'));

        $order = Order::firstOrFail();
        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);
    }

    public function test_order_creation_rejects_empty_items(): void
    {
        $response = $this->postJson('/api/v1/orders', [
            'items' => [],
            'payment_method' => 'cash',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_creation_rejects_duplicate_products(): void
    {
        $product = Product::factory()->create();

        $response = $this->postJson('/api/v1/orders', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
                ['product_id' => $product->id, 'quantity' => 2],
            ],
            'payment_method' => 'cash',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('items.1.product_id');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_creation_rejects_invalid_quantities(): void
    {
        $product = Product::factory()->create();

        foreach ([0, 100, 1.5, '2'] as $quantity) {
            $response = $this->postJson('/api/v1/orders', [
                'items' => [['product_id' => $product->id, 'quantity' => $quantity]],
                'payment_method' => 'cash',
            ]);

            $response->assertUnprocessable()->assertJsonValidationErrors('items.0.quantity');
        }

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_creation_rejects_missing_and_unavailable_products(): void
    {
        $unavailable = Product::factory()->unavailable()->create();

        $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => 999999, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.product_id');

        $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $unavailable->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.product_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_creation_rejects_invalid_payment_methods(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'card',
        ])->assertUnprocessable()->assertJsonValidationErrors('payment_method');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_creation_rolls_back_when_any_item_is_invalid(): void
    {
        $available = Product::factory()->create();
        $unavailable = Product::factory()->unavailable()->create();

        $this->postJson('/api/v1/orders', [
            'items' => [
                ['product_id' => $available->id, 'quantity' => 1],
                ['product_id' => $unavailable->id, 'quantity' => 1],
            ],
            'payment_method' => 'cash',
        ])->assertUnprocessable()->assertJsonValidationErrors('items.1.product_id');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_order_items_keep_snapshots_after_product_edit_and_delete(): void
    {
        $product = Product::factory()->create(['name' => 'Original', 'price_cents' => 700]);

        $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated();

        $product->update(['name' => 'Renamed', 'price_cents' => 999]);
        $product->delete();

        $order = Order::with('items')->firstOrFail();
        $item = $order->items->first();

        $this->assertNull($item->product_id);
        $this->assertSame('Original', $item->product_name);
        $this->assertSame(700, $item->unit_price_cents);
        $this->assertSame(2, $item->quantity);
        $this->assertSame(1400, $item->line_total_cents);
    }
}
