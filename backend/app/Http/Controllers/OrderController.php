<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderReceiptResource;
use App\Services\OrderCreationService;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function store(StoreOrderRequest $request, OrderCreationService $service): JsonResponse
    {
        $order = $service->create($request->validated());

        return (new OrderReceiptResource($order))
            ->response()
            ->setStatusCode(201);
    }
}
