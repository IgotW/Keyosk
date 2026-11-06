<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->admin()->create());
    }

    public function test_admin_can_list_orders_with_item_counts(): void
    {
        $this->createOrder(Product::factory()->create(['price_cents' => 500]), 'cash');
        $this->createOrder(Product::factory()->create(['price_cents' => 700]), 'online');

        $response = $this->getJson('/api/v1/admin/orders');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.items_count', 1)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'order_number', 'status', 'payment_method', 'payment_status', 'total_cents', 'items_count', 'created_at'],
                ],
            ]);
    }

    public function test_admin_can_view_order_detail_with_items(): void
    {
        $order = $this->createOrder(Product::factory()->create(['name' => 'Detail Burger', 'price_cents' => 600]));

        $this->getJson("/api/v1/admin/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.items.0.product_name', 'Detail Burger')
            ->assertJsonPath('data.items.0.line_total_cents', 600)
            ->assertJsonStructure(['data' => ['receipt_token', 'items']]);
    }

    public function test_admin_can_mark_an_unpaid_cash_order_as_paid(): void
    {
        $order = $this->createOrder(Product::factory()->create(), 'cash');

        $this->postJson("/api/v1/admin/orders/{$order->id}/mark-paid")
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.payment_reference', null);

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);
    }

    public function test_marking_an_already_paid_cash_order_is_idempotent(): void
    {
        $order = $this->createOrder(Product::factory()->create(), 'cash');

        $this->postJson("/api/v1/admin/orders/{$order->id}/mark-paid")->assertOk();
        $this->postJson("/api/v1/admin/orders/{$order->id}/mark-paid")->assertOk();

        $this->assertSame('paid', $order->refresh()->payment_status);
    }

    public function test_online_and_cancelled_orders_cannot_be_marked_paid_as_cash(): void
    {
        $online = $this->createOrder(Product::factory()->create(), 'online');
        $this->postJson("/api/v1/admin/orders/{$online->id}/mark-paid")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment_method');

        $cancelled = $this->createOrder(Product::factory()->create(), 'cash');
        $this->patchJson("/api/v1/admin/orders/{$cancelled->id}/status", ['status' => 'cancelled'])
            ->assertOk();

        $this->postJson("/api/v1/admin/orders/{$cancelled->id}/mark-paid")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_admin_can_update_order_status(): void
    {
        $order = $this->createOrder(Product::factory()->create());

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'invalid'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_missing_order_returns_generic_not_found(): void
    {
        $this->getJson('/api/v1/admin/orders/999999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Not found.');
    }

    private function createOrder(Product $product, string $paymentMethod = 'cash'): Order
    {
        $data = $this->postJson('/api/v1/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => $paymentMethod,
        ])->assertCreated()->json('data');

        return Order::where('order_number', $data['order_number'])->firstOrFail();
    }
}
