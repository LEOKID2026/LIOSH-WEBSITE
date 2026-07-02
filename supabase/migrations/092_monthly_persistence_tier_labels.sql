-- Fix monthly persistence tier labels: show coin amounts, not minute thresholds.
update public.reward_economy_monthly_tiers
set label_he = '10,000 מטבעות', updated_at = now()
where minutes_threshold = 100 and label_he = '100 דקות התמדה';

update public.reward_economy_monthly_tiers
set label_he = '30,000 מטבעות', updated_at = now()
where minutes_threshold = 250 and label_he = '250 דקות התמדה';

update public.reward_economy_monthly_tiers
set label_he = '60,000 מטבעות', updated_at = now()
where minutes_threshold = 400 and label_he = '400 דקות התמדה';

update public.reward_economy_monthly_tiers
set label_he = '100,000 מטבעות', updated_at = now()
where minutes_threshold = 600 and label_he = '600 דקות התמדה';
