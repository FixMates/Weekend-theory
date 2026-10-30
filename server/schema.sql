create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_name text not null,
  departure_date text not null,
  vehicle_type text not null check (vehicle_type in ('AC','Non-AC')),
  seat_type text not null,
  pickup_preference text not null,
  customer_name text not null,
  phone text not null,
  travellers integer not null check (travellers between 1 and 9),
  amount_paise integer not null,
  currency text not null default 'INR',
  razorpay_order_id text unique not null,
  razorpay_payment_id text unique,
  payment_status text not null default 'created',
  booking_status text not null default 'payment_pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;
-- Do not add public policies. Only the server uses the Supabase service-role key.
