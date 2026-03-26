## Packages
lucide-react | Icons for the POS interface
recharts | Charts for the reports page
date-fns | Date formatting for reports and receipts
clsx | Utility for constructing className strings
tailwind-merge | Utility for merging tailwind classes

## Notes
- `price`, `quantity`, and `subtotal` are strings in the database to prevent precision loss. Math is done using `Number()` locally and serialized back to `.toFixed(2).toString()`.
- The POS uses `@media print` CSS techniques to isolate the receipt element for thermal printing (58mm/80mm).
- Scanners typically emulate keyboard typing followed by an 'Enter' key. The POS search input captures this natively.
