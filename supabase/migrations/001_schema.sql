-- 001_schema.sql

-- Enums
CREATE TYPE listing_category AS ENUM ('Books & Study Material', 'Electronics & Gadgets', 'Furniture & Room Essentials', 'Cycles & Transport', 'Appliances', 'Clothing & Misc');
CREATE TYPE product_age_bracket AS ENUM ('Under 6 months', '6-12 months', '1-2 years', '2+ years');
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'removed');
CREATE TYPE bid_status AS ENUM ('pending', 'selected', 'rejected');
CREATE TYPE report_category AS ENUM ('No-show', 'Harassment', 'Fake/Prohibited item', 'Scam');
CREATE TYPE report_status AS ENUM ('pending', 'confirmed', 'dismissed');

-- Tables
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    college_email TEXT UNIQUE NOT NULL,
    year_of_study INTEGER,
    branch_course TEXT,
    profile_photo_url TEXT,
    verified BOOLEAN DEFAULT false,
    rating_avg NUMERIC(3,2) DEFAULT 0,
    total_items_sold INTEGER DEFAULT 0,
    active_listings_count INTEGER DEFAULT 0,
    banned BOOLEAN DEFAULT false,
    warning_count INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category listing_category NOT NULL,
    asking_price NUMERIC(10,2) NOT NULL CHECK(asking_price > 0),
    product_age product_age_bracket NOT NULL,
    photos TEXT[] DEFAULT '{}',
    availability_window TEXT,
    status listing_status DEFAULT 'active',
    selected_bidder_id UUID REFERENCES profiles(id),
    backup_bidder_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bid_amount NUMERIC(10,2) NOT NULL CHECK(bid_amount > 0),
    status bid_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(listing_id, bidder_id)
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    category report_category NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rated_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating_value INTEGER NOT NULL CHECK(rating_value >= 1 AND rating_value <= 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(listing_id, rater_id)
);

