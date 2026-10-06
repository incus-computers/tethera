# Tethera E-Commerce Project Guide

## Overview
Tethera is a high-performance PC hardware and custom PC builder e-commerce web application based in Jakarta, Indonesia.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide React icons
- **State Management**: Zustand
- **Backend & Database**: Supabase (PostgreSQL) with local in-memory fallback repositories
- **Payment Gateway**: Midtrans (QRIS, Virtual Accounts, Credit Cards, Direct Debit)
- **Logistics & Delivery**: Biteship API, Gojek/Grab instant couriers, Click & Collect in-store pickup
- **Communications**: Resend API (transactional emails) and WhatsApp notification services

## Directory Structure
- `src/app`: Next.js App Router pages and API routes
  - `src/app/checkout`: Checkout page and checkout success confirmation
  - `src/app/transactions`: Customer transaction records and invoice downloads
  - `src/app/account`: User profile, saved addresses, and order history
  - `src/app/api`: Serverless API routes (checkout, midtrans, orders, notifications)
- `src/lib`: Core utilities, business logic, repositories, and state stores
  - `src/lib/db`: Repositories (`orders`, `products`, `customers`, etc.)
  - `src/lib/notifications`: Email and WhatsApp notification dispatchers
  - `src/lib/payment`: Midtrans payment integrations
  - `src/lib/shipping`: Courier rate calculations and dispatch services
  - `src/lib/store`: Zustand stores (`useCartStore`, `useAuthStore`, `useThemeStore`)
  - `src/lib/utils`: Formatting helpers (currency, formatting, downloads)

## Code & Quality Conventions
1. **Anti-Slop Standards**: Follow craft-first UI standards. Avoid generic purple-and-cyan gradients, floating glassmorphism everywhere, and empty marketing buzzwords.
2. **Copywriting**: Never use em dashes (`—`) in text or code comments. Use standard punctuation like commas, periods, or colons.
3. **Accessibility**: All buttons and interactive controls must meet minimum 44px tap target height (`min-h-[44px]`). Maintain WCAG AA color contrast (4.5:1 ratio). Ensure clear focus indicators.
4. **Resilience**: Data views must provide empty, loading, and error states. Every button must perform a real action.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: download `antislop.md` again, or run `npx antislop-ai --update` if it was installed as skill folders.
<!-- antislop:end -->
