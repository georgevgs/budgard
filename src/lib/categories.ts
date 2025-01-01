import { supabase } from './supabase';
import type { Category } from '@/types/category';

export const DEFAULT_CATEGORIES = [
    { name: '🏠 Housing', color: '#71717A' },    // Zinc
    { name: '🍽️ Food', color: '#22C55E' },      // Green
    { name: '🚗 Transport', color: '#3B82F6' },  // Blue
    { name: '🎮 Entertainment', color: '#EC4899' }, // Pink
    { name: '🧾 Bills', color: '#F97316' },      // Orange
    { name: '🛍️ Shopping', color: '#6366F1' },   // Indigo
    { name: '💊 Healthcare', color: '#EF4444' },  // Red
    { name: '📚 Education', color: '#14B8A6' },  // Teal
    { name: '✈️ Travel', color: '#8B5CF6' },    // Violet
    { name: '💡 Utilities', color: '#F59E0B' },  // Amber
    { name: '🎁 Gifts', color: '#DB2777' },     // Pink
    { name: '📱 Tech', color: '#6B7280' },      // Gray
];

export async function setupDefaultCategories() {
    try {
        // First check if user already has any categories
        const { data: existingCategories } = await supabase
            .from('categories')
            .select('id')
            .limit(1);

        // If user already has categories, don't create defaults
        if (existingCategories && existingCategories.length > 0) {
            return;
        }

        // Insert default categories
        const { error } = await supabase
            .from('categories')
            .insert(DEFAULT_CATEGORIES);

        if (error) throw error;
    } catch (error) {
        console.error('Error setting up default categories:', error);
    }
}

export async function fetchCategories(): Promise<Category[]> {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}