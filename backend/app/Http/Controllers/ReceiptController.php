<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReceiptResource;
use App\Models\Order;

class ReceiptController extends Controller
{
    public function show(string $receiptToken): ReceiptResource
    {
        $order = Order::query()
            ->with('items')
            ->where('receipt_token', $receiptToken)
            ->firstOrFail();

        return new ReceiptResource($order);
    }
}
