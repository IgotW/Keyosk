<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->warn('Refusing to seed demo data in production.');

            return;
        }

        $email = env('ADMIN_EMAIL', 'admin@keyosk.test');
        $admin = User::where('email', $email)->first();

        if ($admin === null) {
            $configuredPassword = env('ADMIN_PASSWORD');
            $password = $configuredPassword ?: Str::password(16);

            $admin = User::factory()->admin()->create([
                'name' => env('ADMIN_NAME', 'Keyosk Admin'),
                'email' => $email,
                'password' => $password,
            ]);

            if (! $configuredPassword) {
                $this->command?->warn("Generated admin password for {$email}: {$password}");
            }
        } elseif (! $admin->is_admin) {
            $admin->forceFill(['is_admin' => true])->save();
        }

        $products = [
            ['name' => 'Classic Burger', 'description' => 'Beef patty, cheese, lettuce, and tomato.', 'price_cents' => 850, 'is_available' => true],
            ['name' => 'Cheeseburger', 'description' => 'Beef patty with double cheese.', 'price_cents' => 950, 'is_available' => true],
            ['name' => 'Crispy Fries', 'description' => 'Golden fries with a pinch of salt.', 'price_cents' => 350, 'is_available' => true],
            ['name' => 'Chicken Sandwich', 'description' => 'Crispy chicken with pickles.', 'price_cents' => 750, 'is_available' => true],
            ['name' => 'Garden Salad', 'description' => 'Fresh greens with house dressing.', 'price_cents' => 550, 'is_available' => true],
            ['name' => 'Chocolate Shake', 'description' => 'Thick chocolate milkshake.', 'price_cents' => 450, 'is_available' => true],
            ['name' => 'Onion Rings', 'description' => 'Temporarily unavailable.', 'price_cents' => 400, 'is_available' => false],
        ];

        foreach ($products as $product) {
            Product::firstOrCreate(['name' => $product['name']], $product);
        }
    }
}
