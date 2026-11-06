<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => [
                'required',
                'integer',
                'between:1,99',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_int($value)) {
                        $fail('The quantity must be an integer.');
                    }
                },
            ],
            'payment_method' => ['required', 'string', 'in:cash,online'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one item to place an order.',
            'items.min' => 'Add at least one item to place an order.',
            'items.*.product_id.distinct' => 'Each product may only appear once in the cart.',
            'items.*.product_id.exists' => 'This product does not exist.',
            'items.*.quantity.between' => 'The quantity must be between 1 and 99.',
            'payment_method.in' => 'Choose cash or online payment.',
        ];
    }
}