-- Indexes
CREATE INDEX idx_profiles_college_email ON profiles(college_email);
CREATE INDEX idx_listings_seller_id ON listings(seller_id);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_bids_listing_id ON bids(listing_id);
CREATE INDEX idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX idx_chat_messages_listing_sender ON chat_messages(listing_id, sender_id);
CREATE INDEX idx_chat_messages_listing_recipient ON chat_messages(listing_id, recipient_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_ratings_rated_user_id ON ratings(rated_user_id);

-- Triggers & Functions

-- 1. handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, college_email, name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 2. check_minimum_bid
CREATE OR REPLACE FUNCTION check_minimum_bid()
RETURNS TRIGGER AS $$
DECLARE
    listing_price NUMERIC(10,2);
    min_bid NUMERIC(10,2);
BEGIN
    SELECT asking_price INTO listing_price FROM listings WHERE id = NEW.listing_id;
    min_bid := ROUND(listing_price * 0.70, 2);
    
    IF NEW.bid_amount < min_bid THEN
        RAISE EXCEPTION 'Bid amount must be at least 70%% of asking price (minimum: %)', min_bid;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_minimum_bid
    BEFORE INSERT ON bids
    FOR EACH ROW EXECUTE PROCEDURE check_minimum_bid();

-- 3. check_banned_on_bid
CREATE OR REPLACE FUNCTION check_banned_on_bid()
RETURNS TRIGGER AS $$
DECLARE
    is_banned BOOLEAN;
BEGIN
    SELECT banned INTO is_banned FROM profiles WHERE id = NEW.bidder_id;
    IF is_banned THEN
        RAISE EXCEPTION 'You are banned and cannot place a bid.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_banned_on_bid
    BEFORE INSERT ON bids
    FOR EACH ROW EXECUTE PROCEDURE check_banned_on_bid();

-- 4. check_banned_on_listing
CREATE OR REPLACE FUNCTION check_banned_on_listing()
RETURNS TRIGGER AS $$
DECLARE
    is_banned BOOLEAN;
BEGIN
    SELECT banned INTO is_banned FROM profiles WHERE id = NEW.seller_id;
    IF is_banned THEN
        RAISE EXCEPTION 'You are banned and cannot create listings.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_banned_on_listing
    BEFORE INSERT ON listings
    FOR EACH ROW EXECUTE PROCEDURE check_banned_on_listing();

-- 5. handle_report_confirmation
CREATE OR REPLACE FUNCTION handle_report_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    current_warning_count INTEGER;
BEGIN
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
        UPDATE profiles 
        SET warning_count = warning_count + 1 
        WHERE id = NEW.reported_user_id
        RETURNING warning_count INTO current_warning_count;
        
        IF current_warning_count >= 3 THEN
            UPDATE profiles SET banned = true WHERE id = NEW.reported_user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_handle_report_confirmation
    AFTER UPDATE ON reports
    FOR EACH ROW EXECUTE PROCEDURE handle_report_confirmation();

-- 6. update_active_listings_count
CREATE OR REPLACE FUNCTION recount_active_listings()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE profiles SET active_listings_count = (
            SELECT COUNT(*) FROM listings WHERE seller_id = NEW.seller_id AND status = 'active'
        ) WHERE id = NEW.seller_id;
        
        IF TG_OP = 'UPDATE' AND OLD.seller_id != NEW.seller_id THEN
            UPDATE profiles SET active_listings_count = (
                SELECT COUNT(*) FROM listings WHERE seller_id = OLD.seller_id AND status = 'active'
            ) WHERE id = OLD.seller_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET active_listings_count = (
            SELECT COUNT(*) FROM listings WHERE seller_id = OLD.seller_id AND status = 'active'
        ) WHERE id = OLD.seller_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recount_active_listings
    AFTER INSERT OR UPDATE OR DELETE ON listings
    FOR EACH ROW EXECUTE PROCEDURE recount_active_listings();


-- 7. update_items_sold
CREATE OR REPLACE FUNCTION update_items_sold()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'sold' AND NEW.status = 'sold' THEN
        UPDATE profiles SET total_items_sold = total_items_sold + 1 WHERE id = NEW.seller_id;
    ELSIF OLD.status = 'sold' AND NEW.status != 'sold' THEN
        UPDATE profiles SET total_items_sold = total_items_sold - 1 WHERE id = NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_items_sold
    AFTER UPDATE ON listings
    FOR EACH ROW EXECUTE PROCEDURE update_items_sold();

-- 8. update_rating_avg
CREATE OR REPLACE FUNCTION update_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET rating_avg = (
        SELECT COALESCE(ROUND(AVG(rating_value)::NUMERIC, 2), 0)
        FROM ratings
        WHERE rated_user_id = NEW.rated_user_id
    )
    WHERE id = NEW.rated_user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating_avg
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW EXECUTE PROCEDURE update_rating_avg();


-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- profiles
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- listings
CREATE POLICY "listings_select_policy"
ON listings FOR SELECT
TO authenticated
USING (status = 'active' OR seller_id = (SELECT auth.uid()));

CREATE POLICY "listings_insert_policy"
ON listings FOR INSERT
TO authenticated
WITH CHECK (seller_id = (SELECT auth.uid()));

CREATE POLICY "listings_update_policy"
ON listings FOR UPDATE
TO authenticated
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));

CREATE POLICY "listings_delete_policy"
ON listings FOR DELETE
TO authenticated
USING (seller_id = (SELECT auth.uid()));

-- bids
CREATE POLICY "bids_select_policy"
ON bids FOR SELECT
TO authenticated
USING (bidder_id = (SELECT auth.uid()) OR listing_id IN (SELECT id FROM listings WHERE seller_id = (SELECT auth.uid())));

CREATE POLICY "bids_insert_policy"
ON bids FOR INSERT
TO authenticated
WITH CHECK (bidder_id = (SELECT auth.uid()));

CREATE POLICY "bids_update_policy"
ON bids FOR UPDATE
TO authenticated
USING (listing_id IN (SELECT id FROM listings WHERE seller_id = (SELECT auth.uid())))
WITH CHECK (listing_id IN (SELECT id FROM listings WHERE seller_id = (SELECT auth.uid())));

-- chat_messages
CREATE POLICY "chat_messages_select_policy"
ON chat_messages FOR SELECT
TO authenticated
USING (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));

CREATE POLICY "chat_messages_insert_policy"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = (SELECT auth.uid()));

-- reports
CREATE POLICY "reports_select_policy"
ON reports FOR SELECT
TO authenticated
USING (reporter_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true));

CREATE POLICY "reports_insert_policy"
ON reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY "reports_update_policy"
ON reports FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_admin = true));

-- ratings
CREATE POLICY "ratings_select_policy"
ON ratings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "ratings_insert_policy"
ON ratings FOR INSERT
TO authenticated
WITH CHECK (rater_id = (SELECT auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
