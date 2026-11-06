<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:140', 'not_regex:/^\s*$/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'price_cents' => ['sometimes', 'required', 'integer', 'min:0'],
            'image_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'is_available' => ['sometimes', 'boolean'],
        ];
    }
}
