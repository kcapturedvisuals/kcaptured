import { pgTable, text, integer, boolean, timestamp, json } from 'drizzle-orm/pg-core'

// Portfolio items table definition for Drizzle
export const portfolioItems = pgTable('portfolio_items', {
	id: text('id').primaryKey(),
	public_id: text('public_id').notNull(),
	cloudinary_url: text('cloudinary_url').notNull(),
	category: text('category').notNull(),
	title: text('title').notNull(),
	caption: text('caption'),
	sort_order: integer('sort_order').notNull().default(0),
	featured: boolean('featured').notNull().default(false),
	active: boolean('active').notNull().default(true),
	width: integer('width'),
	height: integer('height'),
	created_at: timestamp('created_at').defaultNow().notNull(),
	updated_at: timestamp('updated_at').defaultNow().notNull(),
})

export const packages = pgTable('packages', {
	id: text('id').primaryKey(),
	category: text('category').notNull(),
	name: text('name').notNull(),
	duration: text('duration'),
	price: integer('price').notNull().default(0),
	features: json('features').$type<string[]>().notNull().default([]),
	description: text('description'),
	edited_images: integer('edited_images'),
	sample_url: text('sample_url'),
	sort_order: integer('sort_order').notNull().default(0),
	active: boolean('active').notNull().default(true),
	created_at: timestamp('created_at').defaultNow().notNull(),
	updated_at: timestamp('updated_at').defaultNow().notNull(),
})

export const bookings = pgTable('bookings', {
	id: text('id').primaryKey(),
	client_name: text('client_name').notNull(),
	email: text('email').notNull(),
	phone: text('phone').notNull(),
	package_name: text('package_name').notNull(),
	preferred_date: timestamp('preferred_date', { withTimezone: true }),
	request_date: timestamp('request_date', { withTimezone: true }).defaultNow().notNull(),
	status: text('status').notNull().default('pending'),
	notes: text('notes'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	idempotency_key: text('idempotency_key').unique(),
	manage_token: text('manage_token').unique(),
	package_price: integer('package_price'),
	confirmed_at: timestamp('confirmed_at', { withTimezone: true }),
	cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
	cancelled_by: text('cancelled_by'),
	confirmation_email_sent_at: timestamp('confirmation_email_sent_at', { withTimezone: true }),
	cancellation_email_sent_at: timestamp('cancellation_email_sent_at', { withTimezone: true }),
})

export const bookingLinkRateLimits = pgTable('booking_link_rate_limits', {
	email_hash: text('email_hash').primaryKey(),
	request_count: integer('request_count').notNull(),
	window_started_at: timestamp('window_started_at', { withTimezone: true }).notNull(),
})

export const testimonials = pgTable('testimonials', {
	id: text('id').primaryKey(),
	client_name: text('client_name').notNull(),
	client_role: text('client_role'),
	content: text('content'),
	testimonial_date: text('testimonial_date'),
	video_url: text('video_url'),
	video_public_id: text('video_public_id'),
	image_url: text('image_url'),
	rating: integer('rating').notNull().default(5),
	published: boolean('published').notNull().default(false),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const siteSettings = pgTable('site_settings', {
	id: text('id').primaryKey().default('site-settings'),
	studio_name: text('studio_name').notNull().default('KCAPTURED'),
	email: text('email'),
	phone: text('phone'),
	instagram_handle: text('instagram_handle'),
	booking_email: text('booking_email'),
	max_concurrent_bookings: integer('max_concurrent_bookings').notNull().default(10),
	hero_label: text('hero_label'),
	portfolio_view: text('portfolio_view'),
	payment_instructions: text('payment_instructions'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const auditLogs = pgTable('audit_logs', {
	id: text('id').primaryKey(),
	action: text('action').notNull(),
	entity_type: text('entity_type').notNull(),
	entity_id: text('entity_id'),
	description: text('description').notNull(),
	actor: text('actor'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
