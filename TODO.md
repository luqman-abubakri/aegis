# AEGIS Backend Migration - MongoDB → Supabase

## Phase 1: Install Dependencies
- [x] Install @supabase/supabase-js and @supabase/ssr
- [ ] Remove mongoose, graphql, jsonwebtoken, bcryptjs, @apollo/client, @apollo/server, @as-integrations/next (after migration)

## Phase 2: Create Supabase Structure
- [ ] Create `lib/supabase.ts` - Supabase client
- [ ] Create `services/auth.ts` - Auth service functions
- [ ] Create `contexts/AuthProvider.tsx` - Auth context provider
- [ ] Create `lib/schema.sql` - Database table schema

## Phase 3: Update Auth Pages (UI preserved)
- [ ] Update `app/layout.tsx` - Replace ApolloWrapper with AuthProvider
- [ ] Update `app/sign-in/page.tsx` - Use Supabase auth
- [ ] Update `app/sign-up/page.tsx` - Use Supabase auth
- [ ] Update `components/Navbar.tsx` - Show auth state
- [ ] Update `components/ProtectedRoute.tsx` - Use Supabase session

## Phase 4: Remove Old Backend
- [ ] Delete `models/` folder
- [ ] Delete `graphql/` folder
- [ ] Delete `lib/dbConnect.ts`, `lib/jwt.ts`
- [ ] Delete `utils/password.ts`
- [ ] Delete `app/api/graphql/route.ts`, `app/api/test-db/route.ts`
- [ ] Delete `components/ApolloWrapper.tsx`
- [ ] Delete `hooks/useAuth.ts`
- [ ] Update `types/index.ts`

## Phase 5: Dashboard & Remaining Pages
- [ ] Update `app/dashboard/page.tsx` - Replace MongoDB with Supabase
- [ ] Update `middleware.ts` - Remove JWT logic

## Phase 6: Cleanup & Verify
- [ ] Remove unused packages from package.json
- [ ] Run `npm install`
- [ ] Run `npm run build` - Zero TypeScript errors

