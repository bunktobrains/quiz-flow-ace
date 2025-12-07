-- Add phone_number column to quiz_participants for internal use (not shown on frontend)
ALTER TABLE public.quiz_participants 
ADD COLUMN phone_number TEXT;