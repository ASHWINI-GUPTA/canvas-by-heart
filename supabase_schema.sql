-- =====================================================================================
-- Description: Production-grade schema for Canvas by Heart Gallery Media
-- Target: Supabase (PostgreSQL)
-- =====================================================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.gallery_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'image', -- Can be 'image' or 'video'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'deleted' (Soft Deletion)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add table comments for documentation
COMMENT ON TABLE public.gallery_media IS 'Stores metadata for images and videos fetched from Cloudflare R2 bucket.';
COMMENT ON COLUMN public.gallery_media.status IS 'Supports soft deletion natively instead of wiping records permanently.';

-- 3. Create Constraints & Indexes for Production Read Performance
-- Ensure 'type' only accepts valid enums
ALTER TABLE public.gallery_media ADD CONSTRAINT valid_media_type CHECK (type IN ('image', 'video'));

-- Ensure 'status' only accepts valid enums
ALTER TABLE public.gallery_media ADD CONSTRAINT valid_status CHECK (status IN ('active', 'deleted'));

-- Index on created_at for fast descending chronological sorts
CREATE INDEX idx_gallery_media_created_at ON public.gallery_media(created_at DESC);

-- Index on status for rapid filtering of active content
CREATE INDEX idx_gallery_media_status ON public.gallery_media(status);

-- 4. Enable Row Level Security (RLS)
-- Deny all by default
ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;

-- If you connect via server.js with Service Role Key, you bypass RLS automatically.
-- If you want direct frontend access, you can uncomment this:
-- CREATE POLICY "Allow public read access for active media" ON public.gallery_media FOR SELECT USING (status = 'active');

-- 5. Trigger for updated_at column
-- Auto-update updated_at whenever a row is modified
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gallery_media_modtime
    BEFORE UPDATE ON public.gallery_media
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

ALTER TABLE public.gallery_media
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;


CREATE INDEX idx_gallery_media_order
ON public.gallery_media ("order");