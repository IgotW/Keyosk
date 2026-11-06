<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\AdminProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ProductController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $products = Product::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return AdminProductResource::collection($products)->additional([
            'meta' => ['currency' => config('keyosk.currency')],
        ]);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = Product::create($request->validated());

        return (new AdminProductResource($product))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product): AdminProductResource
    {
        return new AdminProductResource($product);
    }

    public function update(UpdateProductRequest $request, Product $product): AdminProductResource
    {
        $product->update($request->validated());

        return new AdminProductResource($product->refresh());
    }

    public function destroy(Product $product): Response
    {
        $product->delete();

        return response()->noContent();
    }
}
