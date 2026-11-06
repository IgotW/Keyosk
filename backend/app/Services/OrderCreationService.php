<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderCreationService
{
    /**
     * @param  array{items: array<int, array{product_id: int, quantity: int}>, payment_method: string}  $data
     */
    public function create(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $items = $data['items'];
            $productIds = array_column($items, 'product_id');

            if (count($productIds) !== count(array_unique($productIds))) {
                throw ValidationException::withMessages([
                    'items' => ['Each product may only appear once in the cart.'],
                ]);
            }

            $products = Product::query()
                ->whereIn('id', $productIds)
                ->get()
                ->keyBy('id');

            $errors = [];
            $lineTotals = [];
            $rows = [];

            foreach ($items as $index => $item) {
                $product = $products->get($item['product_id']);

                if ($product === null || ! $product->is_available) {
                    $errors["items.{$index}.product_id"] = ['This product is unavailable.'];

                    continue;
                }

                $lineTotal = $product->price_cents * $item['quantity'];
                $lineTotals[] = $lineTotal;

                $rows[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $item['quantity'],
                    'unit_price_cents' => $product->price_cents,
                    'line_total_cents' => $lineTotal,
                ];
            }

            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }

            $paymentMethod = $data['payment_method'];
            $isOnline = $paymentMethod === 'online';
            $paidAt = $isOnline ? now() : null;

            $order = Order::create([
                'receipt_token' => $this->generateReceiptToken(),
                'status' => 'pending',
                'payment_method' => $paymentMethod,
                'payment_status' => $isOnline ? 'paid' : 'unpaid',
                'payment_reference' => $isOnline ? 'MOCK-'.Str::ulid() : null,
                'total_cents' => array_sum($lineTotals),
                'paid_at' => $paidAt,
            ]);

            $order->items()->createMany($rows);

            return $order->refresh()->load('items');
        });
    }

    private function generateReceiptToken(): string
    {
        do {
            $token = bin2hex(random_bytes(32));
        } while (Order::where('receipt_token', $token)->exists());

        return $token;
    }
}
