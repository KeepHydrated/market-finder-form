-- Update existing submissions to accepted status so they appear on homepage
UPDATE submissions 
SET status = 'accepted' 
WHERE user_id = '58f0d985-e620-4555-bd6a-ef2a5ee29cd7' AND status = 'pending';