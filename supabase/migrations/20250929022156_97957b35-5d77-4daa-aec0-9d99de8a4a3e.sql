-- Clear the problematic base64 avatar data
UPDATE profiles 
SET avatar_url = NULL 
WHERE user_id = '58f0d985-e620-4555-bd6a-ef2a5ee29cd7' 
AND avatar_url LIKE 'data:image/%';