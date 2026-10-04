-- Preserve the package amount quoted when a booking is requested.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_price integer;

UPDATE bookings AS booking
SET package_price = package.price
FROM packages AS package
WHERE booking.package_price IS NULL
  AND booking.package_name = package.name;
