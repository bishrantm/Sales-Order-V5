SHIPMENT LIFECYCLE STATES

Draft - Being configured by setup user on web. Invisible to pickers. Held until explicitly released.
Ready to Pick - Released for picking. Pickers can now see it on mobile. A Pick List is generated at this point. If line items have conflicting staging locations, a conflict resolution modal fires before release.
In Progress - Triggered when the first pick transaction occurs. Multiple pickers can work simultaneously. Lines are soft-locked per picker. Pick progress is tracked per line/item.
Ready - Auto-triggered by the system when all picking is complete. Packing List is available. In Pioneer this is essentially a pass-through state.
Shipped - Dock/execution user confirms physical departure. Shipping Label and Bill of Lading are generated. Inventory is removed from staged location. SO fulfillment status is updated.
Cancelled - Can be triggered from any pre-Shipped state by an authorized user. Triggers inventory return flow (default: original pick location). A 3-section modal handles allocation decisions.

Standard path: Draft > Ready to Pick > In Progress > Ready > Shipped
Fast Execute paths: Draft > Shipped, or Ready to Pick > Shipped, or In Progress > Shipped (Ship Now)

DOCUMENTS AND DATA AT EACH STATE
Draft - Header fields captured:

Shipment Number (auto-generated)
Customer Name (from SO, overridable)
Ship-To Address (from SO, overridable)
Carrier (optional until execution)
Shipping Mode (optional until execution)
Tracking Number (optional)
Shipment lines linked to one or more SOs, with subsidiary allocations created

Ready to Pick - Pick List generated:

Picker name (if assigned)
Shipment number
Line items with pick quantities
Suggested pick locations
Lot/serial constraints if allocated
Packing List also becomes available for printing at this stage

In Progress - Live data tracked:

Per-line pick progress
Soft-locks on lines being worked
Source location per item as picks are confirmed
Lot/serial numbers captured per pick

Ready - Packing List available:

Shipment number
Customer and ship-to address
Carrier
Line items with quantities
Lot/serial numbers if applicable
Staged location
Total weight if configured

Shipped - Required fields at execution:

Carrier (required)
Shipping Mode (required)
Ship Date/Time (auto, system timestamp)
Confirmed By (auto, executing user)
Driver Name (required)
Driver Signature (required, digital capture on mobile)
Tracking Number (optional)
Driver Phone (optional)
Driver Email (optional)
Handoff Photo (optional, exploratory)

Documents generated at Shipped:
Shipping Label fields: ship-from address, ship-to address, carrier, shipment number with barcode and QR code, tracking number if available, shipping mode, PO#, SO#, weight, package count.
Bill of Lading fields: shipper name and address, consignee name and address, carrier, shipment number, line items with descriptions and quantities, total weight, special handling instructions if any, driver name and signature, ship date.
Inventory impacts at Shipped:

Inventory removed from staged location
Subsidiary allocation marked fulfilled
SO-level allocation decremented
Cost layers relieved per costing method
Lot/serial history updated with shipment reference
Sales order fulfillment status updated

Cancelled - Data captured:

Cancellation reason (optional)
Attachments supported
Inventory return location (default is original pick location, user can override)
Allocation decisions via 3-section modal:
Section 1: SO-level allocations, always unaffected, shown greyed out with Unaffected badge, no action needed.
Section 2: Intentional shipment allocations, user chooses Release to general inventory or Keep and inherit to SO as parent allocation.
Section 3: Pick-created allocations, user chooses Release to general inventory or Keep and inherit to SO as parent allocation.
Both sections 2 and 3 must be resolved before Confirm Cancellation becomes active.


SHIPMENT TYPES AND ASSOCIATED DETAILS

Standard Shipment
A normal outbound shipment against one or more confirmed Sales Orders. Full picking workflow applies. Subsidiary allocations are carved from parent SO allocations.
Consolidated Shipment
One shipment pulling lines from multiple Sales Orders for the same customer and ship-to. All SOs contribute their own subsidiary allocations to the shipment.
Split Shipment
One Sales Order fulfilled across multiple shipments. Partial quantities per SO line are supported. Each shipment gets its own subsidiary allocation from the parent SO allocation.
Fast Execute Shipment
Bypasses the picking phase. Available from Draft, Ready to Pick, or In Progress states. Designed for low-volume or simple shipments where physical pick tracking is not needed. User manually enters quantities or serial units at execution. Inventory moves directly from storage location out of the system, no staged location transaction. Requires Execute Shipment permission.
Over-Ship
Shipment where quantity exceeds the original SO line. Requires Authorize Overship permission. System prompts to create an overship adjustment line on the SO for the overage. Shipment view shows one consolidated line with a red overship flag. SO view shows two lines: original and adjustment. Pricing on the adjustment line can be set independently. On cancellation, user is prompted to remove or keep the overship adjustment line on the SO.
Short Ship
Shipment where the full ordered quantity cannot be fulfilled. Triggered when a picker reports a shortage. Requires Approve Short Shipments permission to resolve. Resolution options:


Backorder: unshipped quantity stays on SO as open. Subsidiary allocation released back to SO level.
Cancel Remaining: unshipped quantity explicitly cancelled. Requires Cancel SO Line permission in addition.
Create New Shipment: new shipment created immediately for remaining quantity. Requires Create and manage shipments permission in addition.
On approval, user also chooses to Release or Retain the allocation for the shorted quantity.


RMA Shipment (not in Pioneer, deferred to Billy Bob stage 2)
Return Merchandise Authorization shipments. Details to be scoped in a future release.