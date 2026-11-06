<?php

namespace Database\Factories;

use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'receipt_token' => bin2hex(random_bytes(32)),
            'status' => 'pending',
            'payment_method' => 'cash',
            'payment_status' => 'unpaid',
            'payment_reference' => null,
            'total_cents' => fake()->numberBetween(100, 10000),
            'paid_at' => null,
        ];
    }

    public function paidCash(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'payment_reference' => null,
            'paid_at' => now(),
        ]);
    }

    public function online(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_method' => 'online',
            'payment_status' => 'paid',
            'payment_reference' => 'MOCK-'.Str::ulid(),
            'paid_at' => now(),
        ]);
    }
}
