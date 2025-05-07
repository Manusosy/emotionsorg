import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BookingButton from '@/features/booking/components/BookingButton';

interface MoodMentorCardProps {
  id: string;
  name: string;
  location: string;
  rating: number;
  imageUrl: string;
  isAvailable: boolean;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

export function MoodMentorCard({
  id,
  name,
  location,
  rating,
  imageUrl,
  isAvailable,
  onFavorite,
  isFavorited = false,
}: MoodMentorCardProps) {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    // Generate name-based slug
    const nameSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    navigate(`/mood-mentor/${nameSlug}?id=${id}`);
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Rating Badge */}
        <div className="absolute top-4 left-4 z-10">
          <Badge variant="secondary" className="bg-white/90 text-primary">
            ★ {rating.toFixed(1)}
          </Badge>
        </div>

        {/* Favorite Button */}
        {onFavorite && (
          <button
            onClick={onFavorite}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
          >
            <Heart
              className={isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}
              size={20}
            />
          </button>
        )}

        {/* Mood Mentor Image */}
        <div 
          className="relative h-64 overflow-hidden cursor-pointer"
          onClick={handleViewProfile}
        >
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        </div>
      </div>

      <div className="p-6">
        {/* Role Badge */}
        <Badge className="mb-2" variant="outline">
          M.H Mood Mentor
        </Badge>

        {/* Name and Location */}
        <h3 
          className="text-2xl font-semibold mb-2 cursor-pointer hover:text-primary transition-colors"
          onClick={handleViewProfile}
        >
          {name}
        </h3>
        <p className="text-muted-foreground mb-4">
          📍 {location} • 30 Min
        </p>

        {/* Availability and Booking */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isAvailable ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className={isAvailable ? 'text-green-600' : 'text-gray-500'}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
          <BookingButton
            moodMentorId={parseInt(id)}
            disabled={!isAvailable}
            size="sm"
            className={!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
            variant="default"
          />
        </div>
      </div>
    </Card>
  );
} 