# Storage Setup Instructions

## Manual Supabase Storage Setup

Since the MCP tools aren't connecting, please manually set up the storage buckets in your Supabase dashboard:

### 1. Create Storage Buckets

Go to your Supabase project dashboard → Storage → Create Bucket

**Bucket 1: avatars**
- Name: `avatars`
- Public: ✅ Yes
- File size limit: 5MB
- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

**Bucket 2: chat-files** 
- Name: `chat-files`
- Public: ✅ Yes  
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, application/pdf, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

### 2. Set Up RLS Policies

Go to Storage → Policies and add these policies:

**For avatars bucket:**
```sql
-- Allow public read access
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**For chat-files bucket:**
```sql
-- Allow public read access
CREATE POLICY "Chat files are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-files');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload chat files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own chat files" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Alternative: Simple Setup

If the above policies don't work immediately, you can start with these simpler policies:

```sql
-- Simple policies for testing
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat files" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files');  
CREATE POLICY "Authenticated users can upload chat files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');
```

Once you've set up these buckets, the Settings page should work perfectly for uploading profile pictures!
