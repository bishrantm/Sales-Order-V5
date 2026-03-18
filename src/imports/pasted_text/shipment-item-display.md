Here's everything item-related for displaying shipment data, in plain text:

ITEM / LINE ITEM DISPLAY IN SHIPMENTS

LINE ITEM DISPLAY FORMAT (Shipment Detail View)
Each line item uses a two-line stack:

Top line: quantity shipped / total quantity + UOM (e.g. "8 / 10 EA")
Bottom line: remaining quantity in red if partially shipped, OR "Fully Shipped" in green if complete


STANDARD LINE ITEM FIELDS TO SHOW

Item name / item number
Quantity to ship
Quantity shipped (if in progress)
Unit of measure (UOM)
Lot number (if applicable)
Serial numbers (if applicable)
Suggested pick location / staged location
SO line reference (which SO line this item comes from)
Ship date (per line)
Subsidiary allocation reference


OVERSHIP LINE ITEM DISPLAY
On the Shipment Detail View:

Show ONE consolidated line with total quantity (e.g. Widget x 11)
Show a red indicator or flag marking it as an overship
Show the original SO quantity for reference (e.g. "SO Qty: 10")
Do NOT split into two lines on the shipment view

On the Sales Order Detail View:

Show TWO lines: original line and the overship adjustment line
Overship adjustment line is visually indented, tagged, or badged
Line type field shows "Standard" vs "Overship Adjustment"


MOBILE PICK VIEW (Consolidated)
On mobile, same-item lines are consolidated into one row:

Show item name
Show total quantity to pick across all SO lines (e.g. "Widget: Pick 26")
Picker does not need to see the individual SO line breakdown
System handles distribution back to lines automatically after pick confirmation

On web/desktop, show line-by-line:

Each SO line shown separately with its own quantity and ship date


PICK LIST FIELDS (generated at Ready to Pick)

Picker name (if assigned)
Shipment number
Line items with pick quantities
Suggested pick locations
Lot/serial constraints if allocated


PACKING LIST FIELDS (available from Ready to Pick onwards)

Shipment number
Customer name
Ship-to address
Carrier
Line items with quantities
Lot/serial numbers (if applicable)
Staged location
Total weight (if configured)


SHIPPING LABEL FIELDS (generated at Execution)

Ship-from address
Ship-to address
Carrier
Shipment number (with barcode and QR code encoding the shipment number)
Tracking number (if available)
Shipping mode
PO number
SO number
Weight
Package count


BILL OF LADING (BOL) FIELDS (generated at Execution)

Shipper name and address
Consignee name and address
Carrier
Shipment number
Line items with descriptions and quantities
Total weight
Special handling instructions (if any)
Driver name and signature
Ship date


SHORT SHIP ITEM INDICATORS
When a short ship condition exists on a line item, show a three-state color indicator on the quantity input:

Green: exact quantity (matches ordered)
Yellow: under quantity (short ship)
Red: over quantity (overship)


QUANTITY FULFILLMENT DISPLAY (per line)
Show shipped vs total for each line so the user can see fulfilment progress at a glance. Example format: "8 / 10 EA" on top, with remaining or fully shipped status below.

TRACEABILITY DATA LINKED TO EACH ITEM
The following are stored per item and should be accessible from the shipment record:

Original pick location
Lot number and/or serial numbers if applicable
Staged location it was moved to
Subsidiary allocation reference
Overship flag and original SO quantity if applicable
Fast Execute flag (if item was shipped via Fast Execute rather than physically picked)


UI / TABLE DISPLAY RULES (from Approved Components guidelines)

Default column order must show the most important information first
Default view must fit available screen width without horizontal scrolling
All search must be fuzzy and must highlight results in yellow
Carrier and Shipment reference-only cards should be collapsed by default
Created By / Created On / Last Updated should be at the bottom of the side card stack and collapsed by default