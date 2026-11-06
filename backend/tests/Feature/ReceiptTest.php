<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceiptTest extends TestCase
{
    use RefreshDatabase;

    public function test_receipt_can_be_fetched_by_token_without_authentication(): void
    {
        $product = Product::factory()->create(['name' => 'Burger', 'price_cents' => 850]);

        $order = $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json('data');

        $response = $this->getJson('/api/v1/receipts/'.$order['receipt_token']);

        $response->assertOk()
            ->assertJsonPath('data.order_number', $order['order_number'])
            ->assertJsonPath('data.total_cents', 1700)
            ->assertJsonPath('data.items.0.product_name', 'Burger')
            ->assertJsonMissingPath('data.receipt_token')
            ->assertJsonMissingPath('data.id')
            ->assertJsonMissingPath('data.items.0.id');
    }

    public function test_unknown_receipt_token_returns_generic_not_found(): void
    {
        $this->getJson('/api/v1/receipts/'.str_repeat('a', 64))
            ->assertNotFound()
            ->assertJsonPath('message', 'Not found.');
    }

    public function test_order_number_cannot_be_used_to_fetch_a_receipt(): void
    {
        $product = Product::factory()->create();

        $order = $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json('data');

        $this->getJson('/api/v1/receipts/'.$order['order_number'])
            ->assertNotFound();
    }
}
