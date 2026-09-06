-- ============================================================
-- GarShop - Admin garage management
-- Lets an admin create a garage (assigning any owner) directly
-- from the admin console.
-- ============================================================

-- Admin may insert a garage on behalf of any owner
CREATE POLICY "garages admin insert" ON gs_garages FOR INSERT WITH CHECK (public.gs_is_admin());
