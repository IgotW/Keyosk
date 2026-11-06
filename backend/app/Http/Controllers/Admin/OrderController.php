<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\AdminOrderResource;
use App\Http\Resources\AdminOrderSummaryResource;
use App\Models\Order;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $orders = Order::query()
            ->withCount('items')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return AdminOrderSummaryResource::collection($orders);
    }

    public function show(Order $order): AdminOrderResource
    {
        return new AdminOrderResource($order->load('items'));
    }

    public function markPaid(Order $order): AdminOrderResource
    {
        if ($order->payment_method === 'online') {
            throw ValidationException::withMessages([
                'payment_method' => ['Only cash orders can be marked as paid.'],
            ]);
        }

        if ($order->status === 'cancelled') {
            throw ValidationException::withMessages([
                'status' => ['A cancelled order cannot be marked as paid.'],
            ]);
        }

        if ($order->payment_status !== 'paid') {
            $order->update([
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);
        }

        return new AdminOrderResource($order->refresh()->load('items'));
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): AdminOrderResource
    {
        $status = $request->validated('status');

        if ($order->status !== $status) {
            $order->update(['status' => $status]);
        }

        return new AdminOrderResource($order->refresh()->load('items'));
    }
}
