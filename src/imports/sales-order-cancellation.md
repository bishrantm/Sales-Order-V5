Sales Order Cancellation Flows

Context

Existing Sales Order module needs complete cancellation (entire order) and partial cancellation (line items or partial quantities). Reference SAP, NetSuite, Dynamics 365, Odoo patterns. Modern, clean UX.

Mandatory Reason

Every cancellation requires a reason before submission — no exceptions. Dropdown: Customer Request, Out of Stock, Pricing Error, Duplicate, Fraud, Regulatory, Other (requires free-text). Reason appears in confirmation, audit timeline, and generated documents (credit memos, RMAs).

Lifecycle-Aware Cancellation

From "Ready to Pick" onward, line items can be at different stages simultaneously. UI must handle mixed-state, applying correct logic per line item's stage.

Draft — Void/delete. No impact. Confirm modal → "Cancelled." Unconfirmed SO — Release soft-reserved inventory. Confirm → "Cancelled." Confirmed SO — Release reserved inventory. Warn about linked POs/production orders. Show allocation summary. Ready to Pick (some/all) — Warehouse cancellation request to halt picking. "Pending" until warehouse confirms. Unpicked items cancel directly, picked items follow Picked rules. Picked (some/all) — Put-back request. Warehouse confirms before completion. Picked need put-back, unpicked cancel directly. Shipped (some/all) — Carrier intercept request. If impossible, prompt RMA. "Not guaranteed" warning. Shipped items attempt intercept, unshipped use warehouse flow. Partial/Complete Fulfillment — Direct cancellation blocked → redirect to Returns/RMA. Pre-fill return form. Restock or write-off. Credit memo + refund if paid. Finance approval above threshold.

What to Design

Existing Order Detail Additions: "Cancel Order" destructive button in header. "Cancel" in line item overflow menus. Status badges (Cancellation Requested, Partially Cancelled, Cancelled). Strikethrough styling for cancelled items. Pending-cancellation warning banner. Timeline entries for cancellation events.

New Modals: Cancellation modal — full/partial toggle, line item checkboxes + qty inputs, mandatory reason, "Next." Impact summary modal — items, inventory impact, linked docs, financial impact, destructive "Confirm," type-to-confirm for high-value. Returns redirect modal for fulfilled orders — pre-filled return form, restock vs write-off.

Inline Components: Carrier intercept tracker in order detail. Warehouse cancellation status in fulfilment section. Credit memo/refund card in financials — auto-populated, editable for fees, approval indicator.

Warehouse-Side: Cancellation request card in WMS task queue. Accept/Reject actions. Rejection notifies sales user.

Admin Settings: Cancellation window, auto-approve thresholds, restocking fee %, roles per stage, partial qty toggle.

Notifications: Toasts, email/in-app alerts to stakeholders, banners for pending approvals.

UX Principles

Progressive disclosure. Destructive action safety (red styling, confirmation steps). Lifecycle-aware dynamic UI. Reason always required. Auditability with timestamped logs. Reversibility for pending requests.