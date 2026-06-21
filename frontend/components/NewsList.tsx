'use client';

import { useEffect, useState } from 'react';

interface NewsArticle {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

interface NewsListProps {
  location: { lat: number; lng: number; address?: string } | null;
}

export default function NewsList({ location }: NewsListProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) {
      setNews([]);
      return;
    }

    const fetchNews = async () => {
      setLoading(true);
      try {
        // Simulated news data - in production, would call a news API
        const mockNews: NewsArticle[] = [
          {
            title: 'Weather Alert: Heavy Rain Expected',
            description: 'National Weather Service alerts of significant rainfall in the area',
            severity: 'medium',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          },
          {
            title: 'Traffic Incident on Main Street',
            description: 'Multi-vehicle accident causing significant delays',
            severity: 'low',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          },
          {
            title: 'Air Quality Advisory',
            description: 'Moderate air quality levels reported for the region',
            severity: 'low',
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          },
        ];

        setNews(mockNews);
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [location]);

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
        return 'badge-low';
      default:
        return 'badge-low';
    }
  };

  if (!location) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        Select a location to see news
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        Loading news...
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        No recent alerts for this area
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {news.map((article, idx) => (
        <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900 flex-1">
              {article.title}
            </h4>
            <span className={`badge ${getSeverityBadgeColor(article.severity)} text-xs whitespace-nowrap`}>
              {article.severity}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {article.description}
          </p>
          <p className="text-xs text-gray-500">
            {formatTime(article.timestamp)}
          </p>
        </div>
      ))}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}
