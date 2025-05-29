-- Create messaging tables for the real-time chat system
-- This migration creates the necessary tables, indexes, views, and functions
-- for the messaging system in the Emotions App

-- Create conversations table to store conversation metadata
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create conversation participants table to track users in conversations
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);

-- Create messages table to store individual messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    attachment_url TEXT,
    attachment_type TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_appointment_id ON public.conversations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);

-- Create a view to help fetch user conversations with last message info
CREATE OR REPLACE VIEW public.user_conversations_view AS
WITH last_messages AS (
    SELECT DISTINCT ON (conversation_id)
        conversation_id,
        id AS last_message_id,
        sender_id AS last_message_sender_id,
        content AS last_message_content,
        created_at AS last_message_time,
        read_at AS last_message_read_at
    FROM
        public.messages
    WHERE
        deleted_at IS NULL
    ORDER BY
        conversation_id,
        created_at DESC
)
SELECT
    cp.conversation_id,
    c.appointment_id,
    cp.user_id,
    lm.last_message_id,
    lm.last_message_sender_id,
    lm.last_message_content,
    lm.last_message_time,
    lm.last_message_read_at,
    cp.last_read_at,
    CASE
        WHEN lm.last_message_sender_id IS NULL THEN FALSE
        WHEN lm.last_message_sender_id = cp.user_id THEN FALSE
        WHEN cp.last_read_at IS NULL THEN TRUE
        WHEN lm.last_message_time > cp.last_read_at THEN TRUE
        ELSE FALSE
    END AS has_unread
FROM
    public.conversation_participants cp
JOIN
    public.conversations c ON c.id = cp.conversation_id
LEFT JOIN
    last_messages lm ON lm.conversation_id = cp.conversation_id
ORDER BY
    lm.last_message_time DESC NULLS LAST;

-- Create a function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    user1_id UUID,
    user2_id UUID,
    appointment_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Check if a conversation already exists between these users
    SELECT c.id INTO conversation_id
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = user1_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = user2_id
    WHERE (c.appointment_id IS NULL OR c.appointment_id = appointment_id)
    LIMIT 1;

    -- If conversation exists, return its ID
    IF conversation_id IS NOT NULL THEN
        RETURN conversation_id;
    END IF;

    -- If no existing conversation, create a new one
    INSERT INTO public.conversations (appointment_id)
    VALUES (appointment_id)
    RETURNING id INTO conversation_id;

    -- Add both users as participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
        (conversation_id, user1_id),
        (conversation_id, user2_id);

    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add Row Level Security (RLS) policies

-- Enable RLS on tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = id AND user_id = auth.uid()
    )
);

-- Conversation participants policies
CREATE POLICY "Users can view conversation participants for their conversations" 
ON public.conversation_participants FOR SELECT 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = conversation_participants.conversation_id 
        AND user_id = auth.uid()
    )
);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = messages.conversation_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages in their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = messages.conversation_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages FOR UPDATE 
USING (sender_id = auth.uid());

-- Add realtime publication for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated; 