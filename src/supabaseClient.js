import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jpvvfdnzmmkucsmdygaq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwdnZmZG56bW1rdWNzbWR5Z2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjU4MTQsImV4cCI6MjA4NDUwMTgxNH0.7W7WxJB7UFsDiqDj09hPWzt7W0OBOYw7tmU8KjDHzHY';

export const supabase = createClient(supabaseUrl, supabaseKey)