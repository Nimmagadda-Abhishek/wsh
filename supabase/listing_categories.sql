-- Replace the categories offered for new business and startup listings.
-- Existing category rows are retained so previously listed businesses keep
-- their category references; the API exposes only the categories below.
insert into public.categories (name, slug, icon, sort_order) values
  ('Real Estate & Construction', 'real-estate-construction', 'building-2', 1),
  ('Finance & Insurance', 'finance-insurance', 'landmark', 2),
  ('Manufacturing', 'manufacturing', 'factory', 3),
  ('Agriculture & Farming', 'agriculture-farming', 'leaf', 4),
  ('Logistics & Transport', 'logistics-transport', 'truck', 5),
  ('Travel & Hospitality', 'travel-hospitality', 'hotel', 6),
  ('Marketing & Media', 'marketing-media', 'megaphone', 7),
  ('Legal & Accounting', 'legal-accounting', 'scale', 8),
  ('Wholesale & Distribution', 'wholesale-distribution', 'package', 9),
  ('Energy & Sustainability', 'energy-sustainability', 'zap', 10)
on conflict (name) do update
set slug = excluded.slug,
    icon = excluded.icon,
    sort_order = excluded.sort_order;
