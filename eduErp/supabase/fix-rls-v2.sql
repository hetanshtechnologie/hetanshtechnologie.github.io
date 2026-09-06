-- Drop old policies and recreate with uid check (more reliable than auth.role())
DROP POLICY IF EXISTS self_insert_organizations ON organizations;
DROP POLICY IF EXISTS self_insert_payments ON payments;

CREATE POLICY "self_insert_organizations" ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "self_insert_payments" ON payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure existing policies for profiles allow self updates
DROP POLICY IF EXISTS self_update_profiles ON profiles;
CREATE POLICY "self_update_profiles" ON profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
